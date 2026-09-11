import React, { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import "./HostDashboard.css";

export default function HostDashboard() {
  const {
    connected,
    gameState,
    remainingSeconds,
    setRole,
    startGame,
    selectOption,
    lockAnswer,
    revealAnswer,
    nextQuestion,
    previousQuestion,
    jumpQuestion,
    pauseTimer,
    resumeTimer,
    addTime,
    triggerLifeline,
    resolveLifeline,
    resetGame,
    setContestant,
  } = useGame();

  const [nameInput, setNameInput] = useState(gameState.contestantName || "Contestant");

  // Ensure role is registered as host
  useEffect(() => {
    setRole("host");
  }, [setRole]);

  useEffect(() => {
    if (gameState.contestantName) {
      setNameInput(gameState.contestantName);
    }
  }, [gameState.contestantName]);

  const handleUpdateName = (e) => {
    e.preventDefault();
    setContestant(nameInput);
  };

  const status = gameState.status;
  const q = gameState.question;
  const timer = gameState.timer || {};
  const interaction = gameState.interaction || {};
  const lifelines = gameState.lifelines || {};

  return (
    <div className="host-view">
      {/* Top Bar */}
      <header className="host-navbar">
        <div className="host-brand">
          <span className="host-badge-live">
            <span /> LIVE STUDIO DECK
          </span>
          <h1>KAUN BANEGA CODEPATHI &bull; HOST CONTROL</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div className="host-connection">
            LINK:{" "}
            <span className={connected ? "host-connection--on" : "host-connection--off"}>
              {connected ? "● SERVER SYNCHRONIZED" : "○ DISCONNECTED"}
            </span>
          </div>

          <a
            href="/play"
            target="_blank"
            rel="noopener noreferrer"
            className="host-btn-sm"
            style={{ textDecoration: "none" }}
          >
            OPEN STAGE DISPLAY ↗
          </a>
        </div>
      </header>

      {/* Main Grid */}
      <main className="host-grid">
        <div className="host-center-col">
          {/* Telemetry Row */}
          <div className="host-telemetry-row">
            <div className="host-card">
              <div className="host-card__label">GAME STATUS</div>
              <div className="host-card__value host-card__value--status">{status}</div>
            </div>

            <div className="host-card">
              <div className="host-card__label">CURRENT QUESTION</div>
              <div className="host-card__value">
                {q ? `Q${q.questionNumber} of ${q.totalQuestions || 15}` : "N/A"}
              </div>
            </div>

            <div className="host-card">
              <div className="host-card__label">TIME REMAINING</div>
              <div
                className="host-card__value"
                style={{
                  color: remainingSeconds <= 5 ? "#ef4444" : remainingSeconds <= 10 ? "#f59e0b" : "#fff",
                }}
              >
                {status === "TIMEOUT" ? "TIMEOUT" : `${remainingSeconds}s`}
              </div>
            </div>

            <div className="host-card">
              <div className="host-card__label">CURRENT PRIZE</div>
              <div className="host-card__value" style={{ color: "var(--gold-300)" }}>
                {q?.prizeValue || gameState.currentPrize || "₹0"}
              </div>
            </div>
          </div>

          {/* Question Preview with Host Answer Guide */}
          <div className="host-preview-deck">
            <div className="host-preview-deck__header">
              <div className="host-preview-deck__title">
                QUESTION PREVIEW (HOST PRIVATE VIEW)
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--gold-300)" }}>
                ROUND {q?.round || 1} &bull; VALUE: {q?.prizeValue || "₹1,000"}
              </div>
            </div>

            <div className="host-question-text">
              <strong>{q ? `Q${q.questionNumber}. ` : ""}</strong>
              {q?.questionText || "No question currently loaded."}
            </div>

            {/* Answer Options Grid */}
            <div className="host-options-list">
              {q?.options?.map((opt) => {
                const isCorrectOpt = opt.id === q?.correctOption;
                const isSelected = interaction.selectedOption === opt.id;
                const isLocked = interaction.lockedOption === opt.id;

                let optClass = "host-option-item";
                if (isCorrectOpt) optClass += " host-option-item--correct";
                if (isSelected) optClass += " host-option-item--selected";
                if (isLocked) optClass += " host-option-item--locked";

                return (
                  <div
                    key={opt.id}
                    className={optClass}
                    onClick={() => selectOption(opt.id)}
                    title="Click to select this option on behalf of contestant"
                  >
                    <span className="host-option-item__badge">{opt.id}</span>
                    <span>{opt.text}</span>
                    {isCorrectOpt && <span className="host-correct-tag">CORRECT</span>}
                    {isLocked && (
                      <span
                        className="host-correct-tag"
                        style={{ background: "#f59e0b", color: "#000", marginLeft: "auto" }}
                      >
                        LOCKED
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {q?.explanation && (
              <div className="host-explanation">
                <strong>Host Note / Explanation: </strong>
                {q.explanation}
              </div>
            )}
          </div>

          {/* Main Action Deck */}
          <div className="host-actions-deck">
            {status === "LOBBY" ? (
              <button
                type="button"
                className="host-btn host-btn--primary"
                style={{ gridColumn: "span 3" }}
                onClick={() => startGame(nameInput)}
              >
                ▶ START GAME WITH {nameInput.toUpperCase()}
              </button>
            ) : (
              <>
                {/* Timer Control */}
                {timer.isPaused ? (
                  <button
                    type="button"
                    className="host-btn host-btn--primary"
                    onClick={resumeTimer}
                  >
                    ▶ RESUME TIMER
                  </button>
                ) : (
                  <button
                    type="button"
                    className="host-btn host-btn--secondary"
                    onClick={pauseTimer}
                    disabled={!timer.isTimerRunning}
                  >
                    ⏸ PAUSE TIMER
                  </button>
                )}

                <button
                  type="button"
                  className="host-btn host-btn--secondary"
                  onClick={() => addTime(15)}
                >
                  +15s EXTRA TIME
                </button>

                {/* Lock In Answer */}
                <button
                  type="button"
                  className="host-btn host-btn--primary"
                  onClick={lockAnswer}
                  disabled={!interaction.selectedOption || status === "ANSWER_LOCKED" || status === "REVEALED"}
                >
                  🔒 LOCK ANSWER ({interaction.selectedOption || "--"})
                </button>

                {/* Reveal Answer */}
                <button
                  type="button"
                  className="host-btn host-btn--success"
                  onClick={revealAnswer}
                  disabled={status !== "ANSWER_LOCKED" && status !== "ANSWER_SELECTED"}
                >
                  ✨ REVEAL OUTCOME
                </button>

                {/* Question Progression */}
                <button
                  type="button"
                  className="host-btn host-btn--secondary"
                  onClick={previousQuestion}
                  disabled={gameState.currentQuestionIndex <= 0}
                >
                  ◀ PREV QUESTION
                </button>

                <button
                  type="button"
                  className="host-btn host-btn--primary"
                  onClick={nextQuestion}
                >
                  NEXT QUESTION ▶
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="host-side-col">
          {/* Contestant Management */}
          <div className="host-sidebar-panel">
            <div className="host-sidebar-panel__title">HOT SEAT CONTESTANT</div>
            <form onSubmit={handleUpdateName} style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                className="host-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter Contestant Name"
              />
              <button type="submit" className="host-btn-sm">
                SET
              </button>
            </form>
          </div>

          {/* Lifelines Control */}
          <div className="host-sidebar-panel">
            <div className="host-sidebar-panel__title">LIFELINES DECK</div>
            <div className="host-lifelines-control">
              {/* 50:50 */}
              <div className="host-lifeline-row">
                <div>
                  <strong>50:50</strong>
                  <div style={{ fontSize: "0.7rem", color: "var(--ink-500)" }}>
                    {lifelines.fiftyFifty?.used ? "Already Used" : "Available"}
                  </div>
                </div>
                <button
                  type="button"
                  className="host-btn-sm"
                  onClick={() => triggerLifeline("50:50")}
                  disabled={lifelines.fiftyFifty?.used || status === "LOBBY"}
                >
                  TRIGGER
                </button>
              </div>

              {/* Ask the Host */}
              <div className="host-lifeline-row">
                <div>
                  <strong>Ask the Host</strong>
                  <div style={{ fontSize: "0.7rem", color: "var(--ink-500)" }}>
                    {lifelines.askHost?.used ? (lifelines.askHost?.active ? "Active Now" : "Used") : "Available"}
                  </div>
                </div>
                {lifelines.askHost?.active ? (
                  <button
                    type="button"
                    className="host-btn-sm"
                    style={{ background: "#10b981", color: "#000" }}
                    onClick={() => resolveLifeline("askHost")}
                  >
                    RESOLVE &amp; RESUME
                  </button>
                ) : (
                  <button
                    type="button"
                    className="host-btn-sm"
                    onClick={() => triggerLifeline("askHost")}
                    disabled={lifelines.askHost?.used || status === "LOBBY"}
                  >
                    TRIGGER
                  </button>
                )}
              </div>

              {/* Audience Poll */}
              <div className="host-lifeline-row">
                <div>
                  <strong>Audience Poll</strong>
                  <div style={{ fontSize: "0.7rem", color: "var(--ink-500)" }}>
                    {lifelines.audiencePoll?.used ? (lifelines.audiencePoll?.active ? "Displaying Poll" : "Used") : "Available"}
                  </div>
                </div>
                {lifelines.audiencePoll?.active ? (
                  <button
                    type="button"
                    className="host-btn-sm"
                    style={{ background: "#10b981", color: "#000" }}
                    onClick={() => resolveLifeline("audiencePoll")}
                  >
                    CLOSE POLL &amp; RESUME
                  </button>
                ) : (
                  <button
                    type="button"
                    className="host-btn-sm"
                    onClick={() => triggerLifeline("audiencePoll")}
                    disabled={lifelines.audiencePoll?.used || status === "LOBBY"}
                  >
                    TRIGGER
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question Jumper */}
          <div className="host-sidebar-panel">
            <div className="host-sidebar-panel__title">QUESTION JUMP</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "0.35rem",
              }}
            >
              {gameState.ladder?.map((lvl) => (
                <button
                  key={lvl.index}
                  type="button"
                  className="host-btn-sm"
                  style={{
                    padding: "0.4rem 0.2rem",
                    textAlign: "center",
                    background: lvl.isCurrent ? "var(--gold-500)" : undefined,
                    color: lvl.isCurrent ? "#000" : undefined,
                  }}
                  onClick={() => jumpQuestion(lvl.index)}
                >
                  Q{lvl.questionNumber}
                </button>
              ))}
            </div>
          </div>

          {/* Reset / Emergency Restart */}
          <div className="host-sidebar-panel">
            <div className="host-sidebar-panel__title">EMERGENCY RESET</div>
            <button
              type="button"
              className="host-btn host-btn--danger"
              style={{ width: "100%" }}
              onClick={() => {
                if (window.confirm("Are you sure you want to reset the game to LOBBY?")) {
                  resetGame();
                }
              }}
            >
              ⚠️ RESET GAME TO LOBBY
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
