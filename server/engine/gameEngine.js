import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const questionSetsPath = path.resolve(__dirname, "../data/questionSets.json");
const fallbackQuestionsPath = path.resolve(__dirname, "../data/questions.json");

function loadQuestionSets() {
  try {
    if (fs.existsSync(questionSetsPath)) {
      const raw = fs.readFileSync(questionSetsPath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to load questionSets.json:", err.message);
  }

  // Fallback to single questions.json as Set 1
  try {
    const raw = fs.readFileSync(fallbackQuestionsPath, "utf-8");
    const set1 = JSON.parse(raw);
    return { "1": set1, "2": set1, "3": set1, "4": set1, "5": set1 };
  } catch (err) {
    console.error("Failed to load questions.json fallback:", err.message);
    return { "1": [], "2": [], "3": [], "4": [], "5": [] };
  }
}

export class GameEngine {
  constructor() {
    this.questionSets = loadQuestionSets();
    this.activeSetId = 1;
    this.questions = this.questionSets["1"] || [];

    // Top 5 Contestant Roster
    this.contestants = [
      { id: 1, rank: 1, name: "Contestant 1", status: "WAITING", finalPrize: "₹0", outAtQuestion: null, setId: 1 },
      { id: 2, rank: 2, name: "Contestant 2", status: "WAITING", finalPrize: "₹0", outAtQuestion: null, setId: 2 },
      { id: 3, rank: 3, name: "Contestant 3", status: "WAITING", finalPrize: "₹0", outAtQuestion: null, setId: 3 },
      { id: 4, rank: 4, name: "Contestant 4", status: "WAITING", finalPrize: "₹0", outAtQuestion: null, setId: 4 },
      { id: 5, rank: 5, name: "Contestant 5", status: "WAITING", finalPrize: "₹0", outAtQuestion: null, setId: 5 },
    ];
    this.activeContestantIndex = 0;

    this.reset();
  }

  reset() {
    this.status = "LOBBY"; // LOBBY | QUESTION_ACTIVE | ANSWER_SELECTED | ANSWER_LOCKED | REVEALED | LIFELINE_ACTIVE | PAUSED | TIMEOUT | ELIMINATED | WALKED_AWAY | FINISHED
    this.currentQuestionIndex = 0;
    this.contestantName = this.contestants[this.activeContestantIndex]?.name || "Contestant";
    this.currentPrize = "₹0";

    // Timer state
    this.timeLimit = 45;
    this.questionStartedAt = null;
    this.questionEndsAt = null;
    this.isTimerRunning = false;
    this.isPaused = false;
    this.pausedRemainingMs = 0;
    this.wasTimerRunningBeforeLifeline = false;

    // Interaction state
    this.selectedOption = null;
    this.lockedOption = null;
    this.isCorrect = null;
    this.eliminatedOptions = [];

    // Lifelines (reset on new contestant or full reset)
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
    if (this.events.length > 100) this.events.shift();
  }

  // Load a specific Question Set (1 - 5)
  setQuestionSet(setId) {
    const key = String(setId);
    if (!this.questionSets[key] || this.questionSets[key].length === 0) {
      console.warn(`Question Set ${setId} not found, defaulting to Set 1`);
      return false;
    }

    this.activeSetId = Number(setId);
    this.questions = this.questionSets[key];
    this.currentQuestionIndex = 0;
    this.selectedOption = null;
    this.lockedOption = null;
    this.isCorrect = null;
    this.eliminatedOptions = [];
    this.logEvent("QUESTION_SET_CHANGED", { setId: this.activeSetId, totalQuestions: this.questions.length });
    return true;
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

  // Calculate guaranteed safe milestone prize
  calculateSafePrize(qIndex) {
    if (qIndex >= 14) return "₹4,000"; // Cleared grand prize
    if (qIndex >= 9) return "₹1,000";  // Reached / crossed Safe Zone 2 (Q10)
    if (qIndex >= 4) return "₹300";    // Reached / crossed Safe Zone 1 (Q5)
    return "₹0";                       // Before Safe Zone 1
  }

  // Get current prize accumulated before answering current question (for walk-away)
  getLastClearedPrize() {
    if (this.currentQuestionIndex <= 0) return "₹0";
    const prevQ = this.questions[this.currentQuestionIndex - 1];
    return prevQ?.prizeValue || "₹0";
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
      remainingMs = this.pausedRemainingMs > 0 ? this.pausedRemainingMs : this.timeLimit * 1000;
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
        explanation: (role === "host" || this.status === "REVEALED" || this.status === "ELIMINATED") ? q.explanation : null,
      };

      // Security: Only send correctOption to host, or to stage when REVEALED or ELIMINATED!
      if (role === "host" || this.status === "REVEALED" || this.status === "ELIMINATED") {
        sanitizedQuestion.correctOption = q.correctOption;
      }
    }

    return {
      status: this.status,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
      contestantName: this.contestantName,
      currentPrize: this.currentPrize,
      activeSetId: this.activeSetId,
      availableSets: Object.keys(this.questionSets).map(Number).sort((a, b) => a - b),
      contestants: this.contestants,
      activeContestantIndex: this.activeContestantIndex,
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

  // Start game for active contestant
  startGame(contestantName) {
    if (contestantName) {
      this.contestantName = contestantName;
      if (this.contestants[this.activeContestantIndex]) {
        this.contestants[this.activeContestantIndex].name = contestantName;
      }
    }
    if (this.contestants[this.activeContestantIndex]) {
      this.contestants[this.activeContestantIndex].status = "IN_HOT_SEAT";
    }

    this.currentQuestionIndex = 0;
    this.currentPrize = "₹0";
    this.lifelines = {
      fiftyFifty: { used: false, active: false },
      askHost: { used: false, active: false, message: "" },
      audiencePoll: { used: false, active: false, results: null },
    };
    this.setupQuestion(0, true);
    this.logEvent("GAME_STARTED", {
      contestant: this.contestantName,
      setId: this.activeSetId,
      rank: this.activeContestantIndex + 1,
    });
  }

  setupQuestion(index, autoStartTimer = true) {
    if (index < 0 || index >= this.questions.length) return;
    this.currentQuestionIndex = index;
    const q = this.questions[index];
    const qNum = q ? (q.questionNumber || index + 1) : index + 1;
    const ruleTime = qNum <= 5 ? 45 : qNum <= 10 ? 60 : 120;
    this.timeLimit = q?.timeLimit || ruleTime;
    this.selectedOption = null;
    this.lockedOption = null;
    this.isCorrect = null;
    this.eliminatedOptions = [];

    // Clear active status on lifelines so modal doesn't persist across questions
    this.lifelines.fiftyFifty.active = false;
    this.lifelines.askHost.active = false;
    this.lifelines.audiencePoll.active = false;

    this.status = "QUESTION_ACTIVE";
    this.logEvent("QUESTION_LOADED", { questionNumber: index + 1, setId: this.activeSetId });

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
    if (this.isPaused) return;
    const now = Date.now();
    if (this.isTimerRunning && this.questionEndsAt) {
      this.pausedRemainingMs = Math.max(0, this.questionEndsAt - now);
    } else if (this.pausedRemainingMs <= 0) {
      this.pausedRemainingMs = this.timeLimit * 1000;
    }
    this.isPaused = true;
    this.isTimerRunning = false;
    this.logEvent("TIMER_PAUSED", { remainingMs: this.pausedRemainingMs });
  }

  resumeTimer() {
    if (!this.isPaused && this.isTimerRunning) return;
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
    this.logEvent("TIME_ADDED", { seconds, newLimit: this.timeLimit });
  }

  selectOption(optionId) {
    if (this.status !== "QUESTION_ACTIVE" && this.status !== "ANSWER_SELECTED") return;
    if (this.eliminatedOptions.includes(optionId)) return; // 50:50 removed this option
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

    const activeContestant = this.contestants[this.activeContestantIndex];

    if (this.isCorrect) {
      this.status = "REVEALED";
      this.currentPrize = q.prizeValue || this.currentPrize;

      if (activeContestant) {
        activeContestant.finalPrize = this.currentPrize;
        activeContestant.outAtQuestion = q.questionNumber;
        if (this.currentQuestionIndex === this.questions.length - 1) {
          activeContestant.status = "COMPLETED";
        }
      }
    } else {
      // Wrong answer -> Elimination
      this.status = "ELIMINATED";
      const safePrize = this.calculateSafePrize(this.currentQuestionIndex);
      this.currentPrize = safePrize;

      if (activeContestant) {
        activeContestant.status = "ELIMINATED";
        activeContestant.finalPrize = safePrize;
        activeContestant.outAtQuestion = q.questionNumber;
      }
    }

    this.logEvent("ANSWER_REVEALED", {
      chosen,
      correct: q.correctOption,
      isCorrect: this.isCorrect,
      status: this.status,
      prizeWon: this.currentPrize,
    });
  }

  // Contestant decides to quit and bank previous question's earnings
  walkAway() {
    if (this.status === "LOBBY" || this.status === "ELIMINATED" || this.status === "FINISHED") return;
    this.pauseTimer();
    this.status = "WALKED_AWAY";
    const walkAwayPrize = this.getLastClearedPrize();
    this.currentPrize = walkAwayPrize;

    const activeContestant = this.contestants[this.activeContestantIndex];
    if (activeContestant) {
      activeContestant.status = "WALKED_AWAY";
      activeContestant.finalPrize = walkAwayPrize;
      activeContestant.outAtQuestion = this.currentQuestionIndex + 1;
    }

    this.logEvent("CONTESTANT_WALKED_AWAY", {
      contestant: this.contestantName,
      prize: walkAwayPrize,
      atQuestion: this.currentQuestionIndex + 1,
    });
  }

  // Timeout handler
  timeout() {
    if (this.status !== "QUESTION_ACTIVE" && this.status !== "ANSWER_SELECTED") return;
    this.status = "ELIMINATED";
    this.isTimerRunning = false;
    const safePrize = this.calculateSafePrize(this.currentQuestionIndex);
    this.currentPrize = safePrize;

    const activeContestant = this.contestants[this.activeContestantIndex];
    if (activeContestant) {
      activeContestant.status = "ELIMINATED";
      activeContestant.finalPrize = safePrize;
      activeContestant.outAtQuestion = this.currentQuestionIndex + 1;
    }

    this.logEvent("TIMEOUT_ELIMINATED", {
      questionIndex: this.currentQuestionIndex,
      safePrize,
    });
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.setupQuestion(this.currentQuestionIndex + 1, true);
    } else {
      this.status = "FINISHED";
      this.isTimerRunning = false;
      const activeContestant = this.contestants[this.activeContestantIndex];
      if (activeContestant) {
        activeContestant.status = "COMPLETED";
        activeContestant.finalPrize = this.currentPrize;
      }
      this.logEvent("GAME_FINISHED", { finalPrize: this.currentPrize });
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.setupQuestion(this.currentQuestionIndex - 1, true);
    }
  }

  // Lifelines implementation with high robustness
  triggerLifeline(type) {
    const q = this.getCurrentQuestion();
    if (!q) return;

    // Disallow lifelines during locked, revealed, or terminal states
    if (this.status !== "QUESTION_ACTIVE" && this.status !== "ANSWER_SELECTED") return;

    if (type === "50:50" || type === "fiftyFifty") {
      if (this.lifelines.fiftyFifty.used || this.lifelines.fiftyFifty.active) return;
      this.lifelines.fiftyFifty.used = true;
      this.lifelines.fiftyFifty.active = true;

      const incorrect = q.options
        .map((o) => o.id)
        .filter((id) => id !== q.correctOption);

      const shuffled = [...incorrect].sort(() => 0.5 - Math.random());
      this.eliminatedOptions = shuffled.slice(0, 2);

      // If contestant had selected an option that was eliminated by 50:50, deselect it!
      if (this.selectedOption && this.eliminatedOptions.includes(this.selectedOption)) {
        this.selectedOption = null;
        if (this.status === "ANSWER_SELECTED") {
          this.status = "QUESTION_ACTIVE";
        }
      }

      this.logEvent("LIFELINE_50_50", { eliminated: this.eliminatedOptions });
    } else if (type === "askHost" || type === "ask_host") {
      if (this.lifelines.askHost.used || this.lifelines.askHost.active) return;
      this.lifelines.askHost.used = true;
      this.lifelines.askHost.active = true;
      this.wasTimerRunningBeforeLifeline = this.isTimerRunning;
      this.pauseTimer();
      this.status = "LIFELINE_ACTIVE";
      this.logEvent("LIFELINE_ASK_HOST", "Paused timer and notified host");
    } else if (type === "audiencePoll" || type === "poll") {
      if (this.lifelines.audiencePoll.used || this.lifelines.audiencePoll.active) return;
      this.lifelines.audiencePoll.used = true;
      this.lifelines.audiencePoll.active = true;
      this.wasTimerRunningBeforeLifeline = this.isTimerRunning;
      this.pauseTimer();

      // Realistic audience poll leaning toward correct answer
      const correct = q.correctOption;
      const opts = ["A", "B", "C", "D"];
      let remainingPct = 100;
      const results = {};

      const correctPct = Math.floor(Math.random() * 21) + 60; // 60% - 80%
      results[correct] = correctPct;
      remainingPct -= correctPct;

      const otherOpts = opts.filter((o) => o !== correct);
      for (let i = 0; i < otherOpts.length; i++) {
        if (i === otherOpts.length - 1) {
          results[otherOpts[i]] = Math.max(0, remainingPct);
        } else {
          const share = Math.floor(Math.random() * (remainingPct - (otherOpts.length - i - 1)));
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
      if (this.wasTimerRunningBeforeLifeline) {
        this.resumeTimer();
      }
      this.status = this.selectedOption ? "ANSWER_SELECTED" : "QUESTION_ACTIVE";
      this.logEvent("LIFELINE_RESOLVED", "Ask the Host concluded");
    } else if (type === "audiencePoll" || type === "poll") {
      this.lifelines.audiencePoll.active = false;
      if (this.wasTimerRunningBeforeLifeline) {
        this.resumeTimer();
      }
      this.status = this.selectedOption ? "ANSWER_SELECTED" : "QUESTION_ACTIVE";
      this.logEvent("LIFELINE_RESOLVED", "Audience poll closed");
    }
  }

  // Top 5 Queue: Call next participant
  callNextContestant() {
    const current = this.contestants[this.activeContestantIndex];
    if (current && current.status === "IN_HOT_SEAT") {
      current.status = "ELIMINATED";
    }

    // Find next waiting participant
    let nextIndex = this.contestants.findIndex(
      (c, idx) => idx > this.activeContestantIndex && c.status === "WAITING"
    );

    if (nextIndex === -1) {
      // If none found after current, check from start for any WAITING
      nextIndex = this.contestants.findIndex((c) => c.status === "WAITING");
    }

    if (nextIndex === -1) {
      // All 5 have played
      this.status = "FINISHED";
      this.logEvent("ALL_CONTESTANTS_PLAYED", "All 5 participants have completed their turns.");
      return false;
    }

    this.switchToContestant(nextIndex);
    return true;
  }

  // Switch to specific contestant (0 to 4)
  switchToContestant(index) {
    if (index < 0 || index >= this.contestants.length) return false;

    this.activeContestantIndex = index;
    const nextContestant = this.contestants[index];
    nextContestant.status = "IN_HOT_SEAT";
    this.contestantName = nextContestant.name;

    // Load their assigned question set (defaults to index + 1)
    const assignedSet = nextContestant.setId || (index + 1);
    this.setQuestionSet(assignedSet);

    // Refresh lifelines completely for the new contestant!
    this.lifelines = {
      fiftyFifty: { used: false, active: false },
      askHost: { used: false, active: false, message: "" },
      audiencePoll: { used: false, active: false, results: null },
    };

    this.currentQuestionIndex = 0;
    this.currentPrize = "₹0";
    this.selectedOption = null;
    this.lockedOption = null;
    this.isCorrect = null;
    this.eliminatedOptions = [];
    this.isTimerRunning = false;
    this.isPaused = false;
    this.status = "LOBBY";

    this.logEvent("CONTESTANT_SWITCHED", {
      name: this.contestantName,
      rank: nextContestant.rank,
      assignedSet,
    });
    return true;
  }

  // Update Top 5 roster info (names, setIds)
  updateRoster(rosterList) {
    if (!Array.isArray(rosterList)) return;
    rosterList.forEach((item, idx) => {
      if (idx < this.contestants.length) {
        if (item.name !== undefined) this.contestants[idx].name = item.name.trim() || `Contestant ${idx + 1}`;
        if (item.setId !== undefined) this.contestants[idx].setId = Number(item.setId) || (idx + 1);
        if (item.status !== undefined) this.contestants[idx].status = item.status;
      }
    });
    if (this.contestants[this.activeContestantIndex]) {
      this.contestantName = this.contestants[this.activeContestantIndex].name;
    }
    this.logEvent("ROSTER_UPDATED", this.contestants);
  }

  setContestant(name) {
    this.contestantName = name || "Contestant";
    if (this.contestants[this.activeContestantIndex]) {
      this.contestants[this.activeContestantIndex].name = this.contestantName;
    }
    this.logEvent("CONTESTANT_UPDATED", { name: this.contestantName });
  }
}
