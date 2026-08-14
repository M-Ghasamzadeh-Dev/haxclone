// =========================================================
// physics.js — کل منطق فیزیکی بازی. فقط روی هاست اجرا میشه.
// =========================================================
import { CONFIG } from './config.js';
import { MAPS, DEFAULT_MAP } from './maps.js';

const P = CONFIG.PLAYER;
const B = CONFIG.BALL;
const D = CONFIG.DRIBBLE;
const K = CONFIG.KICK;
const KICKOFF_FREEZE_MS = 1500;

function goalBounds(field) {
  return { y1: field.H/2 - field.GOAL_WIDTH/2, y2: field.H/2 + field.GOAL_WIDTH/2 };
}

export function createWorld(settings) {
  const map = MAPS[settings.mapId] || MAPS[DEFAULT_MAP];
  const field = { ...map };
  return {
    field,
    players: {},
    ball: { x: field.W/2, y: field.H/2, vx: 0, vy: 0, stuckTo: null, releasedBy: null, releasedAt: 0 },
    score: { red: 0, blue: 0 },
    settings: {
      mapId: field.id,
      teamSize: settings.teamSize ?? CONFIG.MATCH_DEFAULTS.TEAM_SIZE,
      durationMin: settings.durationMin ?? CONFIG.MATCH_DEFAULTS.DURATION_MIN,
      goalLimit: settings.goalLimit ?? CONFIG.MATCH_DEFAULTS.GOAL_LIMIT,
    },
    match: {
      status: 'playing',
      timeLeftMs: (settings.durationMin ?? CONFIG.MATCH_DEFAULTS.DURATION_MIN) * 60000,
      winner: null,
    },
    kickoff: { active: false, remainingMs: 0 },
  };
}

export function resetMatch(world) {
  world.score = { red: 0, blue: 0 };
  world.match.status = 'playing';
  world.match.winner = null;
  world.match.timeLeftMs = world.settings.durationMin * 60000;
  resetPositions(world);
  world.kickoff = { active: true, remainingMs: KICKOFF_FREEZE_MS };
}

export function teamHasSpace(world, team) {
  if (world.settings.teamSize <= 0) return true;
  const count = Object.values(world.players).filter(p => p.team === team).length;
  return count < world.settings.teamSize;
}

export function addPlayer(world, id, name, team) {
  const field = world.field;
  const spawnX = team === 'red' ? field.W * 0.22 : field.W * 0.78;
  world.players[id] = {
    x: spawnX, y: field.H/2, vx: 0, vy: 0,
    team, name,
    facing: { x: team === 'red' ? 1 : -1, y: 0 },
    aimDir: null,
    _input: {},
  };
}

export function removePlayer(world, id) {
  if (world.ball.stuckTo === id) world.ball.stuckTo = null;
  delete world.players[id];
}

function resetPositions(world) {
  const field = world.field;
  let ri = 0, bi = 0;
  for (const id in world.players) {
    const p = world.players[id];
    if (p.team === 'red') { p.x = field.W*0.22; p.y = field.H/2 + (ri-1)*70; ri++; p.facing = { x: 1, y: 0 }; }
    else { p.x = field.W*0.78; p.y = field.H/2 + (bi-1)*70; bi++; p.facing = { x: -1, y: 0 }; }
    p.vx = 0; p.vy = 0;
    p.aimDir = null;
  }
  world.ball.x = field.W/2; world.ball.y = field.H/2;
  world.ball.vx = 0; world.ball.vy = 0;
  world.ball.stuckTo = null; world.ball.releasedBy = null;
}

export function stepPhysics(world, dtMs, now) {
  const events = { goal: null, kicked: false, wallBounce: false, matchEnded: false };
  if (world.match.status === 'ended') return events;

  if (world.kickoff.active) {
    world.kickoff.remainingMs -= dtMs;
    if (world.kickoff.remainingMs <= 0) world.kickoff.active = false;
    return events;
  }

  const field = world.field;
  const { y1: GOAL_Y1, y2: GOAL_Y2 } = goalBounds(field);
  const ball = world.ball;

  // ---- حرکت بازیکن‌ها ----
  for (const id in world.players) {
    const p = world.players[id];
    const inp = p._input || {};
    let ax = 0, ay = 0;
    if (inp.left) ax -= P.ACCEL;
    if (inp.right) ax += P.ACCEL;
    if (inp.up) ay -= P.ACCEL;
    if (inp.down) ay += P.ACCEL;

    const hasAim = !!(inp.aim && Number.isFinite(inp.aim.x) && Number.isFinite(inp.aim.y));
    const carrying = ball.stuckTo === id;

    if ((ax !== 0 || ay !== 0) && !(carrying && hasAim)) {
      const len = Math.hypot(ax, ay);
      p.facing = { x: ax/len, y: ay/len };
    }

    p.vx = (p.vx + ax) * P.FRICTION;
    p.vy = (p.vy + ay) * P.FRICTION;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > P.MAX_SPEED) { p.vx *= P.MAX_SPEED/speed; p.vy *= P.MAX_SPEED/speed; }
    p.x += p.vx; p.y += p.vy;
    p.x = Math.max(P.R, Math.min(field.W - P.R, p.x));
    p.y = Math.max(P.R, Math.min(field.H - P.R, p.y));
  }

  // ---- دریبل + نشانه‌گیری ----
  if (ball.stuckTo && world.players[ball.stuckTo]) {
    const p = world.players[ball.stuckTo];
    const inp = p._input || {};

    if (inp.aim && Number.isFinite(inp.aim.x) && Number.isFinite(inp.aim.y)) {
      const dx = inp.aim.x - p.x, dy = inp.aim.y - p.y;
      const distAim = Math.hypot(dx, dy);
      if (distAim > 4) {
        // جهت دقیق نشانه (برای رسم فلش، مستقل از facing)
        p.aimDir = { x: dx/distAim, y: dy/distAim };
        // چرخش سریع و نرمِ جهت حمل به سمت نشانه
        const targetAng = Math.atan2(dy, dx);
        const curAng = Math.atan2(p.facing.y, p.facing.x);
        let diff = targetAng - curAng;
        while (diff > Math.PI) diff -= Math.PI*2;
        while (diff < -Math.PI) diff += Math.PI*2;
        const maxTurn = D.AIM_TURN_RATE * dtMs;
        const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
        const newAng = curAng + turn;
        p.facing = { x: Math.cos(newAng), y: Math.sin(newAng) };
      }
    } else {
      p.aimDir = null;
    }

    ball.x = p.x + p.facing.x * D.STICK_OFFSET;
    ball.y = p.y + p.facing.y * D.STICK_OFFSET;
    ball.vx = 0; ball.vy = 0;

    if (inp.kick) {
      ball.vx = p.facing.x * K.POWER + p.vx * 0.4;
      ball.vy = p.facing.y * K.POWER + p.vy * 0.4;
      ball.releasedBy = ball.stuckTo;
      ball.stuckTo = null;
      ball.releasedAt = now;
      events.kicked = true;
    }
  } else {
    // ---- توپ آزاد ----
    ball.x += ball.vx; ball.y += ball.vy;
    ball.vx *= B.FREE_FRICTION; ball.vy *= B.FREE_FRICTION;

    if (ball.y - B.R < 0) { ball.y = B.R; ball.vy *= -B.WALL_BOUNCE; events.wallBounce = true; }
    if (ball.y + B.R > field.H) { ball.y = field.H - B.R; ball.vy *= -B.WALL_BOUNCE; events.wallBounce = true; }

    let goal = null;
    if (ball.x - B.R < 0) {
      if (ball.y > GOAL_Y1 && ball.y < GOAL_Y2) {
        if (ball.x < -field.GOAL_DEPTH) goal = 'blue';
      } else { ball.x = B.R; ball.vx *= -B.WALL_BOUNCE; events.wallBounce = true; }
    }
    if (ball.x + B.R > field.W) {
      if (ball.y > GOAL_Y1 && ball.y < GOAL_Y2) {
        if (ball.x > field.W + field.GOAL_DEPTH) goal = 'red';
      } else { ball.x = field.W - B.R; ball.vx *= -B.WALL_BOUNCE; events.wallBounce = true; }
    }

    if (goal) {
      world.score[goal]++;
      events.goal = goal;
      checkMatchEnd(world);
      if (world.match.status !== 'ended') {
        resetPositions(world);
        world.kickoff = { active: true, remainingMs: KICKOFF_FREEZE_MS };
      } else {
        events.matchEnded = true;
      }
      return events;
    }

    for (const id in world.players) {
      const p = world.players[id];
      const dx = ball.x - p.x, dy = ball.y - p.y;
      const dist = Math.hypot(dx, dy);
      const pickupR = P.R + B.R + D.PICKUP_RADIUS_EXTRA;
      if (dist < pickupR) {
        const cooldownOk = !(ball.releasedBy === id && now - ball.releasedAt < D.RESTICK_COOLDOWN_MS);
        if (cooldownOk) { ball.stuckTo = id; ball.releasedBy = null; break; }
      }
    }
  }

  // ---- برخورد بازیکن‌ها ----
  const ids = Object.keys(world.players);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = world.players[ids[i]], b = world.players[ids[j]];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy), minD = P.R * 2;
      if (dist < minD && dist > 0) {
        const nx = dx/dist, ny = dy/dist, overlap = (minD - dist)/2;
        a.x -= nx*overlap; a.y -= ny*overlap;
        b.x += nx*overlap; b.y += ny*overlap;
      }
    }
  }

  // ---- تایمر ----
  if (world.settings.durationMin > 0) {
    world.match.timeLeftMs -= dtMs;
    if (world.match.timeLeftMs <= 0) {
      world.match.timeLeftMs = 0;
      endMatchByTime(world);
      events.matchEnded = true;
    }
  }

  return events;
}

function checkMatchEnd(world) {
  const gl = world.settings.goalLimit;
  if (gl > 0) {
    if (world.score.red >= gl) { world.match.status = 'ended'; world.match.winner = 'red'; }
    else if (world.score.blue >= gl) { world.match.status = 'ended'; world.match.winner = 'blue'; }
  }
}

function endMatchByTime(world) {
  world.match.status = 'ended';
  if (world.score.red > world.score.blue) world.match.winner = 'red';
  else if (world.score.blue > world.score.red) world.match.winner = 'blue';
  else world.match.winner = 'draw';
}