import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { GameEngine } from "./engine/gameEngine.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const engine = new GameEngine();

// Helper to broadcast state to all connected sockets
function broadcastState() {
  const sockets = io.sockets.sockets;
  for (const [_, socket] of sockets) {
    const role = socket.data?.role || "stage";
    socket.emit("state:update", engine.getState(role));
  }
}

// Server ticker for timer expiration
setInterval(() => {
  if (engine.isTimerRunning && !engine.isPaused && engine.questionEndsAt) {
    if (Date.now() >= engine.questionEndsAt) {
      engine.timeout();
      broadcastState();
    }
  }
}, 300);

// API endpoint for health / debug
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    gameState: engine.status,
    currentQuestion: engine.currentQuestionIndex + 1,
    connectedSockets: io.engine.clientsCount,
  });
});

app.get("/api/state", (req, res) => {
  const role = req.query.role === "host" ? "host" : "stage";
  res.json(engine.getState(role));
});

// Socket connection
io.on("connection", (socket) => {
  // Identify role ('host' or 'stage')
  socket.on("register:role", (role) => {
    socket.data.role = role === "host" ? "host" : "stage";
    socket.emit("state:update", engine.getState(socket.data.role));
  });

  // Default register as stage
  socket.emit("state:update", engine.getState(socket.data?.role || "stage"));

  // Host commands
  socket.on("host:start_game", (contestantName) => {
    engine.startGame(contestantName);
    broadcastState();
  });

  socket.on("host:select_option", (optionId) => {
    engine.selectOption(optionId);
    broadcastState();
  });

  socket.on("host:lock_answer", () => {
    engine.lockAnswer();
    broadcastState();
  });

  socket.on("host:reveal_answer", () => {
    engine.revealAnswer();
    broadcastState();
  });

  socket.on("host:next_question", () => {
    engine.nextQuestion();
    broadcastState();
  });

  socket.on("host:previous_question", () => {
    engine.previousQuestion();
    broadcastState();
  });

  socket.on("host:jump_question", (index) => {
    engine.setupQuestion(index, true);
    broadcastState();
  });

  socket.on("host:start_timer", () => {
    engine.startTimer();
    broadcastState();
  });

  socket.on("host:restart_timer", () => {
    engine.restartTimer();
    broadcastState();
  });

  socket.on("host:pause_timer", () => {
    engine.pauseTimer();
    broadcastState();
  });

  socket.on("host:resume_timer", () => {
    engine.resumeTimer();
    broadcastState();
  });

  socket.on("host:add_time", (seconds) => {
    engine.addTime(seconds || 15);
    broadcastState();
  });

  socket.on("host:trigger_lifeline", (type) => {
    engine.triggerLifeline(type);
    broadcastState();
  });

  socket.on("host:resolve_lifeline", (type) => {
    engine.resolveLifeline(type);
    broadcastState();
  });

  socket.on("host:reset_game", () => {
    engine.reset();
    broadcastState();
  });

  socket.on("host:set_contestant", (name) => {
    engine.setContestant(name);
    broadcastState();
  });

  // Stage interactions (if participant clicks option directly on their screen)
  socket.on("stage:select_option", (optionId) => {
    engine.selectOption(optionId);
    broadcastState();
  });

  socket.on("disconnect", () => {
    // client disconnected
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[KaunBanegaCodepathi] Real-Time Engine running on http://0.0.0.0:${PORT}`);
});
