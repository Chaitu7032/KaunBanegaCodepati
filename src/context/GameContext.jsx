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
    // 1. BroadcastChannel for offline fallback multi-window synchronization
    if (typeof window !== "undefined" && window.BroadcastChannel) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastRef.current = bc;
      bc.onmessage = (event) => {
        // Only accept BroadcastChannel if not connected to live server socket
        if (!socketRef.current?.connected && event.data?.type === "STATE_SYNC") {
          setGameState(event.data.state);
        }
      };
    }

    // 2. Socket.IO connection
    // If VITE_SERVER_URL environment variable is set (e.g. on Vercel), connect to deployed backend.
    // Otherwise, connect to port 3001 on local machine / LAN.
    const socketUrl =
      import.meta.env.VITE_SERVER_URL ||
      (window.location.port === "3001"
        ? window.location.origin
        : `http://${window.location.hostname}:3001`);

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

  const clockOffsetRef = useRef(0);
  const lastSecRef = useRef(null);

  // Synchronize clock offset on every state update from server
  useEffect(() => {
    if (gameState?.serverTime) {
      clockOffsetRef.current = gameState.serverTime - Date.now();
    }
  }, [gameState?.serverTime]);

  // Continuous, rock-solid countdown timer
  useEffect(() => {
    const timer = gameState?.timer;
    const status = gameState?.status;

    if (!timer || status === "LOBBY" || status === "FINISHED") {
      const defaultSecs = timer?.timeLimit || 30;
      setRemainingSeconds(defaultSecs);
      lastSecRef.current = defaultSecs;
      return;
    }

    if (status === "TIMEOUT") {
      setRemainingSeconds(0);
      lastSecRef.current = 0;
      return;
    }

    // Paused state: cleanly freeze at exact remaining seconds
    if (timer.isPaused) {
      const pausedSecs = Math.max(0, Math.ceil((timer.remainingMs || 0) / 1000));
      setRemainingSeconds(pausedSecs);
      lastSecRef.current = pausedSecs;
      return;
    }

    // Stopped/Not running state
    if (!timer.isTimerRunning || !timer.questionEndsAt) {
      const initSecs = timer.remainingSeconds || timer.timeLimit || 30;
      setRemainingSeconds(initSecs);
      lastSecRef.current = initSecs;
      return;
    }

    // Running state: calculate from synchronized server clock
    const updateCountdown = () => {
      const syncedNow = Date.now() + clockOffsetRef.current;
      const remainingMs = Math.max(0, timer.questionEndsAt - syncedNow);
      const currentSec = Math.ceil(remainingMs / 1000);

      if (currentSec !== lastSecRef.current) {
        lastSecRef.current = currentSec;
        setRemainingSeconds(currentSec);
      }
    };

    // Run immediately once
    updateCountdown();

    // High frequency interval (50ms) to ensure zero missed seconds and continuous ticking
    const interval = setInterval(updateCountdown, 50);

    return () => clearInterval(interval);
  }, [
    gameState?.status,
    gameState?.timer?.isTimerRunning,
    gameState?.timer?.isPaused,
    gameState?.timer?.questionEndsAt,
    gameState?.timer?.timeLimit,
    gameState?.timer?.remainingMs,
  ]);

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
  const restartTimer = () => emit("host:restart_timer");
  const pauseTimer = () => emit("host:pause_timer");
  const resumeTimer = () => emit("host:resume_timer");
  const addTime = (seconds = 15) => emit("host:add_time", seconds);
  const triggerLifeline = (type) => emit("host:trigger_lifeline", type);
  const resolveLifeline = (type) => emit("host:resolve_lifeline", type);
  const resetGame = () => emit("host:reset_game");
  const setContestant = (name) => emit("host:set_contestant", name);
  const setQuestionSet = (setId) => emit("host:set_question_set", setId);
  const callNextContestant = () => emit("host:call_next_contestant");
  const switchContestant = (index) => emit("host:switch_contestant", index);
  const updateRoster = (roster) => emit("host:update_roster", roster);
  const walkAway = () => emit("host:walk_away");

  // Fallback state if server is not yet up (e.g. offline testing)
  const defaultContestants = [
    { id: 1, rank: 1, name: "Contestant 1", status: "WAITING", finalPrize: "₹0", outAtQuestion: null, setId: 1 },
    { id: 2, rank: 2, name: "Contestant 2", status: "WAITING", finalPrize: "₹0", outAtQuestion: null, setId: 2 },
    { id: 3, rank: 3, name: "Contestant 3", status: "WAITING", finalPrize: "₹0", outAtQuestion: null, setId: 3 },
    { id: 4, rank: 4, name: "Contestant 4", status: "WAITING", finalPrize: "₹0", outAtQuestion: null, setId: 4 },
    { id: 5, rank: 5, name: "Contestant 5", status: "WAITING", finalPrize: "₹0", outAtQuestion: null, setId: 5 },
  ];

  const effectiveState = gameState || {
    status: "LOBBY",
    currentQuestionIndex: 0,
    totalQuestions: DEFAULT_QUESTIONS.length,
    contestantName: "Contestant",
    currentPrize: "₹0",
    activeSetId: 1,
    availableSets: [1, 2, 3, 4, 5],
    contestants: defaultContestants,
    activeContestantIndex: 0,
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
