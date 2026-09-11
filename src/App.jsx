import { Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import Home from "./pages/Home";
import JoinQuiz from "./pages/JoinQuiz";
import StageDisplay from "./pages/StageDisplay";
import HostDashboard from "./pages/HostDashboard";

export default function App() {
  return (
    <GameProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<JoinQuiz />} />
        <Route path="/play" element={<StageDisplay />} />
        <Route path="/stage" element={<StageDisplay />} />
        <Route path="/host" element={<HostDashboard />} />
        <Route path="/admin" element={<HostDashboard />} />
      </Routes>
    </GameProvider>
  );
}