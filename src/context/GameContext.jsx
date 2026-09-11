import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { DEFAULT_QUESTIONS } from "../data/defaultQuestions";

const GameContext = createContext(null);

const BROADCAST_CHANNEL_NAME = "kbcp_studio_bus";

export function GameProvider({ children, initialRole = "stage" }) {
  const [role, setRole] = useState(initialRole);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(30);

  const socketRef = useRef(null);
  const broadcastRef = useRef(null);

  // Initialize BroadcastChannel & Socket.IO
  useEffect(() => {
    // 1. BroadcastChannel for instant local multi-window synchronization
    if (typeof window !== "undefined" && window.BroadcastChannel) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data?.type === "STATE_SYNC") {
          setGameState(event.data.state);
        }
      };
    }

    // 2. Socket.IO connection
    const socketUrl =
      window.location.port === "3001"
        ? window.location.origin
        : `http://${window.location.hostname}:3001`;

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("register:role", role);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("state:update", (serverState) => {
      setGameState(serverState);
      // Mirror state to local BroadcastChannel
      if (broadcastRef.current) {
        broadcastRef.current.postMessage({ type: "STATE_SYNC", state: serverState });
      }
    });

    return () => {
      socket.disconnect();
      if (broadcastRef.current) {
        broadcastRef.current.close();
      }
    };
  }, [role]);

  // Update server if role changes
  const updateRole = (newRole) => {
    setRole(newRole);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("register:role", newRole);
    }
  };

  // High-precision client-side countdown synchronized to server questionEndsAt
  useEffect(() => {
    if (!gameState) return;

    const timer = gameState.timer;
    if (!timer) return;

    if (timer.isPaused) {
      setRemainingSeconds(Math.ceil((timer.remainingMs || 0) / 1000));
      return;
    }

    if (!timer.isTimerRunning || !timer.questionEndsAt) {
      setRemainingSeconds(timer.remainingSeconds || timer.timeLimit || 30);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, timer.questionEndsAt - now);
      const secs = Math.ceil(diff / 1000);
      setRemainingSeconds(secs);
    }, 100);

    return () => clearInterval(interval);
  }, [gameState]);

  // Command emitters to backend
  const emit = (event, ...args) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, ...args);
    } else {
      console.warn("Socket not connected, action queued locally");
    }
  };

  // Public control API
  const startGame = (contestantName) => emit("host:start_game", contestantName);
  const selectOption = (optionId) => {
    if (role === "host") {
      emit("host:select_option", optionId);
    } else {
      emit("stage:select_option", optionId);
    }
  };
  const lockAnswer = () => emit("host:lock_answer");
  const revealAnswer = () => emit("host:reveal_answer");
  const nextQuestion = () => emit("host:next_question");
  const previousQuestion = () => emit("host:previous_question");
  const jumpQuestion = (index) => emit("host:jump_question", index);
  const startTimer = () => emit("host:start_timer");
  const pauseTimer = () => emit("host:pause_timer");
  const resumeTimer = () => emit("host:resume_timer");
  const addTime = (seconds = 15) => emit("host:add_time", seconds);
  const triggerLifeline = (type) => emit("host:trigger_lifeline", type);
  const resolveLifeline = (type) => emit("host:resolve_lifeline", type);
  const resetGame = () => emit("host:reset_game");
  const setContestant = (name) => emit("host:set_contestant", name);

  // Fallback state if server is not yet up (e.g. offline testing)
  const effectiveState = gameState || {
    status: "LOBBY",
    currentQuestionIndex: 0,
    totalQuestions: DEFAULT_QUESTIONS.length,
    contestantName: "Contestant",
    currentPrize: "₹0",
    question: {
      ...DEFAULT_QUESTIONS[0],
      totalQuestions: DEFAULT_QUESTIONS.length,
    },
    ladder: DEFAULT_QUESTIONS.map((q, idx) => ({
      index: idx,
      questionNumber: q.questionNumber,
      prizeValue: q.prizeValue,
      milestone: q.milestone,
      isCurrent: idx === 0,
      isCompleted: false,
    })),
    timer: {
      timeLimit: 30,
      remainingSeconds: 30,
      isTimerRunning: false,
      isPaused: false,
    },
    interaction: {
      selectedOption: null,
      lockedOption: null,
      isCorrect: null,
      eliminatedOptions: [],
    },
    lifelines: {
      fiftyFifty: { used: false, active: false },
      askHost: { used: false, active: false },
      audiencePoll: { used: false, active: false, results: null },
    },
  };

  return (
    <GameContext.Provider
      value={{
        role,
        setRole: updateRole,
        connected,
        gameState: effectiveState,
        remainingSeconds,
        // Host actions
        startGame,
        selectOption,
        lockAnswer,
        revealAnswer,
        nextQuestion,
        previousQuestion,
        jumpQuestion,
        startTimer,
        pauseTimer,
        resumeTimer,
        addTime,
        triggerLifeline,
        resolveLifeline,
        resetGame,
        setContestant,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return ctx;
}
