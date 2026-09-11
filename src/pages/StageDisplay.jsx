import React, { useState } from "react";
import { useGame } from "../context/GameContext";
import { useGameAudioEvents } from "../hooks/useGameAudioEvents";
import Starfield from "../components/Starfield";
import "./StageDisplay.css";

export default function StageDisplay() {
  const { gameState, remainingSeconds, selectOption } = useGame();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Hook audio events architecture (listeners can be attached anytime)
  useGameAudioEvents(gameState, remainingSeconds, {
    onQuestionStart: (q) => console.log("[Audio Event] Question started:", q?.questionNumber),
    onTimerTick: (_sec) => { /* audio tick hook */ },
    onTimerWarning: () => console.log("[Audio Event] Timer warning!"),
    onTimerCritical: () => console.log("[Audio Event] Timer critical!"),
    onTimeout: () => console.log("[Audio Event] Timeout sound!"),
    onAnswerLocked: (opt) => console.log("[Audio Event] Answer locked:", opt),
    onCorrectAnswer: () => console.log("[Audio Event] Correct answer fanfare!"),
    onWrongAnswer: () => console.log("[Audio Event] Wrong answer buzzer!"),
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const status = gameState.status;
  const q = gameState.question;
  const interaction = gameState.interaction || {};
  const lifelines = gameState.lifelines || {};
  const timer = gameState.timer || {};

  // Timer style helper
  let timerClass = "stage-timer";
  if (timer.isPaused) {
    timerClass += " stage-timer--paused";
  } else if (remainingSeconds <= 5 && remainingSeconds > 0) {
    timerClass += " stage-timer--critical";
  } else if (remainingSeconds <= 10 && remainingSeconds > 0) {
    timerClass += " stage-timer--warning";
  }

  // Option state helper
  const getOptionStateClass = (optId) => {
    if (interaction.eliminatedOptions?.includes(optId)) {
      return "stage-option--eliminated";
    }

    if (status === "REVEALED") {
      // In revealed state, highlight correct answer in green
      if (optId === q?.correctOption) {
        return "stage-option--correct";
      }
      // If player locked this option and it was wrong, mark it in red
      if (optId === interaction.lockedOption && !interaction.isCorrect) {
        return "stage-option--wrong";
      }
    }

    if (status === "ANSWER_LOCKED" && interaction.lockedOption === optId) {
      return "stage-option--locked";
    }

    if (status === "ANSWER_SELECTED" && interaction.selectedOption === optId) {
      return "stage-option--selected";
    }

    return "";
  };

  return (
    <div className="stage-view">
      <Starfield density={40} />

      <div className="stage-ambient">
        <div className="stage-ambient__spotlight" />
        <div className="stage-ambient__ring stage-ambient__ring--1" />
        <div className="stage-ambient__ring stage-ambient__ring--2" />
      </div>

      {/* Broadcast Header */}
      <header className="stage-header">
        <div className="stage-brand">
          <img
            src="/kbc-codepathi.png"
            alt="Kaun Banega Codepathi"
            className="stage-brand__logo"
          />
          <div className="stage-brand__titles">
            <h1>KAUN BANEGA CODEPATHI</h1>
            <span>ACM VIT-AP LIVE ARENA</span>
          </div>
        </div>

        <div className="stage-header__stats">
          <div className="stage-stat">
            <span className="stage-stat__label">CONTESTANT</span>
            <span className="stage-stat__val">{gameState.contestantName || "Hot Seat"}</span>
          </div>

          <div className="stage-stat">
            <span className="stage-stat__label">QUESTION</span>
            <span className="stage-stat__val">
              {q ? `${String(q.questionNumber).padStart(2, "0")} / ${String(q.totalQuestions || 15).padStart(2, "0")}` : "--"}
            </span>
          </div>

          <div className="stage-stat">
            <span className="stage-stat__label">PRIZE LADDER</span>
            <span className="stage-stat__val stage-stat__val--gold">
              {q?.prizeValue || gameState.currentPrize || "₹0"}
            </span>
          </div>
        </div>

        <div className="stage-header__controls">
          <button
            type="button"
            className="stage-btn-icon"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? "EXIT FULLSCREEN" : "⛶ FULLSCREEN"}
          </button>
        </div>
      </header>

      {/* LOBBY SCREEN */}
      {status === "LOBBY" && (
        <main className="stage-lobby">
          <img
            src="/kbc-codepathi.png"
            alt="Codepathi"
            className="stage-lobby__emblem"
          />
          <h2>THE HOT SEAT ARENA</h2>
          <p>
            Welcome to Kaun Banega Codepathi. Prepare your strategy, test your algorithmic speed, and claim your place on the leaderboard.
          </p>
          <div className="stage-lobby__badge">
            <span>●</span> WAITING FOR HOST TO START
          </div>
        </main>
      )}

      {/* GAME FINISHED SCREEN */}
      {status === "FINISHED" && (
        <main className="stage-lobby">
          <img
            src="/kbc-codepathi.png"
            alt="Codepathi"
            className="stage-lobby__emblem"
          />
          <h2>GAME CONCLUDED</h2>
          <p>
            Congratulations <strong>{gameState.contestantName}</strong>! You have completed your journey in the Hot Seat.
          </p>
          <div className="stage-stat" style={{ marginBottom: "2rem" }}>
            <span className="stage-stat__label">FINAL PRIZE WON</span>
            <span className="stage-stat__val stage-stat__val--gold" style={{ fontSize: "2.5rem" }}>
              {gameState.currentPrize || "₹0"}
            </span>
          </div>
        </main>
      )}

      {/* ACTIVE GAMEPLAY SCREEN */}
      {status !== "LOBBY" && status !== "FINISHED" && (
        <main className="stage-main">
          <section className="stage-arena">
            {/* Timer HUD */}
            <div className="stage-timer-wrap">
              <div className={timerClass}>
                <span className="stage-timer__val">
                  {status === "TIMEOUT" ? "00" : String(remainingSeconds).padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Question Box */}
            <div className="stage-question-card">
              <span className="stage-question-card__eyebrow">
                ROUND {q?.round || 1} &bull; QUESTION {q?.questionNumber || 1}
              </span>
              <h2 className="stage-question-card__text">
                {q?.questionText || "Loading question..."}
              </h2>
            </div>

            {/* 4 Answer Choices */}
            <div className="stage-options-grid">
              {q?.options?.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`stage-option ${getOptionStateClass(opt.id)}`}
                  onClick={() => selectOption(opt.id)}
                  disabled={opt.eliminated || status === "ANSWER_LOCKED" || status === "REVEALED" || status === "TIMEOUT"}
                >
                  <span className="stage-option__letter">{opt.id}</span>
                  <span className="stage-option__text">{opt.text}</span>
                </button>
              ))}
            </div>

            {/* Lifelines Strip */}
            <div className="stage-lifelines">
              <div
                className={`stage-lifeline-pill ${
                  lifelines.fiftyFifty?.used ? "stage-lifeline-pill--used" : ""
                } ${lifelines.fiftyFifty?.active ? "stage-lifeline-pill--active" : ""}`}
              >
                <span>50:50</span>
              </div>

              <div
                className={`stage-lifeline-pill ${
                  lifelines.askHost?.used ? "stage-lifeline-pill--used" : ""
                } ${lifelines.askHost?.active ? "stage-lifeline-pill--active" : ""}`}
              >
                <span>ASK THE HOST</span>
              </div>

              <div
                className={`stage-lifeline-pill ${
                  lifelines.audiencePoll?.used ? "stage-lifeline-pill--used" : ""
                } ${lifelines.audiencePoll?.active ? "stage-lifeline-pill--active" : ""}`}
              >
                <span>AUDIENCE POLL</span>
              </div>
            </div>
          </section>

          {/* Right Prize Ladder Panel */}
          <aside className="stage-sidebar">
            <div className="stage-ladder-header">
              <h3 className="stage-ladder-title gold-text">HOT SEAT PRIZE LADDER</h3>
              <span className="stage-ladder-subtitle">(15 QUESTIONS)</span>
            </div>

            <div className="stage-ladder-columns">
              <span className="stage-ladder-col-q">Q.</span>
              <span className="stage-ladder-col-prize">PRIZE</span>
              <span className="stage-ladder-col-milestone">MILESTONE</span>
            </div>

            <div className="stage-ladder-list">
              {gameState.ladder?.map((lvl) => {
                const isSafeZone = lvl.milestone?.includes("SAFE ZONE");
                const isGrandPrize = lvl.milestone?.includes("GRAND PRIZE");

                let itemClass = "stage-ladder-row";
                if (lvl.isCurrent) itemClass += " stage-ladder-row--current";
                if (lvl.isCompleted) itemClass += " stage-ladder-row--completed";
                if (isSafeZone) itemClass += " stage-ladder-row--safezone";
                if (isGrandPrize) itemClass += " stage-ladder-row--grand";

                return (
                  <div key={lvl.index} className={itemClass}>
                    <span className="stage-ladder-col-q">
                      {lvl.isCompleted ? "✓ " : ""}Q{lvl.questionNumber}
                    </span>
                    <span className="stage-ladder-col-prize">{lvl.prizeValue}</span>
                    <span className="stage-ladder-col-milestone">
                      {isSafeZone && (
                        <span className="milestone-badge milestone-badge--safe">
                          🛡️ {lvl.milestone}
                        </span>
                      )}
                      {isGrandPrize && (
                        <span className="milestone-badge milestone-badge--grand">
                          🏆 {lvl.milestone}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>
        </main>
      )}

      {/* MODAL OVERLAY: ASK THE HOST */}
      {lifelines.askHost?.active && (
        <div className="stage-modal-overlay">
          <div className="stage-modal">
            <h3>LIFELINE: ASK THE HOST</h3>
            <p style={{ color: "var(--ink-300)", fontSize: "1.1rem" }}>
              The timer is paused. The Hot Seat contestant is currently consulting with the Host.
            </p>
          </div>
        </div>
      )}

      {/* MODAL OVERLAY: AUDIENCE POLL */}
      {lifelines.audiencePoll?.active && lifelines.audiencePoll?.results && (
        <div className="stage-modal-overlay">
          <div className="stage-modal">
            <h3>AUDIENCE POLL RESULTS</h3>
            <p style={{ color: "var(--ink-300)" }}>Live votes collected from the auditorium</p>
            <div className="stage-poll-bars">
              {["A", "B", "C", "D"].map((letter) => {
                const pct = lifelines.audiencePoll.results[letter] || 0;
                return (
                  <div key={letter} className="stage-poll-row">
                    <span className="stage-poll-letter">{letter}</span>
                    <div className="stage-poll-track">
                      <div className="stage-poll-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="stage-poll-pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
