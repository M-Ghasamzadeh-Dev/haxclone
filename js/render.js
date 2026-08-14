// =========================================================
// render.js — رسم صحنه‌ی بازی روی canvas؛ اندازه‌ی زمین از world.field میاد
// =========================================================
import { CONFIG } from './config.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let lastFieldId = null;

  function drawGoalNet(x, y1, y2, depth, dir) {
    const x2 = x + dir * depth;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y1); ctx.lineTo(x2, y1);
    ctx.lineTo(x2, y2); ctx.lineTo(x, y2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let yy = y1; yy <= y2; yy += 10) {
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x2, yy); ctx.stroke();
    }
    for (let xx = Math.min(x, x2); xx <= Math.max(x, x2); xx += 10) {
      ctx.beginPath(); ctx.moveTo(xx, y1); ctx.lineTo(xx, y2); ctx.stroke();
    }
  }

  function render(world) {
    const field = world.field;
    const PAD = field.GOAL_DEPTH + 4;
    if (lastFieldId !== field.id) {
      canvas.width = field.W + PAD * 2;
      canvas.height = field.H;
      lastFieldId = field.id;
    }

    const GOAL_Y1 = field.H / 2 - field.GOAL_WIDTH / 2;
    const GOAL_Y2 = field.H / 2 + field.GOAL_WIDTH / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(PAD, 0);

    ctx.fillStyle = '#12331a';
    ctx.fillRect(-PAD, 0, canvas.width, field.H);

    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#2e7d32' : '#2b7230';
      ctx.fillRect(i * (field.W / 10), 0, field.W / 10, field.H);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, field.W - 6, field.H - 6);
    ctx.beginPath(); ctx.moveTo(field.W / 2, 0); ctx.lineTo(field.W / 2, field.H); ctx.stroke();
    ctx.beginPath(); ctx.arc(field.W / 2, field.H / 2, Math.min(60, field.H / 4), 0, Math.PI * 2); ctx.stroke();

    drawGoalNet(0, GOAL_Y1, GOAL_Y2, field.GOAL_DEPTH, -1);
    drawGoalNet(field.W, GOAL_Y1, GOAL_Y2, field.GOAL_DEPTH, 1);

    for (const id in world.players) {
      const p = world.players[id];
      ctx.beginPath();
      ctx.fillStyle = p.team === 'red' ? '#ff5c5c' : '#5c9dff';
      ctx.arc(p.x, p.y, CONFIG.PLAYER.R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.name, p.x, p.y - CONFIG.PLAYER.R - 8);
    }

    const ball = world.ball;
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(ball.x, ball.y, CONFIG.BALL.R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
    if (ball.stuckTo) {
      ctx.strokeStyle = 'rgba(255,255,0,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ball.x, ball.y, CONFIG.BALL.R + 3, 0, Math.PI * 2); ctx.stroke();
    }

    // کیک‌آف: نمایش شمارش معکوس کوتاه بعد از گل
    if (world.kickoff && world.kickoff.active) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, field.W, field.H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      const secs = Math.ceil(world.kickoff.remainingMs / 1000);
      ctx.fillText(`شروع مجدد در ${secs}...`, field.W / 2, field.H / 2 - 40);
    }

    // بنر پایان بازی
    if (world.match.status === 'ended') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, field.H / 2 - 55, field.W, 110);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      const text = world.match.winner === 'draw'
        ? 'بازی مساوی شد!'
        : `تیم ${world.match.winner === 'red' ? 'قرمز' : 'آبی'} برد! 🏆`;
      ctx.fillText(text, field.W / 2, field.H / 2 + 10);
    }

    ctx.restore();
  }

  return { render };
}

export function formatTime(ms) {
  if (ms <= 0) return '00:00';
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
