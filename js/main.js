// =========================================================
// main.js — نقطه‌ی شروع برنامه: DOM را به ماژول‌های دیگر وصل می‌کند.
// =========================================================
import { CONFIG } from './config.js';
import { createWorld, addPlayer, removePlayer, teamHasSpace, stepPhysics, resetMatch } from './physics.js';
import { createNetwork } from './network.js';
import { createRenderer, formatTime } from './render.js';
import { createChat } from './chat.js';
import { createSound } from './sound.js';

// ---------- DOM refs ----------
const lobby = document.getElementById('lobby');
const gameWrap = document.getElementById('gameWrap');
const statusMsg = document.getElementById('statusMsg');
const myIdBox = document.getElementById('myIdBox');
const canvas = document.getElementById('field');
const chatBoxEl = document.getElementById('chatBox');
const playerListEl = document.getElementById('playerList');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const roomCodeShow = document.getElementById('roomCodeShow');
const muteBtn = document.getElementById('muteBtn');
const restartBar = document.getElementById('restartBar');
const restartBtn = document.getElementById('restartBtn');
const restartWaitMsg = document.getElementById('restartWaitMsg');

const chat = createChat(chatBoxEl);
const renderer = createRenderer(canvas);
const net = createNetwork();
const sound = createSound();

let myNick = 'Player';
let myTeam = 'red';
let world = null;
let keys = {};
let wasEnded = false;

// ---------- نشانه‌گیری با ماوس ----------
let aimPoint = null;    // نقطه‌ی نشانه‌گیری (مختصات زمین)
let kickQueued = false; // شوت با کلیک چپ (تا بین فریم‌ها گم نشه)

function updateAim(e) {
  if (!world || !canvas.clientWidth) return;
  const field = world.field;
  const PAD = field.GOAL_DEPTH + 4;
  const scaleX = canvas.width / canvas.clientWidth;
  const scaleY = canvas.height / canvas.clientHeight;
  aimPoint = {
    x: e.offsetX * scaleX - PAD,
    y: e.offsetY * scaleY,
  };
}
canvas.addEventListener('mousemove', updateAim);
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) { // فقط کلیک چپ
    sound.unlock();
    updateAim(e);
    kickQueued = true;
  }
});

// ---------- تب‌ها ----------
const tabHostBtn = document.getElementById('tabHostBtn');
const tabJoinBtn = document.getElementById('tabJoinBtn');
const tabHost = document.getElementById('tabHost');
const tabJoin = document.getElementById('tabJoin');
tabHostBtn.onclick = () => switchTab('host');
tabJoinBtn.onclick = () => switchTab('join');
function switchTab(which) {
  tabHostBtn.classList.toggle('active', which === 'host');
  tabJoinBtn.classList.toggle('active', which === 'join');
  tabHost.classList.toggle('active', which === 'host');
  tabJoin.classList.toggle('active', which === 'join');
}

document.getElementById('pickRed').onclick = () => setTeamPick('red');
document.getElementById('pickBlue').onclick = () => setTeamPick('blue');
function setTeamPick(t) {
  myTeam = t;
  document.getElementById('pickRed').classList.toggle('active', t === 'red');
  document.getElementById('pickBlue').classList.toggle('active', t === 'blue');
}

// ---------- صدا ----------
muteBtn.onclick = () => {
  const m = !sound.isMuted();
  sound.setMuted(m);
  muteBtn.textContent = m ? '🔇' : '🔊';
};

// ---------- ساخت اتاق ----------
document.getElementById('createBtn').onclick = () => {
  sound.unlock();
  myNick = (document.getElementById('nickInput').value || 'Host').slice(0, 14);
  const settings = {
    mapId: document.getElementById('cfgMap').value,
    teamSize: parseInt(document.getElementById('cfgTeamSize').value, 10) || 0,
    durationMin: parseInt(document.getElementById('cfgDuration').value, 10) || 0,
    goalLimit: parseInt(document.getElementById('cfgGoalLimit').value, 10) || 0,
  };
  statusMsg.textContent = 'در حال ساخت اتاق...';
  world = createWorld(settings);

  net.on('hostData', (conn, data) => handleHostData(conn, data));
  net.on('hostConnClose', (conn) => {
    if (world.players[conn.peer]) {
      chat.log('sys', `${world.players[conn.peer].name} از اتاق رفت.`);
      removePlayer(world, conn.peer);
    }
    net.removeConn(conn.peer);
    broadcastPlayerList();
  });

  net.startHost({
    onOpen: (id) => {
      addPlayer(world, id, myNick, myTeam);
      myIdBox.style.display = 'block';
      myIdBox.textContent = 'کد اتاق تو (بفرست برای دوستت): ' + id;
      roomCodeShow.textContent = 'کد اتاق: ' + id;
      statusMsg.textContent = 'اتاق ساخته شد. منتظر بازیکن‌ها بمون.';
      chat.log('sys', `${myNick} اتاق رو ساخت. (زمین: ${world.field.name} | ظرفیت هر تیم: ${settings.teamSize || '∞'} | زمان: ${settings.durationMin || '∞'} دقیقه | امتیاز برد: ${settings.goalLimit || '∞'})`);
      enterGame(true);
    },
    onError: (err) => { statusMsg.textContent = 'خطا: ' + err.type; },
  });
};

// ---------- ورود به اتاق ----------
document.getElementById('joinBtn').onclick = () => {
  sound.unlock();
  myNick = (document.getElementById('nickInput').value || 'Guest').slice(0, 14);
  const code = document.getElementById('joinInput').value.trim();
  if (!code) { statusMsg.textContent = 'کد اتاق رو وارد کن.'; return; }
  statusMsg.textContent = 'در حال اتصال...';
  net.on('clientData', (data) => handleClientData(data));
  net.startClient(code, { name: myNick, team: myTeam }, {
    onOpen: () => { statusMsg.textContent = 'متصل شد! منتظر تایید ورود...'; },
    onError: (err) => { statusMsg.textContent = 'خطا در اتصال: ' + (err.type || err); },
    onClose: () => { statusMsg.textContent = 'اتصال به هاست قطع شد.'; },
  });
};

// ---------- سمت هاست: پردازش داده‌های کلاینت‌ها ----------
function handleHostData(conn, data) {
  if (data.type === 'join') {
    let team = data.team;
    if (!teamHasSpace(world, team)) {
      team = team === 'red' ? 'blue' : 'red';
      if (!teamHasSpace(world, team)) {
        conn.send({ type: 'roomFull' });
        setTimeout(() => conn.close(), 200);
        return;
      }
    }
    addPlayer(world, conn.peer, data.name, team);
    net.state.conns[conn.peer] = conn;
    conn.send({ type: 'welcome', id: conn.peer, settings: world.settings, field: world.field });
    chat.log('sys', `${data.name} به تیم ${team === 'red' ? 'قرمز' : 'آبی'} پیوست.`);
    broadcastPlayerList();
  } else if (data.type === 'input') {
    if (world.players[conn.peer]) world.players[conn.peer]._input = data.input;
  } else if (data.type === 'chat') {
    const p = world.players[conn.peer];
    const text = String(data.text).slice(0, 200);
    broadcastChat(p ? p.name : '؟', p ? p.team : 'red', text);
  } else if (data.type === 'restartRequest') {
    resetMatch(world);
    chat.log('sys', 'بازی جدید شروع شد!');
    net.hostBroadcast({ type: 'chat', name: 'سیستم', team: 'sys', text: 'بازی جدید شروع شد!' });
  }
}

function broadcastPlayerList() {
  const list = Object.entries(world.players).map(([id, p]) => ({ id, name: p.name, team: p.team }));
  net.hostBroadcast({ type: 'playerList', list });
  renderPlayerList(list);
}

function broadcastChat(name, team, text) {
  net.hostBroadcast({ type: 'chat', name, team, text });
  chat.log(team, `${name}: ${text}`);
}

// ---------- سمت کلاینت: پردازش داده‌های هاست ----------
function handleClientData(data) {
  if (data.type === 'welcome') {
    statusMsg.textContent = 'وارد اتاق شدی!';
    world = createWorld(data.settings);
    world.field = data.field;
    enterGame(false);
  } else if (data.type === 'roomFull') {
    statusMsg.textContent = 'اتاق پره (هر دو تیم پر شدن).';
  } else if (data.type === 'state') {
    world.players = data.players;
    world.ball = data.ball;
    world.score = data.score;
    world.match = data.match;
    world.kickoff = data.kickoff;
    applyEventSounds(data.events);
    updateScoreUI();
  } else if (data.type === 'playerList') {
    renderPlayerList(data.list);
  } else if (data.type === 'chat') {
    chat.log(data.team, `${data.name}: ${data.text}`);
  }
}

function applyEventSounds(events) {
  if (!events) return;
  if (events.kicked) sound.kick();
  if (events.wallBounce) sound.wallBounce();
  if (events.goal) sound.goal();
  if (events.matchEnded) sound.whistleEnd();
}

// ---------- ورود به صفحه بازی ----------
function enterGame(isHost) {
  if (!world) world = createWorld({});
  lobby.style.display = 'none';
  gameWrap.style.display = 'flex';
  let last = performance.now();
  requestAnimationFrame(function loop(now) {
    const dt = Math.min(now - last, 50); last = now; // کلیپ برای جلوگیری از پرش فیزیک
    tick(dt, now, isHost);
    requestAnimationFrame(loop);
  });
}

function tick(dtMs, now, isHost) {
  if (isHost) {
    const me = world.players[net.state.myId];
    if (me) me._input = getMyInput();
    const events = stepPhysics(world, dtMs, now);
    if (events.goal) {
      chat.log('sys', `⚽ گل برای تیم ${events.goal === 'red' ? 'قرمز' : 'آبی'}!`);
      net.hostBroadcast({ type: 'chat', name: 'سیستم', team: 'sys', text: `⚽ گل برای تیم ${events.goal === 'red' ? 'قرمز' : 'آبی'}!` });
    }
    applyEventSounds(events);
    net.hostBroadcast({
      type: 'state',
      players: world.players, ball: world.ball, score: world.score,
      match: world.match, kickoff: world.kickoff, events,
    });
    updateScoreUI();
  } else {
    net.sendToHost({ type: 'input', input: getMyInput() });
  }
  renderer.render(world);
  updateRestartUI(isHost);
}

// ---------- دکمه‌ی بازی جدید ----------
restartBtn.onclick = () => {
  sound.click();
  if (net.state.isHost) {
    resetMatch(world);
    chat.log('sys', 'بازی جدید شروع شد!');
    net.hostBroadcast({ type: 'chat', name: 'سیستم', team: 'sys', text: 'بازی جدید شروع شد!' });
  } else {
    net.sendToHost({ type: 'restartRequest' });
  }
};

function updateRestartUI(isHost) {
  const ended = world.match.status === 'ended';
  if (ended !== wasEnded) {
    restartBar.style.display = ended ? 'flex' : 'none';
    restartBtn.style.display = isHost ? 'inline-block' : 'none';
    restartWaitMsg.style.display = (!isHost && ended) ? 'inline' : 'none';
    wasEnded = ended;
  }
}

// ---------- کیبورد ----------
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  keys[e.key] = true;
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

function getMyInput() {
  const kick = !!keys[' '] || kickQueued;
  kickQueued = false;
  return {
    up: !!keys['ArrowUp'], down: !!keys['ArrowDown'],
    left: !!keys['ArrowLeft'], right: !!keys['ArrowRight'],
    kick,
    aim: aimPoint, // نقطه‌ی ماوس برای نشانه‌گیری ۳۶۰ درجه
  };
}

// ---------- UI کمکی ----------
function updateScoreUI() {
  scoreEl.innerHTML = `<span class="red">${world.score.red}</span> : <span class="blue">${world.score.blue}</span>`;
  timerEl.textContent = world.settings.durationMin > 0 ? formatTime(world.match.timeLeftMs) : '∞';
}

function renderPlayerList(list) {
  playerListEl.innerHTML = list.map(p =>
    `<div class="team-${p.team}">${p.team === 'red' ? '🔴' : '🔵'} ${p.name}</div>`
  ).join('');
}

// ---------- چت ----------
document.getElementById('chatForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  if (net.state.isHost) {
    broadcastChat(myNick, myTeam, text);
  } else {
    net.sendToHost({ type: 'chat', text });
    chat.log(myTeam, `${myNick}: ${text}`);
  }
});