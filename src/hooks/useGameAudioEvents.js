import { useEffect, useRef } from "react";

/**
 * Event hook system for TV game show audio cues.
 * Listeners can be hooked into Web Audio API, HTML5 Audio, or sound boards.
 */
export function useGameAudioEvents(gameState, remainingSeconds, callbacks = {}) {
  const prevStatusRef = useRef(gameState?.status);
  const prevQuestionRef = useRef(gameState?.currentQuestionIndex);
  const prevLockedRef = useRef(gameState?.interaction?.lockedOption);
  const prevSecondsRef = useRef(remainingSeconds);

  useEffect(() => {
    if (!gameState) return;

    const currentStatus = gameState.status;
    const prevStatus = prevStatusRef.current;
    const currentQ = gameState.currentQuestionIndex;
    const prevQ = prevQuestionRef.current;
    const currentLocked = gameState.interaction?.lockedOption;
    const _prevLocked = prevLockedRef.current;

    // 1. Question Started
    if (currentStatus === "QUESTION_ACTIVE" && (prevStatus !== "QUESTION_ACTIVE" || currentQ !== prevQ)) {
      callbacks.onQuestionStart?.(gameState.question);
    }

    // 2. Answer Locked
    if (currentStatus === "ANSWER_LOCKED" && prevStatus !== "ANSWER_LOCKED") {
      callbacks.onAnswerLocked?.(currentLocked);
    }

    // 3. Answer Revealed
    if (currentStatus === "REVEALED" && prevStatus !== "REVEALED") {
      if (gameState.interaction?.isCorrect) {
        callbacks.onCorrectAnswer?.();
      } else {
        callbacks.onWrongAnswer?.();
      }
    }

    // 4. Timeout
    if (currentStatus === "TIMEOUT" && prevStatus !== "TIMEOUT") {
      callbacks.onTimeout?.();
    }

    // 5. Lifeline Triggered
    if (currentStatus === "LIFELINE_ACTIVE" && prevStatus !== "LIFELINE_ACTIVE") {
      callbacks.onLifelineActivated?.();
    }

    // 6. Game Start / End
    if (currentStatus === "GAME_STARTING" && prevStatus !== "GAME_STARTING") {
      callbacks.onGameStart?.();
    }
    if (currentStatus === "FINISHED" && prevStatus !== "FINISHED") {
      callbacks.onGameFinish?.();
    }

    prevStatusRef.current = currentStatus;
    prevQuestionRef.current = currentQ;
    prevLockedRef.current = currentLocked;
  }, [gameState, callbacks]);

  // Timer Tick & Warning
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
  }, [remainingSeconds, gameState, callbacks]);
}
