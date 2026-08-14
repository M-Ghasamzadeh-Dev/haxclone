// =========================================================
// config.js — همه‌ی مقادیر ثابت و قابل‌تنظیم بازی اینجاست.
// =========================================================
export const CONFIG = {
  FIELD: { W: 900, H: 520, GOAL_WIDTH: 140, GOAL_DEPTH: 30, WALL_BOUNCE: 0.75 },
  PLAYER: {
    R: 17,
    ACCEL: 0.4,
    MAX_SPEED: 4.2,   // ← کمتر شد
    FRICTION: 0.985,
  },
  BALL: { R: 11, FREE_FRICTION: 0.987, WALL_BOUNCE: 0.85 },
  DRIBBLE: {
    STICK_OFFSET: 32,
    RESTICK_COOLDOWN_MS: 350,
    PICKUP_RADIUS_EXTRA: 6,
    AIM_TURN_RATE: 0.03,
  },
  KICK: { POWER: 10.5 }, // ← کمتر شد
  MATCH_DEFAULTS: { TEAM_SIZE: 3, DURATION_MIN: 5, GOAL_LIMIT: 3 },
  NETWORK: { TICK_MS: 1000 / 40 },
};