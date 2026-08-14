// =========================================================
// config.js — همه‌ی مقادیر ثابت و قابل‌تنظیم بازی اینجاست.
// =========================================================
export const CONFIG = {
  FIELD: {
    W: 900,
    H: 520,
    GOAL_WIDTH: 140,
    GOAL_DEPTH: 30,
    WALL_BOUNCE: 0.75,
  },
  PLAYER: {
    R: 17,
    ACCEL: 0.42,      // ← قبلاً 0.55 بود (کمتر = کنترل بهتر)
    MAX_SPEED: 4.6,   // ← قبلاً 6.2 بود (سرعت منطقی‌تر)
    FRICTION: 0.985,
  },
  BALL: {
    R: 11,
    FREE_FRICTION: 0.987, // ← قبلاً 0.997 بود (توپ زودتر آروم میشه = کنترل راحت‌تر)
    WALL_BOUNCE: 0.85,
  },
  DRIBBLE: {
    STICK_OFFSET: 32,
    RESTICK_COOLDOWN_MS: 350,
    PICKUP_RADIUS_EXTRA: 6,
    // سرعت چرخش نرمِ جهت نشانه‌گیری به سمت ماوس (رادیان بر میلی‌ثانیه)
    AIM_TURN_RATE: 0.012,
  },
  KICK: {
    POWER: 11, // ← قبلاً 19 بود (شوت قوی ولی قابل کنترل)
  },
  MATCH_DEFAULTS: {
    TEAM_SIZE: 3,
    DURATION_MIN: 5,
    GOAL_LIMIT: 3,
  },
  NETWORK: {
    TICK_MS: 1000 / 40,
  },
};