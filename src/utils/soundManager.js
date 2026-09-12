/**
 * KBC Studio Audio Engine
 * Bulletproof audio manager for TV game show sound effects and timer countdowns.
 * Uses fresh Audio elements and explicit buffer flushes to ensure 0.00s resets on every question.
 */

class SoundManager {
  constructor() {
    this.musicAudio = null;
    this.sfxAudio = null;
    this.lockInTimeout = null;
    this.isLockInActive = false;
    this.isMuted = false;
    this.isUnlocked = false;

    // Normalization table for audio files (exact existing files placed first for zero latency)
    this.soundPaths = {
      countdown45: [
        "/audio/KBC_Count_down_45sec.mp3",
        "/audio/KBC_Count_down.mp3",
        "/audio/kbc_count_down_45sec.mp3",
        "/audio/45sec.mp3",
      ],
      countdown60: [
        "/audio/KBC_Count_down_60sec.mp3",
        "/audio/KBC_COUNT_DOWN_60 sec.mp3",
        "/audio/KBC_COUNT_DOWN_60sec.mp3",
        "/audio/60sec.mp3",
      ],
      lockIn: [
        "/audio/kbc-answer-locked-in.mp3",
        "/audio/kbc_answer_locked-in.mp3",
        "/audio/lock-in.mp3",
      ],
      suspense: [
        "/audio/kbc-suspense.mp3",
        "/audio/kbc_suspense.mp3",
        "/audio/kbc-question-theme.mp3",
        "/audio/suspense.mp3",
      ],
      rightAnswer: [
        "/audio/kbc-right-answer.mp3",
        "/audio/7-crore-kbc.mp3",
        "/audio/kbc_right_answer.mp3",
        "/audio/right-answer.mp3",
      ],
      wrongAnswer: [
        "/audio/kbc-wrong-answer.mp3",
        "/audio/kbc_wrong_answer.mp3",
        "/audio/wrong-answer.mp3",
      ],
    };

    if (typeof window !== "undefined") {
      this.attachAutoplayUnlock();
    }
  }

  attachAutoplayUnlock() {
    const unlock = () => {
      this.unlockAudio();
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
  }

  unlockAudio() {
    this.isUnlocked = true;
    try {
      const silent = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
      silent.play().catch(() => {});
    } catch (_) {}
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // Create a brand-new, isolated Audio instance that is guaranteed to start at 0:00 with no leftover buffer
  createCleanAudio(candidatePaths, loop = false, startOffset = 0) {
    if (this.isMuted) return null;

    const audio = new Audio();
    audio.loop = loop;
    audio.preload = "auto";

    const paths = Array.isArray(candidatePaths) ? candidatePaths : [candidatePaths];
    let pathIdx = 0;

    const tryPlay = () => {
      if (pathIdx >= paths.length) {
        console.warn("[SoundManager] Audio file not found in paths:", paths);
        return;
      }

      const src = paths[pathIdx];
      audio.src = src;

      const onCanPlay = () => {
        audio.removeEventListener("canplay", onCanPlay);
        if (startOffset > 0 && audio.duration && startOffset < audio.duration) {
          audio.currentTime = startOffset;
        } else {
          audio.currentTime = 0;
        }

        audio.play().catch((err) => {
          if (err.name !== "NotAllowedError") {
            pathIdx++;
            tryPlay();
          }
        });
      };

      const onError = () => {
        audio.removeEventListener("error", onError);
        pathIdx++;
        tryPlay();
      };

      audio.addEventListener("canplay", onCanPlay, { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio.load();
    };

    tryPlay();
    return audio;
  }

  // Stop background music completely, discard element, clear timers
  stopMusic() {
    if (this.lockInTimeout) {
      clearTimeout(this.lockInTimeout);
      this.lockInTimeout = null;
    }
    this.isLockInActive = false;

    if (this.musicAudio) {
      try {
        this.musicAudio.pause();
        this.musicAudio.currentTime = 0;
        this.musicAudio.removeAttribute("src");
        this.musicAudio.load();
      } catch (_) {}
      this.musicAudio = null;
    }
  }

  // Stop one-shot SFX completely
  stopSfx() {
    if (this.sfxAudio) {
      try {
        this.sfxAudio.pause();
        this.sfxAudio.currentTime = 0;
        this.sfxAudio.removeAttribute("src");
        this.sfxAudio.load();
      } catch (_) {}
      this.sfxAudio = null;
    }
  }

  // Complete clean slate
  stopAll() {
    this.stopMusic();
    this.stopSfx();
  }

  // 1. Play Countdown Audio (GUARANTEED to start from 0:00 every time)
  playCountdown(timeLimit = 45) {
    if (this.isMuted) return;

    // Hard stop and destroy previous music
    this.stopMusic();

    if (timeLimit <= 45) {
      // 45s countdown (Q1 to Q5) -> starts at 0.0s
      this.musicAudio = this.createCleanAudio(this.soundPaths.countdown45, false, 0);
    } else if (timeLimit <= 60) {
      // 60s countdown (Q6 to Q10) -> starts at 0.0s
      this.musicAudio = this.createCleanAudio(this.soundPaths.countdown60, false, 0);
    } else {
      // 120s (2 min, Q11 to Q15) -> starts suspense thinking music fresh from 0.0s
      this.musicAudio = this.createCleanAudio(this.soundPaths.suspense, true, 0);
    }
  }

  // Pause active countdown (e.g. Lifeline triggered)
  pauseCountdown() {
    if (this.musicAudio && !this.musicAudio.paused) {
      try {
        this.musicAudio.pause();
      } catch (_) {}
    }
  }

  // Resume paused countdown (e.g. Lifeline resolved)
  resumeCountdown(timeLimit = 45, remainingSeconds = 45) {
    if (this.isMuted) return;

    const elapsed = Math.max(0, timeLimit - remainingSeconds);

    if (this.musicAudio && this.musicAudio.src) {
      try {
        if (this.musicAudio.duration && elapsed < this.musicAudio.duration) {
          this.musicAudio.currentTime = elapsed;
        }
        this.musicAudio.play().catch(() => {});
      } catch (_) {
        this.playCountdown(timeLimit);
      }
    } else {
      this.playCountdown(timeLimit);
    }
  }

  // 2. Play Lock-In SFX -> immediately cuts countdown, plays lock sound, then loops suspense
  playLockIn() {
    // 1. Cut countdown music immediately
    this.stopAll();

    this.isLockInActive = true;

    // 2. Play lock-in sound
    this.sfxAudio = this.createCleanAudio(this.soundPaths.lockIn, false, 0);

    const bridgeToSuspense = () => {
      // If lock-in was cancelled by a reveal or new question, abort!
      if (!this.isLockInActive) return;
      this.isLockInActive = false;
      this.playSuspense();
    };

    if (this.sfxAudio) {
      this.sfxAudio.addEventListener("ended", bridgeToSuspense, { once: true });
    }

    // Safety fallback timeout
    this.lockInTimeout = setTimeout(bridgeToSuspense, 2800);
  }

  // 3. Play Looping Suspense Music (between Lock and Reveal)
  playSuspense() {
    if (this.isMuted) return;
    this.stopMusic();
    this.musicAudio = this.createCleanAudio(this.soundPaths.suspense, true, 0);
  }

  // 4. Play Reveal Outcome (Right or Wrong) -> immediately cuts suspense
  playReveal(isCorrect) {
    // 1. Cut suspense music and cancel any pending bridge timers
    this.stopAll();

    // 2. Play victory fanfare or wrong answer buzzer
    if (isCorrect) {
      this.sfxAudio = this.createCleanAudio(this.soundPaths.rightAnswer, false, 0);
    } else {
      this.sfxAudio = this.createCleanAudio(this.soundPaths.wrongAnswer, false, 0);
    }
  }

  // 5. Play Timeout Buzzer
  playTimeout() {
    this.stopAll();
    this.sfxAudio = this.createCleanAudio(this.soundPaths.wrongAnswer, false, 0);
  }
}

export const soundManager = new SoundManager();
