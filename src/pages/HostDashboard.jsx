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
    startTimer,
    restartTimer,
    pauseTimer,
    resumeTimer,
    addTime,
    triggerLifeline,
    resolveLifeline,
    resetGame,
    setContestant,
    setQuestionSet,
    callNextContestant,
    switchContestant,
    updateRoster,
    walkAway,
  } = useGame();

  const [nameInput, setNameInput] = useState(gameState.contestantName || "Contestant");
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [rosterDraft, setRosterDraft] = useState([]);

  // Ensure role is registered as host
  useEffect(() => {
    setRole("host");
  }, [setRole]);

  useEffect(() => {
    if (gameState.contestantName) {
      setNameInput(gameState.contestantName);
    }
  }, [gameState.contestantName]);

  useEffect(() => {
    if (gameState.contestants) {
      setRosterDraft(gameState.contestants);
    }
  }, [gameState.contestants]);


  const handleSaveRoster = (e) => {
    e.preventDefault();
    updateRoster(rosterDraft);
    setShowRosterModal(false);
  };

  const handleRosterNameChange = (idx, newName) => {
    setRosterDraft((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, name: newName } : c))
    );
  };

  const handleRosterSetChange = (idx, newSetId) => {
    setRosterDraft((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, setId: Number(newSetId) } : c))
    );
  };

  const status = gameState.status;
  const q = gameState.question;
  const timer = gameState.timer || {};
  const interaction = gameState.interaction || {};
  const lifelines = gameState.lifelines || {};
  const contestants = gameState.contestants || [];
  const activeIdx = gameState.activeContestantIndex ?? 0;
  const activeContestant = contestants[activeIdx] || { rank: 1, name: gameState.contestantName };
  const nextWaiting = contestants.find((c, idx) => idx > activeIdx && c.status === "WAITING");

  const isEliminated = status === "ELIMINATED" || status === "TIMEOUT";
  const isWalkedAway = status === "WALKED_AWAY";

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

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Question Set Switcher Quick Badges */}
          <div className="host-set-selector">
            <span className="host-set-selector__label">ACTIVE SET:</span>
            {[1, 2, 3, 4, 5].map((sId) => (
              <button
                key={sId}
                type="button"
                className={`host-set-btn ${gameState.activeSetId === sId ? "host-set-btn--active" : ""}`}
                onClick={() => setQuestionSet(sId)}
                title={`Switch to Question Set ${sId}`}
              >
                SET {sId}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="host-btn-sm host-btn--gold"
            onClick={() => setShowLeaderboardModal(true)}
          >
            🏆 STANDINGS
          </button>

          <button
            type="button"
            className="host-btn-sm"
            onClick={() => setShowRosterModal(true)}
          >
            👥 EDIT TOP 5
          </button>

          <div className="host-connection">
            LINK:{" "}
            <span className={connected ? "host-connection--on" : "host-connection--off"}>
              {connected ? "● LIVE" : "○ OFFLINE"}
            </span>
          </div>

          <a
            href="/play"
            target="_blank"
            rel="noopener noreferrer"
            className="host-btn-sm"
            style={{ textDecoration: "none" }}
          >
            STAGE SCREEN ↗
          </a>
        </div>
      </header>

      {/* Handover Alert Banner: Elimination or Walk Away */}
      {(isEliminated || isWalkedAway) && (
        <div className={`host-alert-banner ${isEliminated ? "host-alert-banner--danger" : "host-alert-banner--walk"}`}>
          <div className="host-alert-banner__content">
            <div className="host-alert-banner__icon">{isEliminated ? "❌" : "💼"}</div>
            <div>
              <h3>
                {isEliminated ? "CONTESTANT ELIMINATED FROM HOT SEAT" : "CONTESTANT WALKED AWAY WITH PRIZE"}
              </h3>
              <p>
                <strong>{activeContestant.name}</strong> (Participant #{activeContestant.rank}) finished their run with{" "}
                <span className="gold-text" style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                  {gameState.currentPrize || "₹0"}
                </span>
                {isEliminated ? " (Guaranteed Milestone Prize)" : " (Voluntarily banked prize)"}.
              </p>
            </div>
          </div>

          <div className="host-alert-banner__actions">
            {nextWaiting ? (
              <button
                type="button"
                className="host-btn host-btn--primary host-btn--glow"
                onClick={() => callNextContestant()}
              >
                CALL NEXT CONTESTANT: #{nextWaiting.rank} {nextWaiting.name.toUpperCase()} (SET {nextWaiting.setId || nextWaiting.rank}) ▶
              </button>
            ) : (
              <button
                type="button"
                className="host-btn host-btn--gold"
                onClick={() => setShowLeaderboardModal(true)}
              >
                ALL 5 COMPLETED — VIEW FINAL STANDINGS 🏆
              </button>
            )}
          </div>
        </div>
      )}

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
              <div className="host-card__label">HOT SEAT CONTESTANT</div>
              <div className="host-card__value" style={{ color: "var(--gold-300)" }}>
                #{activeContestant.rank} {activeContestant.name}
              </div>
            </div>

            <div className="host-card">
              <div className="host-card__label">CURRENT QUESTION</div>
              <div className="host-card__value">
                {q ? `Q${q.questionNumber} of ${q.totalQuestions || 15} (Set ${gameState.activeSetId || 1})` : "N/A"}
              </div>
            </div>

            <div className="host-card">
              <div className="host-card__label">
                TIME REMAINING {q?.timeLimit ? `(${q.timeLimit}s limit)` : ""}
              </div>
              <div
                className="host-card__value"
                style={{
                  color: remainingSeconds <= 5 ? "#ef4444" : remainingSeconds <= 10 ? "#f59e0b" : "#fff",
                }}
              >
                {status === "TIMEOUT"
                  ? "TIMEOUT"
                  : remainingSeconds >= 60
                  ? `${Math.floor(remainingSeconds / 60)}m ${String(remainingSeconds % 60).padStart(2, "0")}s (${remainingSeconds}s)`
                  : `${remainingSeconds}s`}
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
                QUESTION PREVIEW (SET {gameState.activeSetId || 1})
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--gold-300)" }}>
                {q?.category ? `${q.category} • ` : ""}ROUND {q?.round || 1} &bull; VALUE: {q?.prizeValue || "₹50"}
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
                const isEliminatedOpt = interaction.eliminatedOptions?.includes(opt.id);

                let optClass = "host-option-item";
                if (isCorrectOpt) optClass += " host-option-item--correct";
                if (isSelected) optClass += " host-option-item--selected";
                if (isLocked) optClass += " host-option-item--locked";
                if (isEliminatedOpt) optClass += " host-option-item--eliminated";

                return (
                  <div
                    key={opt.id}
                    className={optClass}
                    onClick={() => !isEliminatedOpt && selectOption(opt.id)}
                    title={isEliminatedOpt ? "Eliminated by 50:50" : "Click to select this option on behalf of contestant"}
                  >
                    <span className="host-option-item__badge">{opt.id}</span>
                    <span>{opt.text}</span>
                    {isCorrectOpt && <span className="host-correct-tag">CORRECT</span>}
                    {isEliminatedOpt && <span className="host-eliminated-tag">50:50 OUT</span>}
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
                ▶ START HOT SEAT WITH #{activeContestant.rank} {activeContestant.name.toUpperCase()} (SET {gameState.activeSetId || 1})
              </button>
            ) : (
              <>
                {/* Timer Control */}
                {!timer.isTimerRunning && !timer.isPaused ? (
                  <button
                    type="button"
                    className="host-btn host-btn--primary"
                    onClick={startTimer}
                    disabled={isEliminated || isWalkedAway || status === "FINISHED"}
                  >
                    ▶ START TIMER
                  </button>
                ) : timer.isPaused ? (
                  <button
                    type="button"
                    className="host-btn host-btn--primary"
                    onClick={resumeTimer}
                    disabled={isEliminated || isWalkedAway || status === "FINISHED"}
                  >
                    ▶ RESUME TIMER
                  </button>
                ) : (
                  <button
                    type="button"
                    className="host-btn host-btn--secondary"
                    onClick={pauseTimer}
                  >
                    ⏸ PAUSE TIMER
                  </button>
                )}

                <button
                  type="button"
                  className="host-btn host-btn--secondary"
                  onClick={restartTimer}
                  title="Reset countdown back to full question time"
                  disabled={isEliminated || isWalkedAway || status === "FINISHED"}
                >
                  🔄 RESTART TIMER
                </button>

                <button
                  type="button"
                  className="host-btn host-btn--secondary"
                  onClick={() => addTime(15)}
                  disabled={isEliminated || isWalkedAway || status === "FINISHED"}
                >
                  +15s EXTRA TIME
                </button>

                {/* Lock In Answer */}
                <button
                  type="button"
                  className="host-btn host-btn--primary"
                  onClick={lockAnswer}
                  disabled={!interaction.selectedOption || status === "ANSWER_LOCKED" || status === "REVEALED" || isEliminated || isWalkedAway}
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

                {/* Walk Away Button */}
                <button
                  type="button"
                  className="host-btn host-btn--walk"
                  onClick={() => {
                    if (window.confirm(`Are you sure contestant ${activeContestant.name} wants to walk away with their banked prize?`)) {
                      walkAway();
                    }
                  }}
                  disabled={status === "ANSWER_LOCKED" || status === "REVEALED" || isEliminated || isWalkedAway || status === "FINISHED"}
                  title="Contestant voluntarily quits to secure current money"
                >
                  💼 WALK AWAY
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
                  disabled={isEliminated || isWalkedAway}
                >
                  NEXT QUESTION ▶
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="host-side-col">
          {/* Top 5 Contestant Queue Panel */}
          <div className="host-sidebar-panel">
            <div className="host-sidebar-panel__header">
              <div className="host-sidebar-panel__title">TOP 5 HOT SEAT QUEUE</div>
              <button
                type="button"
                className="host-btn-tiny"
                onClick={() => setShowRosterModal(true)}
              >
                EDIT
              </button>
            </div>

            <div className="host-roster-list">
              {contestants.map((c, idx) => {
                const isActive = idx === activeIdx;
                let statusBadgeClass = "host-roster-badge";
                if (c.status === "IN_HOT_SEAT") statusBadgeClass += " host-roster-badge--active";
                else if (c.status === "ELIMINATED") statusBadgeClass += " host-roster-badge--out";
                else if (c.status === "WALKED_AWAY") statusBadgeClass += " host-roster-badge--walk";
                else if (c.status === "COMPLETED") statusBadgeClass += " host-roster-badge--done";

                return (
                  <div
                    key={c.id || idx}
                    className={`host-roster-item ${isActive ? "host-roster-item--active" : ""}`}
                  >
                    <div className="host-roster-item__left">
                      <span className="host-roster-rank">#{c.rank}</span>
                      <div className="host-roster-info">
                        <strong>{c.name}</strong>
                        <span className="host-roster-sub">
                          Set {c.setId || c.rank} &bull; {c.finalPrize || "₹0"}
                        </span>
                      </div>
                    </div>

                    <div className="host-roster-item__right">
                      <span className={statusBadgeClass}>{c.status}</span>
                      {!isActive && (
                        <button
                          type="button"
                          className="host-btn-tiny host-btn-tiny--load"
                          onClick={() => switchContestant(idx)}
                          title={`Switch Hot Seat to ${c.name}`}
                        >
                          LOAD
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
                  disabled={lifelines.fiftyFifty?.used || status === "LOBBY" || isEliminated || isWalkedAway}
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
                    disabled={lifelines.askHost?.used || status === "LOBBY" || isEliminated || isWalkedAway}
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
                    disabled={lifelines.audiencePoll?.used || status === "LOBBY" || isEliminated || isWalkedAway}
                  >
                    TRIGGER
                  </button>
                )}
              </div>

              {/* Live Host Preview for Audience Poll Results */}
              {lifelines.audiencePoll?.active && lifelines.audiencePoll?.results && (
                <div className="host-poll-results-preview">
                  <span className="host-poll-preview-title">AUDIENCE VOTES BREAKDOWN:</span>
                  <div className="host-poll-preview-grid">
                    {["A", "B", "C", "D"].map((opt) => (
                      <div key={opt} className="host-poll-preview-item">
                        <strong>{opt}:</strong> {lifelines.audiencePoll.results[opt] || 0}%
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Question Jumper */}
          <div className="host-sidebar-panel">
            <div className="host-sidebar-panel__title">QUESTION JUMP (SET {gameState.activeSetId || 1})</div>
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
            <div className="host-sidebar-panel__title">RESET CONTROLS</div>
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

      {/* MODAL: EDIT TOP 5 ROSTER */}
      {showRosterModal && (
        <div className="host-modal-overlay">
          <div className="host-modal">
            <div className="host-modal__header">
              <h2>MANAGE TOP 5 PARTICIPANTS &amp; SETS</h2>
              <button
                type="button"
                className="host-btn-icon"
                onClick={() => setShowRosterModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveRoster}>
              <p style={{ color: "var(--ink-400)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Update participant names from your preliminary / Mentimeter results and designate their Question Set (1–5).
              </p>
              <div className="host-modal-roster-table">
                <div className="host-modal-roster-row host-modal-roster-row--head">
                  <span>RANK</span>
                  <span>CONTESTANT NAME</span>
                  <span>ASSIGNED SET</span>
                  <span>STATUS</span>
                </div>
                {rosterDraft.map((c, idx) => (
                  <div key={idx} className="host-modal-roster-row">
                    <span style={{ fontWeight: "bold" }}>#{c.rank || idx + 1}</span>
                    <input
                      type="text"
                      className="host-input"
                      value={c.name}
                      onChange={(e) => handleRosterNameChange(idx, e.target.value)}
                      placeholder={`Contestant ${idx + 1}`}
                      required
                    />
                    <select
                      className="host-input"
                      value={c.setId || idx + 1}
                      onChange={(e) => handleRosterSetChange(idx, e.target.value)}
                    >
                      <option value={1}>Set 1</option>
                      <option value={2}>Set 2</option>
                      <option value={3}>Set 3</option>
                      <option value={4}>Set 4</option>
                      <option value={5}>Set 5</option>
                    </select>
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-400)" }}>{c.status}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
                <button
                  type="button"
                  className="host-btn host-btn--secondary"
                  onClick={() => setShowRosterModal(false)}
                >
                  CANCEL
                </button>
                <button type="submit" className="host-btn host-btn--primary">
                  SAVE ROSTER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TOP 5 LIVE STANDINGS / LEADERBOARD */}
      {showLeaderboardModal && (
        <div className="host-modal-overlay">
          <div className="host-modal" style={{ maxWidth: "700px" }}>
            <div className="host-modal__header">
              <h2>🏆 TOP 5 PARTICIPANTS STANDINGS</h2>
              <button
                type="button"
                className="host-btn-icon"
                onClick={() => setShowLeaderboardModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="host-leaderboard-table">
              <div className="host-leaderboard-row host-leaderboard-row--head">
                <span>RANK</span>
                <span>CONTESTANT</span>
                <span>SET</span>
                <span>PROGRESS</span>
                <span>FINAL PRIZE</span>
                <span>STATUS</span>
              </div>
              {contestants.map((c, idx) => (
                <div
                  key={c.id || idx}
                  className={`host-leaderboard-row ${idx === activeIdx ? "host-leaderboard-row--active" : ""}`}
                >
                  <span style={{ fontWeight: "bold" }}>#{c.rank}</span>
                  <strong>{c.name}</strong>
                  <span>Set {c.setId || c.rank}</span>
                  <span>{c.outAtQuestion ? `Q${c.outAtQuestion}` : "--"}</span>
                  <span className="gold-text" style={{ fontWeight: "bold" }}>
                    {c.finalPrize || "₹0"}
                  </span>
                  <span className="host-roster-badge">{c.status}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
              <button
                type="button"
                className="host-btn host-btn--primary"
                onClick={() => setShowLeaderboardModal(false)}
              >
                CLOSE STANDINGS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
