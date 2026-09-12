import React, { useState } from "react";
import { useGame } from "../context/GameContext";
import { useGameAudioEvents } from "../hooks/useGameAudioEvents";
import Starfield from "../components/Starfield";
import { soundManager } from "../utils/soundManager";
import "./StageDisplay.css";

function formatTimer(seconds) {
  if (seconds <= 0) return "00";
  if (seconds < 60) {
    return String(seconds).padStart(2, "0");
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function StageDisplay() {
  const { gameState, remainingSeconds, selectOption } = useGame();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStandings, setShowStandings] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(soundManager.isUnlocked);

  const handleUnlockAudio = () => {
    soundManager.unlockAudio();
    setIsAudioUnlocked(true);
  };

  const handleToggleMute = () => {
    handleUnlockAudio();
    const newMuted = soundManager.toggleMute();
    setIsMuted(newMuted);
  };

  // Hook audio events architecture
  useGameAudioEvents(gameState, remainingSeconds, {
    onQuestionStart: (q) => console.log("[Audio Event] Question started:", q?.questionNumber),
    onTimerTick: (_sec) => {},
    onTimerWarning: () => console.log("[Audio Event] Timer warning!"),
    onTimerCritical: () => console.log("[Audio Event] Timer critical!"),
    onTimeout: () => console.log("[Audio Event] Timeout sound!"),
    onAnswerLocked: (opt) => console.log("[Audio Event] Answer locked:", opt),
    onCorrectAnswer: () => console.log("[Audio Event] Correct answer fanfare!"),
    onWrongAnswer: () => console.log("[Audio Event] Wrong answer buzzer!"),
  });

  const toggleFullscreen = () => {
    handleUnlockAudio();
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
  const contestants = gameState.contestants || [];
  const activeIdx = gameState.activeContestantIndex ?? 0;
  const activeContestant = contestants[activeIdx] || { rank: 1, name: gameState.contestantName };

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

    if (status === "REVEALED" || status === "ELIMINATED") {
      if (optId === q?.correctOption) {
        return "stage-option--correct";
      }
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
            <span className="stage-stat__label">HOT SEAT</span>
            <span className="stage-stat__val">
              #{activeContestant.rank} {gameState.contestantName || "Contestant"}
            </span>
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
            className={`stage-btn-icon ${isMuted ? "stage-btn-icon--muted" : ""}`}
            onClick={handleToggleMute}
            title={isMuted ? "Unmute Arena Audio" : "Mute Arena Audio"}
            style={{ marginRight: "0.5rem" }}
          >
            {isMuted ? "🔇 AUDIO OFF" : "🔊 AUDIO ON"}
          </button>

          <button
            type="button"
            className="stage-btn-icon"
            onClick={() => setShowStandings(!showStandings)}
            title="Toggle Top 5 Standings"
            style={{ marginRight: "0.5rem" }}
          >
            🏆 TOP 5 STANDINGS
          </button>

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

      {/* Browser Autoplay Unlock Banner */}
      {!isAudioUnlocked && (
        <div className="stage-audio-banner" onClick={handleUnlockAudio} role="button" tabIndex={0}>
          <span>🔊</span> CLICK HERE OR PRESS FULLSCREEN TO UNLOCK ARENA SOUND EFFECTS &bull; 45S / 60S COUNTDOWNS
        </div>
      )}

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
            Welcoming Contestant #{activeContestant.rank} &bull; <strong>{gameState.contestantName}</strong> to the Hot Seat.
          </p>
          <div className="stage-lobby__badge">
            <span>●</span> WAITING FOR HOST TO START QUESTION 1
          </div>
        </main>
      )}

      {/* ELIMINATED SCREEN */}
      {status === "ELIMINATED" && (
        <main className="stage-lobby stage-lobby--eliminated">
          <div className="stage-status-icon">❌</div>
          <h2 style={{ color: "#ef4444" }}>HOT SEAT RUN CONCLUDED</h2>
          <p>
            Well played, <strong>{gameState.contestantName}</strong> (Participant #{activeContestant.rank})!
          </p>
          <div className="stage-stat" style={{ marginBottom: "1.5rem" }}>
            <span className="stage-stat__label">GUARANTEED SAFE PRIZE WON</span>
            <span className="stage-stat__val stage-stat__val--gold" style={{ fontSize: "2.5rem" }}>
              {gameState.currentPrize || "₹0"}
            </span>
          </div>
          <div className="stage-lobby__badge stage-lobby__badge--pulse">
            <span>●</span> PREPARING NEXT CONTESTANT FOR HOT SEAT
          </div>
        </main>
      )}

      {/* WALKED AWAY SCREEN */}
      {status === "WALKED_AWAY" && (
        <main className="stage-lobby stage-lobby--walk">
          <div className="stage-status-icon">💼</div>
          <h2 className="gold-text">CONTESTANT DECIDED TO WALK AWAY</h2>
          <p>
            Strategic choice by <strong>{gameState.contestantName}</strong> (Participant #{activeContestant.rank})!
          </p>
          <div className="stage-stat" style={{ marginBottom: "1.5rem" }}>
            <span className="stage-stat__label">FINAL BANKED PRIZE WON</span>
            <span className="stage-stat__val stage-stat__val--gold" style={{ fontSize: "2.5rem" }}>
              {gameState.currentPrize || "₹0"}
            </span>
          </div>
          <div className="stage-lobby__badge">
            <span>●</span> CALLING NEXT CONTESTANT TO HOT SEAT
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
          <h2>EVENT CONCLUDED</h2>
          <p>
            Congratulations to all participants in Kaun Banega Codepathi!
          </p>
          <div className="stage-stat" style={{ marginBottom: "2rem" }}>
            <span className="stage-stat__label">FINAL CONTESTANT PRIZE</span>
            <span className="stage-stat__val stage-stat__val--gold" style={{ fontSize: "2.5rem" }}>
              {gameState.currentPrize || "₹0"}
            </span>
          </div>
          <button
            type="button"
            className="stage-btn-icon"
            onClick={() => setShowStandings(true)}
            style={{ fontSize: "1rem", padding: "0.6rem 1.2rem" }}
          >
            VIEW FINAL LEADERBOARD 🏆
          </button>
        </main>
      )}

      {/* ACTIVE GAMEPLAY SCREEN */}
      {status !== "LOBBY" && status !== "FINISHED" && status !== "ELIMINATED" && status !== "WALKED_AWAY" && (
        <main className="stage-main">
          <section className="stage-arena">
            {/* Timer HUD */}
            <div className="stage-timer-wrap">
              <div className={timerClass}>
                <span className={`stage-timer__val ${remainingSeconds >= 60 ? "stage-timer__val--mmss" : ""}`}>
                  {status === "TIMEOUT" ? "00" : formatTimer(remainingSeconds)}
                </span>
                <span className="stage-timer__sublabel">
                  {status === "TIMEOUT" ? "EXPIRED" : remainingSeconds >= 60 ? "MIN : SEC" : "SECONDS"}
                </span>
              </div>
            </div>

            {/* Question Box */}
            <div className="stage-question-card">
              <span className="stage-question-card__eyebrow">
                {q?.category ? `${q.category.toUpperCase()} • ` : ""}ROUND {q?.round || 1} &bull; QUESTION {q?.questionNumber || 1}
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
              <span className="stage-ladder-subtitle">(SET {gameState.activeSetId || 1} &bull; 15 QUESTIONS)</span>
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
              The timer is paused. The Hot Seat contestant is currently consulting with the Quiz Master.
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

      {/* MODAL OVERLAY: TOP 5 STANDINGS */}
      {showStandings && (
        <div className="stage-modal-overlay" onClick={() => setShowStandings(false)}>
          <div className="stage-modal stage-standings-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 className="gold-text" style={{ margin: 0, fontSize: "1.5rem" }}>
                🏆 TOP 5 PARTICIPANTS STANDINGS
              </h3>
              <button
                type="button"
                className="stage-btn-icon"
                onClick={() => setShowStandings(false)}
              >
                ✕
              </button>
            </div>
            <p style={{ color: "var(--ink-300)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Live leaderboard for the Hot Seat challengers
            </p>
            <div className="stage-standings-table">
              <div className="stage-standings-row stage-standings-row--head">
                <span>RANK</span>
                <span>CONTESTANT</span>
                <span>SET</span>
                <span>PROGRESS</span>
                <span>PRIZE WON</span>
                <span>STATUS</span>
              </div>
              {contestants.map((c, idx) => (
                <div
                  key={c.id || idx}
                  className={`stage-standings-row ${idx === activeIdx ? "stage-standings-row--active" : ""}`}
                >
                  <span style={{ fontWeight: "800", color: "var(--gold-400)" }}>#{c.rank}</span>
                  <strong>{c.name}</strong>
                  <span>Set {c.setId || c.rank}</span>
                  <span>{c.outAtQuestion ? `Question ${c.outAtQuestion}` : "In Queue"}</span>
                  <span className="stage-standings-prize">{c.finalPrize || "₹0"}</span>
                  <span className="stage-standings-badge">{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
