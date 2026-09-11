import { useNavigate } from "react-router-dom";
import Starfield from "../components/Starfield";

export default function JoinQuiz() {
  const navigate = useNavigate();

  return (
    <div className="page page--join">
      <Starfield density={50} />

      <div className="container join-page__inner">
        <button
          type="button"
          className="join-page__back"
          onClick={() => navigate("/")}
        >
          ← BACK TO HOME
        </button>

        <header className="join-page__header">
          <p className="eyebrow">KAUN BANEGA CODEPATHI</p>

          <h1 className="join-page__title gold-text">
            LIVE BROADCAST PORTAL
          </h1>

          <p className="join-page__subtitle">
            Connect your screens for the live television-style quiz experience.
          </p>

          <p className="join-page__hint">
            Laptop A runs the Host Control Deck. Laptop B / Projector displays the Stage Arena.
          </p>
        </header>

        <div className="join-page__rooms" style={{ maxWidth: "800px", margin: "0 auto" }}>
          {/* STAGE SCREEN CARD */}
          <div
            className="join-room"
            role="button"
            tabIndex={0}
            onClick={() => navigate("/play")}
            onKeyDown={(e) => e.key === "Enter" && navigate("/play")}
            aria-label="Launch Stage Screen"
            style={{ cursor: "pointer" }}
          >
            <span className="join-room__ring" aria-hidden="true">
              01
            </span>

            <span className="join-room__label eyebrow">STAGE DISPLAY</span>

            <span className="join-room__status">PROJECTOR / HOT SEAT</span>

            <span className="join-room__cta gold-text">
              LAUNCH STAGE SCREEN →
            </span>
          </div>

          {/* HOST DECK CARD */}
          <div
            className="join-room"
            role="button"
            tabIndex={0}
            onClick={() => navigate("/host")}
            onKeyDown={(e) => e.key === "Enter" && navigate("/host")}
            aria-label="Open Host Deck"
            style={{ cursor: "pointer" }}
          >
            <span className="join-room__ring" aria-hidden="true">
              02
            </span>

            <span className="join-room__label eyebrow">HOST CONSOLE</span>

            <span className="join-room__status">QUIZ MASTER DESK</span>

            <span className="join-room__cta gold-text">
              OPEN HOST DECK →
            </span>
          </div>
        </div>

        <div className="join-page__footer-note">
          <span>DUAL SCREEN BROADCAST</span>
          <span>•</span>
          <span>REAL-TIME SYNCHRONIZED</span>
        </div>
      </div>
    </div>
  );
}