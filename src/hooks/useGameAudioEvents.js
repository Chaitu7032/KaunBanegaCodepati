import { useEffect, useRef } from "react";
import { soundManager } from "../utils/soundManager";

/**
 * Event hook system for TV game show audio cues and live timer-synchronized sound effects.
 */
export function useGameAudioEvents(gameState, remainingSeconds, callbacks = {}) {
  const prevStatusRef = useRef(gameState?.status);
  const prevQuestionRef = useRef(gameState?.currentQuestionIndex);
  const prevLockedRef = useRef(gameState?.interaction?.lockedOption);
  const prevTimerPausedRef = useRef(gameState?.timer?.isPaused);
  const prevTimerRunningRef = useRef(gameState?.timer?.isTimerRunning);
  const prevSecondsRef = useRef(remainingSeconds);

  useEffect(() => {
    if (!gameState) return;

    const currentStatus = gameState.status;
    const prevStatus = prevStatusRef.current;
    const currentQ = gameState.currentQuestionIndex;
    const prevQ = prevQuestionRef.current;
    const currentLocked = gameState.interaction?.lockedOption;
    const timer = gameState.timer || {};
    const timeLimit = timer.timeLimit || 45;

    // 1. Question Started or Switched -> ALWAYS starts countdown from 0:00
    if (currentStatus === "QUESTION_ACTIVE") {
      const isNewQuestion = prevStatus !== "QUESTION_ACTIVE" || currentQ !== prevQ;
      if (isNewQuestion) {
        soundManager.stopAll();
        soundManager.playCountdown(timeLimit);
        callbacks.onQuestionStart?.(gameState.question);
      } else {
        // Pause/resume state within the same active question
        if (timer.isPaused && !prevTimerPausedRef.current) {
          soundManager.pauseCountdown();
        } else if (!timer.isPaused && prevTimerPausedRef.current && timer.isTimerRunning) {
          soundManager.resumeCountdown(timeLimit, remainingSeconds);
        }
      }
    }

    // 2. Answer Locked -> Lock-In SFX then Suspense Loop
    if (currentStatus === "ANSWER_LOCKED" && prevStatus !== "ANSWER_LOCKED") {
      soundManager.playLockIn();
      callbacks.onAnswerLocked?.(currentLocked);
    }

    // 3. Answer Revealed -> Right or Wrong Fanfare (instantly cuts suspense)
    if (currentStatus === "REVEALED" && prevStatus !== "REVEALED") {
      const isCorrect = Boolean(gameState.interaction?.isCorrect);
      soundManager.playReveal(isCorrect);
      if (isCorrect) {
        callbacks.onCorrectAnswer?.();
      } else {
        callbacks.onWrongAnswer?.();
      }
    }

    // 4. Contestant Eliminated (e.g. from wrong answer)
    if (currentStatus === "ELIMINATED" && prevStatus !== "ELIMINATED") {
      if (prevStatus === "ANSWER_LOCKED" || prevStatus === "ANSWER_SELECTED" || prevStatus === "QUESTION_ACTIVE") {
        soundManager.playReveal(false);
        callbacks.onWrongAnswer?.();
      }
    }

    // 5. Timeout
    if (currentStatus === "TIMEOUT" && prevStatus !== "TIMEOUT") {
      soundManager.playTimeout();
      callbacks.onTimeout?.();
    }

    // 6. Lifeline Triggered -> Pause countdown music
    if (currentStatus === "LIFELINE_ACTIVE" && prevStatus !== "LIFELINE_ACTIVE") {
      soundManager.pauseCountdown();
      callbacks.onLifelineActivated?.();
    }

    // 7. Terminal states (Lobby, Walked Away, Finished) -> Stop all audio
    if (
      (currentStatus === "LOBBY" && prevStatus !== "LOBBY") ||
      (currentStatus === "WALKED_AWAY" && prevStatus !== "WALKED_AWAY") ||
      (currentStatus === "FINISHED" && prevStatus !== "FINISHED")
    ) {
      soundManager.stopAll();
      if (currentStatus === "FINISHED") {
        callbacks.onGameFinish?.();
      }
    }

    prevStatusRef.current = currentStatus;
    prevQuestionRef.current = currentQ;
    prevLockedRef.current = currentLocked;
    prevTimerPausedRef.current = timer.isPaused;
    prevTimerRunningRef.current = timer.isTimerRunning;
  }, [
    gameState?.status,
    gameState?.currentQuestionIndex,
    gameState?.interaction?.lockedOption,
    gameState?.interaction?.isCorrect,
    gameState?.timer?.isPaused,
    gameState?.timer?.isTimerRunning,
    gameState?.timer?.timeLimit,
  ]);

  // Separate Timer Tick & Warning effect (doesn't trigger question state logic)
  useEffect(() => {
    if (!gameState?.timer?.isTimerRunning) return;
    if (remainingSeconds === prevSecondsRef.current) return;

    callbacks.onTimerTick?.(remainingSeconds);

    if (remainingSeconds === 10) {
      callbacks.onTimerWarning?.(10);
    } else if (remainingSeconds === 5) {
      callbacks.onTimerCritical?.(5);
    }

    prevSecondsRef.current = remainingSeconds;
  }, [remainingSeconds, gameState?.timer?.isTimerRunning]);
}
