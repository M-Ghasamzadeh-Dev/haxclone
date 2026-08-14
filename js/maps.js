// =========================================================
// maps.js — پیش‌تنظیم‌های زمین‌های مختلف بازی.
// اگه خواستی نقشه‌ی جدید اضافه کنی، فقط یه ورودی جدید اینجا اضافه کن.
// =========================================================

export const MAPS = {
  classic: {
    id: 'classic', name: 'کلاسیک',
    W: 900, H: 520, GOAL_WIDTH: 140, GOAL_DEPTH: 30,
  },
  big: {
    id: 'big', name: 'زمین بزرگ',
    W: 1100, H: 620, GOAL_WIDTH: 160, GOAL_DEPTH: 34,
  },
  small: {
    id: 'small', name: 'زمین کوچک (سریع)',
    W: 700, H: 420, GOAL_WIDTH: 110, GOAL_DEPTH: 26,
  },
  corridor: {
    id: 'corridor', name: 'زمین باریک (رفت‌وبرگشتی)',
    W: 1150, H: 420, GOAL_WIDTH: 170, GOAL_DEPTH: 30,
  },
};

export const DEFAULT_MAP = 'classic';
export const MAP_LIST = Object.values(MAPS);
