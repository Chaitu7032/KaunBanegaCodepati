import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const questionsPath = path.resolve(__dirname, "../data/questions.json");

function loadQuestions() {
  try {
    const raw = fs.readFileSync(questionsPath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load questions.json:", err.message);
    return [];
  }
}

export class GameEngine {
  constructor() {
    this.questions = loadQuestions();
    this.reset();
  }

  reset() {
    this.status = "LOBBY"; // LOBBY | QUESTION_ACTIVE | ANSWER_SELECTED | ANSWER_LOCKED | REVEALED | LIFELINE_ACTIVE | PAUSED | FINISHED
    this.currentQuestionIndex = 0;
    this.contestantName = "Contestant";
    this.currentPrize = "₹0";
    
    // Timer state
    this.timeLimit = 30;
    this.questionStartedAt = null;
    this.questionEndsAt = null;
    this.isTimerRunning = false;
    this.isPaused = false;
    this.pausedRemainingMs = 0;

    // Interaction state
    this.selectedOption = null;
    this.lockedOption = null;
    this.isCorrect = null;
    this.eliminatedOptions = [];

    // Lifelines
    this.lifelines = {
      fiftyFifty: { used: false, active: false },
      askHost: { used: false, active: false, message: "" },
      audiencePoll: { used: false, active: false, results: null },
    };

    // Events log
    this.events = [];
    this.logEvent("GAME_RESET", "Game initialized in LOBBY state");
  }

  logEvent(type, details) {
    this.events.push({
      timestamp: Date.now(),
      type,
      details,
    });
    // Keep last 100 events
    if (this.events.length > 100) this.events.shift();
  }

  getCurrentQuestion() {
    if (!this.questions || this.questions.length === 0) return null;
    return this.questions[this.currentQuestionIndex] || null;
  }

  getLadder() {
    return this.questions.map((q, idx) => ({
      index: idx,
      questionNumber: q.questionNumber || idx + 1,
      prizeValue: q.prizeValue || `₹${(idx + 1) * 100}`,
      milestone: q.milestone || (idx === 4 ? "SAFE ZONE 1" : idx === 9 ? "SAFE ZONE 2" : idx === 14 ? "GRAND PRIZE" : null),
      isCurrent: idx === this.currentQuestionIndex,
      isCompleted: idx < this.currentQuestionIndex,
    }));
  }

  getState(role = "stage") {
    const q = this.getCurrentQuestion();
    const now = Date.now();

    // Calculate dynamic remaining seconds
    let remainingMs = 0;
    if (this.isPaused) {
      remainingMs = this.pausedRemainingMs;
    } else if (this.isTimerRunning && this.questionEndsAt) {
      remainingMs = Math.max(0, this.questionEndsAt - now);
    } else {
      remainingMs = this.timeLimit * 1000;
    }

    const remainingSeconds = Math.ceil(remainingMs / 1000);

    let sanitizedQuestion = null;
    if (q) {
      sanitizedQuestion = {
        id: q.id,
        questionNumber: q.questionNumber || this.currentQuestionIndex + 1,
        totalQuestions: this.questions.length,
        round: q.round || 1,
        category: q.category || null,
        questionText: q.questionText,
        options: q.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          eliminated: this.eliminatedOptions.includes(opt.id),
        })),
        prizeValue: q.prizeValue || "₹1,000",
        explanation: (role === "host" || this.status === "REVEALED") ? q.explanation : null,
      };

      // Security: Only send correctOption to host, or to stage ONLY when in REVEALED state!
      if (role === "host" || this.status === "REVEALED") {
        sanitizedQuestion.correctOption = q.correctOption;
      }
    }

    return {
      status: this.status,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
      contestantName: this.contestantName,
      currentPrize: this.currentPrize,
      question: sanitizedQuestion,
      ladder: this.getLadder(),
      timer: {
        timeLimit: this.timeLimit,
        remainingSeconds,
        remainingMs,
        isTimerRunning: this.isTimerRunning,
        isPaused: this.isPaused,
        questionEndsAt: this.questionEndsAt,
      },
      interaction: {
        selectedOption: this.selectedOption,
        lockedOption: this.lockedOption,
        isCorrect: this.isCorrect,
        eliminatedOptions: this.eliminatedOptions,
      },
      lifelines: this.lifelines,
      role,
      serverTime: now,
    };
  }

  startGame(contestantName) {
    if (contestantName) this.contestantName = contestantName;
    this.currentQuestionIndex = 0;
    this.setupQuestion(0);
    this.status = "QUESTION_ACTIVE";
    this.startTimer();
    this.logEvent("GAME_STARTED", { contestant: this.contestantName });
  }

  setupQuestion(index, autoStartTimer = true) {
    if (index < 0 || index >= this.questions.length) return;
    this.currentQuestionIndex = index;
    const q = this.questions[index];
    this.timeLimit = q.timeLimit || 30;
    this.selectedOption = null;
    this.lockedOption = null;
    this.isCorrect = null;
    this.eliminatedOptions = [];
    this.status = "QUESTION_ACTIVE";
    this.logEvent("QUESTION_LOADED", { questionNumber: index + 1 });

    if (autoStartTimer) {
      this.startTimer();
    } else {
      this.isPaused = false;
      this.pausedRemainingMs = this.timeLimit * 1000;
      this.isTimerRunning = false;
      this.questionStartedAt = null;
      this.questionEndsAt = null;
    }
  }

  startTimer(customLimit) {
    const limit = customLimit || this.timeLimit;
    const now = Date.now();
    this.timeLimit = limit;
    this.questionStartedAt = now;
    this.questionEndsAt = now + limit * 1000;
    this.pausedRemainingMs = limit * 1000;
    this.isTimerRunning = true;
    this.isPaused = false;
    this.logEvent("TIMER_STARTED", { timeLimit: limit });
  }

  restartTimer() {
    this.startTimer(this.timeLimit);
  }

  pauseTimer() {
    if (!this.isTimerRunning || this.isPaused) return;
    const now = Date.now();
    this.pausedRemainingMs = Math.max(0, this.questionEndsAt - now);
    this.isPaused = true;
    this.isTimerRunning = false;
    this.logEvent("TIMER_PAUSED", { remainingMs: this.pausedRemainingMs });
  }

  resumeTimer() {
    if (!this.isTimerRunning && !this.isPaused) {
      this.startTimer();
      return;
    }
    if (!this.isPaused) return;
    const now = Date.now();
    const remaining = this.pausedRemainingMs > 0 ? this.pausedRemainingMs : this.timeLimit * 1000;
    this.questionEndsAt = now + remaining;
    this.isPaused = false;
    this.isTimerRunning = true;
    this.logEvent("TIMER_RESUMED", { remainingMs: remaining });
  }

  addTime(seconds = 15) {
    const msToAdd = seconds * 1000;
    if (this.isPaused) {
      this.pausedRemainingMs += msToAdd;
    } else if (this.isTimerRunning && this.questionEndsAt) {
      this.questionEndsAt += msToAdd;
    } else {
      this.pausedRemainingMs = (this.timeLimit + seconds) * 1000;
    }
    this.timeLimit += seconds;
    this.logEvent("TIME_ADDED", { seconds });
  }

  selectOption(optionId) {
    if (this.status !== "QUESTION_ACTIVE" && this.status !== "ANSWER_SELECTED") return;
    if (this.eliminatedOptions.includes(optionId)) return; // cannot select 50:50 eliminated option
    this.selectedOption = optionId;
    this.status = "ANSWER_SELECTED";
    this.logEvent("ANSWER_SELECTED", { optionId });
  }

  lockAnswer() {
    if (!this.selectedOption) return;
    if (this.status !== "ANSWER_SELECTED" && this.status !== "QUESTION_ACTIVE") return;
    
    this.lockedOption = this.selectedOption;
    this.status = "ANSWER_LOCKED";
    this.pauseTimer();
    this.logEvent("ANSWER_LOCKED", { lockedOption: this.lockedOption });
  }

  revealAnswer() {
    if (this.status !== "ANSWER_LOCKED" && this.status !== "ANSWER_SELECTED") return;
    const q = this.getCurrentQuestion();
    if (!q) return;

    const chosen = this.lockedOption || this.selectedOption;
    this.lockedOption = chosen;
    this.isCorrect = (chosen === q.correctOption);
    this.status = "REVEALED";

    if (this.isCorrect) {
      this.currentPrize = q.prizeValue || this.currentPrize;
    }

    this.logEvent("ANSWER_REVEALED", {
      chosen,
      correct: q.correctOption,
      isCorrect: this.isCorrect,
    });
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.setupQuestion(this.currentQuestionIndex + 1, true);
    } else {
      this.status = "FINISHED";
      this.isTimerRunning = false;
      this.logEvent("GAME_FINISHED", { finalPrize: this.currentPrize });
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.setupQuestion(this.currentQuestionIndex - 1, true);
    }
  }

  triggerLifeline(type) {
    const q = this.getCurrentQuestion();
    if (!q) return;

    if (type === "50:50" || type === "fiftyFifty") {
      if (this.lifelines.fiftyFifty.used) return;
      this.lifelines.fiftyFifty.used = true;
      this.lifelines.fiftyFifty.active = true;

      // Randomly pick two incorrect options to eliminate
      const incorrect = q.options
        .map((o) => o.id)
        .filter((id) => id !== q.correctOption);
      
      // Shuffle incorrect
      const shuffled = [...incorrect].sort(() => 0.5 - Math.random());
      this.eliminatedOptions = shuffled.slice(0, 2);
      this.logEvent("LIFELINE_50_50", { eliminated: this.eliminatedOptions });
    } else if (type === "askHost" || type === "ask_host") {
      if (this.lifelines.askHost.used) return;
      this.lifelines.askHost.used = true;
      this.lifelines.askHost.active = true;
      this.pauseTimer();
      this.status = "LIFELINE_ACTIVE";
      this.logEvent("LIFELINE_ASK_HOST", "Paused timer and notified host");
    } else if (type === "audiencePoll" || type === "poll") {
      if (this.lifelines.audiencePoll.used) return;
      this.lifelines.audiencePoll.used = true;
      this.lifelines.audiencePoll.active = true;
      this.pauseTimer();

      // Generate realistic audience distribution heavily leaning toward correct option
      const correct = q.correctOption;
      const opts = ["A", "B", "C", "D"];
      let remainingPct = 100;
      const results = {};

      const correctPct = Math.floor(Math.random() * 25) + 55; // 55% - 80%
      results[correct] = correctPct;
      remainingPct -= correctPct;

      const otherOpts = opts.filter((o) => o !== correct);
      for (let i = 0; i < otherOpts.length; i++) {
        if (i === otherOpts.length - 1) {
          results[otherOpts[i]] = remainingPct;
        } else {
          const share = Math.floor(Math.random() * (remainingPct - 5));
          results[otherOpts[i]] = share;
          remainingPct -= share;
        }
      }

      this.lifelines.audiencePoll.results = results;
      this.status = "LIFELINE_ACTIVE";
      this.logEvent("LIFELINE_AUDIENCE_POLL", results);
    }
  }

  resolveLifeline(type) {
    if (type === "askHost" || type === "ask_host") {
      this.lifelines.askHost.active = false;
      this.resumeTimer();
      this.status = "QUESTION_ACTIVE";
      this.logEvent("LIFELINE_RESOLVED", "Ask the Host concluded");
    } else if (type === "audiencePoll" || type === "poll") {
      this.lifelines.audiencePoll.active = false;
      this.resumeTimer();
      this.status = "QUESTION_ACTIVE";
      this.logEvent("LIFELINE_RESOLVED", "Audience poll closed");
    }
  }

  timeout() {
    if (this.status !== "QUESTION_ACTIVE" && this.status !== "ANSWER_SELECTED") return;
    this.status = "TIMEOUT";
    this.isTimerRunning = false;
    this.logEvent("TIMEOUT", { questionIndex: this.currentQuestionIndex });
  }

  setContestant(name) {
    this.contestantName = name || "Contestant";
    this.logEvent("CONTESTANT_UPDATED", { name: this.contestantName });
  }
}
