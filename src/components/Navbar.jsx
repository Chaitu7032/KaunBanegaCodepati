import { useState } from "react";
import { useNavigate } from "react-router-dom";
import acmLogo from "../assets/acm-logo.png";

const NAV_LINKS = [
  { label: "HOME", href: "#home" },
  { label: "ABOUT", href: "#about" },
  { label: "HOW TO PLAY", href: "#how-to-play" },
  { label: "PRIZES", href: "#prizes" },
  { label: "SCHEDULE", href: "#schedule" },
  { label: "CONTACT", href: "#contact" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("HOME");
  const navigate = useNavigate();

  const handleNavClick = (label, href) => {
    setActive(label);
    setMenuOpen(false);

    const el = document.querySelector(href);

    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
  <>
    <header className="navbar" id="home">
      <div className="container navbar__inner">

        {/* ACM VIT-AP Student Chapter */}
        <div className="navbar__brand">
          <img
            src={acmLogo}
            alt="ACM VIT-AP Student Chapter logo"
            className="navbar__acm-logo"
          />

          <div className="navbar__brand-text">
            <span className="navbar__brand-line navbar__brand-line--primary">
              ACM VIT-AP
            </span>

            <span className="navbar__brand-line">
              STUDENT CHAPTER
            </span>

            <span className="navbar__brand-line navbar__brand-line--accent">
              VIT-AP UNIVERSITY
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav
          className="navbar__nav navbar__nav--desktop"
          aria-label="Primary"
        >
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className={`navbar__link ${
                    active === link.label
                      ? "navbar__link--active"
                      : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.label, link.href);
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* VIT Logos */}
<div className="navbar__partner-area">

  <div className="navbar__partner-logos">
    <img
      src="/vit-ap-logo.png"
      alt="VIT-AP University"
      className="navbar__partner-logo navbar__partner-logo--vit"
    />

    <img
      src="/vit-ap-tech-logo.png"
      alt="VIT-AP Tech"
      className="navbar__partner-logo navbar__partner-logo--tech"
    />
  </div>

</div>

        {/* Mobile menu */}
        <button
          type="button"
          className="navbar__burger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile navigation */}
      {menuOpen && (
        <nav
          className="navbar__nav--mobile"
          aria-label="Mobile"
        >
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className={`navbar__link ${
                    active === link.label
                      ? "navbar__link--active"
                      : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.label, link.href);
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="btn-gold navbar__mobile-cta"
            onClick={() => {
              setMenuOpen(false);
              navigate("/play");
            }}
          >
            ENTER CODEPATHI — LIVE ARENA
          </button>
        </nav>
      )}
      
    </header>
    <button
  type="button"
  className="floating-join"
  onClick={() => navigate("/play")}
  aria-label="Enter live Codepathi arena"
>
  <span className="floating-join__main">
    ENTER CODEPATHI
  </span>

  <span className="floating-join__sub">
    LIVE ARENA
  </span>
</button>
  </>
);
}