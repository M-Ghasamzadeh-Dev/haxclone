// =========================================================
// sound.js — افکت‌های صوتی ساخته‌شده با Web Audio API (نیازی به فایل صوتی/اینترنت نیست)
// =========================================================

export function createSound() {
  let ctx = null;
  let muted = false;

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // آنلاک صدا روی اولین کلیک کاربر (سیاست مرورگرها برای autoplay)
  function unlock() { try { ensureCtx(); } catch (e) { /* ignore */ } }

  function tone({ freq = 440, duration = 0.1, type = 'sine', gain = 0.2, slideTo = null, delay = 0 }) {
    if (muted) return;
    try {
      const ac = ensureCtx();
      const start = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
      g.gain.setValueAtTime(gain, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(g); g.connect(ac.destination);
      osc.start(start); osc.stop(start + duration + 0.02);
    } catch (e) { /* ignore audio errors */ }
  }

  return {
    unlock,
    setMuted(v) { muted = v; },
    isMuted() { return muted; },
    kick() { tone({ freq: 190, duration: 0.09, type: 'square', gain: 0.22, slideTo: 80 }); },
    wallBounce() { tone({ freq: 320, duration: 0.05, type: 'triangle', gain: 0.1 }); },
    goal() {
      [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, duration: 0.16, type: 'sine', gain: 0.2, delay: i * 0.09 }));
    },
    whistleEnd() {
      tone({ freq: 1100, duration: 0.35, type: 'sine', gain: 0.16, slideTo: 1500 });
    },
    click() { tone({ freq: 500, duration: 0.05, type: 'sine', gain: 0.12 }); },
  };
}
