import { useNavigate } from "react-router-dom";
import FeatureCard from "./FeatureCard";
import {
  BoltIcon,
  TrophyIcon,
  UsersIcon,
  BrainIcon,
  GiftIcon,
  CrownIcon,
  TargetIcon,
} from "./Icons";

const LEFT_FEATURES = [
  { icon: <BoltIcon />, title: "THINK FAST", subtitle: "Act Smart" },
  { icon: <TrophyIcon />, title: "BE THE CHAMPION", subtitle: "Rise Above" },
  { icon: <UsersIcon />, title: "COMPETE LIVE", subtitle: "Beat the Best" },
  {
    icon: <BrainIcon />,
    title: "TEST YOUR KNOWLEDGE",
    subtitle: "Every Second Counts",
  },
];

const RIGHT_FEATURES = [
  {
    icon: <GiftIcon />,
    title: "WIN EXCITING REWARDS",
    subtitle: "For You & Your Team",
  },
  {
    icon: <CrownIcon />,
    title: "EARN GLORY FOREVER",
    subtitle: "Make Your Chapter Proud",
  },
  {
    icon: <TargetIcon />,
    title: "ONE ANSWER CAN CHANGE EVERYTHING",
    subtitle: "Are You Ready?",
  },
];

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero">
      <div className="hero__rings" aria-hidden="true">
        <span className="hero__ring hero__ring--1" />
        <span className="hero__ring hero__ring--2" />
        <span className="hero__ring hero__ring--3" />
        <span className="hero__spotlight" />
      </div>

      <div className="container hero__grid">
        {/* LEFT FEATURES */}
        <div className="hero__column hero__column--left">
          {LEFT_FEATURES.map((f) => (
            <FeatureCard
              key={f.title}
              side="left"
              {...f}
            />
          ))}
        </div>

        {/* CENTER */}
        <div className="hero__centerpiece">
          <div className="hero__emblem-wrap">
  <img
    src="/kbc-codepathi.png"
    alt="Kaun Banega CodePathi logo"
    className="hero__emblem"
  />

          </div>

          {/* MAIN ENTER GAME BUTTON */}
          <div className="hero__cta-wrap">
            <button
              type="button"
              className="hero__join-btn"
              onClick={() => navigate("/play")}
            >
              <span className="hero__join-btn-main">
                ENTER CODEPATHI →
              </span>

              <span className="hero__join-btn-sub">
                LIVE ARENA
              </span>
            </button>
          </div>

          <p className="hero__tagline eyebrow">
            KNOWLEDGE &bull; STRATEGY &bull; VICTORY
          </p>
        </div>

        {/* RIGHT FEATURES */}
        <div className="hero__column hero__column--right">
          {RIGHT_FEATURES.map((f) => (
            <FeatureCard
              key={f.title}
              side="right"
              {...f}
            />
          ))}
        </div>
      </div>
    </section>
  );
}