const { io } = require('socket.io-client');

function arg(key, def) {
  const v = process.argv.find(a => a.startsWith(`--${key}=`));
  if (!v) return def;
  const val = v.split('=')[1];
  const n = Number(val);
  return Number.isNaN(n) ? val : n;
}

const SERVER_URL = process.env.STRESS_SERVER_URL || 'http://localhost:3001';
const CLIENTS = arg('clients', 100);
const DURATION = arg('duration', 30);
const RATE_PER_SEC = arg('rate', 3);
const LANGUAGE = arg('lang', 'en');
const ROOMS = arg('rooms', 1);
const RAMP_MS = arg('rampMs', 2000);
const DICT_RATIO = Math.min(1, Math.max(0, Number(arg('dictRatio', 0.6))));
const OUT_FILE = arg('out', '');
const englishDict = LANGUAGE === 'en' ? new Set(require('an-array-of-english-words').map(w => w.toLowerCase())) : null;

function randomCode() {
  return Math.random().toString(36).toUpperCase().slice(2, 8);
}

function makeGrid(rows = 6, cols = 6) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(letters[Math.floor(Math.random() * letters.length)]);
    }
    grid.push(row);
  }
  return grid;
}

// Generate on-board word along one of the allowed directions (horizontal or diagonals)
function onBoardWord(grid, minLen = 3, maxLen = 6) {
  const rows = grid.length;
  const cols = grid[0].length;
  const dirs = [
    [-1, -1], [-1, 1],
    [0, -1],  [0, 1],
    [1, -1],  [1, 1]
  ];
  const startRow = Math.floor(Math.random() * rows);
  const startCol = Math.floor(Math.random() * cols);
  const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
  const len = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
  const letters = [];
  let r = startRow, c = startCol;
  letters.push(grid[r][c]);
  for (let i = 1; i < len; i++) {
    const nr = r + dx;
    const nc = c + dy;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) break;
    r = nr; c = nc;
    letters.push(grid[r][c]);
  }
  const w = letters.join('').toLowerCase();
  return w.length >= minLen ? w : onBoardWord(grid, minLen, maxLen);
}

function buildCandidates(grid, minLen = 3, maxLen = 6) {
  const rows = grid.length;
  const cols = grid[0].length;
  const dirs = [
    [-1, -1], [-1, 1],
    [0, -1],  [0, 1],
    [1, -1],  [1, 1]
  ];
  const out = new Set();
  for (let sr = 0; sr < rows; sr++) {
    for (let sc = 0; sc < cols; sc++) {
      for (const [dx, dy] of dirs) {
        let r = sr, c = sc;
        const letters = [grid[r][c]];
        for (let i = 1; i < maxLen; i++) {
          const nr = r + dx;
          const nc = c + dy;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) break;
          r = nr; c = nc;
          letters.push(grid[r][c]);
          if (letters.length >= minLen) out.add(letters.join('').toLowerCase());
        }
      }
    }
  }
  return Array.from(out);
}

async function runRoom(roomIndex, clientsInRoom) {
  const gameCode = randomCode();
  const roomName = `Stress-${roomIndex + 1}-${gameCode}`;
  const metrics = {
    connected: 0,
    joined: 0,
    submissions: 0,
    accepted: 0,
    rejected: 0,
    needsValidation: 0,
    errors: 0,
    spectators: 0
  };

  const host = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
  await new Promise(resolve => host.on('connect', resolve));
  metrics.connected++;
  host.emit('createGame', { gameCode, roomName, language: LANGUAGE, hostUsername: `Host${roomIndex + 1}`, playerId: `host-${roomIndex + 1}` });
  await new Promise(resolve => host.on('joined', resolve));
  host.on('showValidation', (data) => {
    const seen = new Map();
    for (const p of data.playerWords || []) {
      for (const w of p.words || []) {
        if (!seen.has(w.word)) {
          seen.set(w.word, !!w.autoValidated);
        }
      }
    }
    const validations = Array.from(seen.entries()).map(([word, isValid]) => ({ word, isValid }));
    host.emit('validateWords', { validations });
  });

  const clients = [];
  const joinedFlags = new Map();
  for (let i = 0; i < clientsInRoom; i++) {
    const s = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
    await new Promise(resolve => s.on('connect', resolve));
    metrics.connected++;
    const username = `R${roomIndex + 1}P${i + 1}`;
    s.emit('join', { gameCode, username, playerId: `r${roomIndex + 1}p${i + 1}` });
    s.on('joined', () => { metrics.joined++; joinedFlags.set(s.id, true); });
    s.on('joinedAsSpectator', () => { metrics.spectators++; joinedFlags.set(s.id, false); });
    s.on('startGame', (payload) => { if (payload && payload.messageId) { s.emit('startGameAck', { messageId: payload.messageId }); } });
    s.on('wordAccepted', () => { metrics.accepted++; });
    s.on('wordNotOnBoard', () => { metrics.rejected++; });
    s.on('wordNeedsValidation', () => { metrics.needsValidation++; });
    s.on('error', () => { metrics.errors++; });
    clients.push(s);
  }

  const grid = makeGrid(6, 6);
  const candidates = buildCandidates(grid);
  const dictionaryCandidates = englishDict ? candidates.filter(w => englishDict.has(w)) : [];
  host.emit('startGame', { letterGrid: grid, timerSeconds: DURATION, language: LANGUAGE });

  const intervalHandles = [];
  for (const s of clients) {
    const isPlayer = joinedFlags.get(s.id) !== false;
    const startDelay = Math.floor(Math.random() * RAMP_MS);
    const h = setTimeout(() => {
      if (!isPlayer) return; // spectators don't submit
      const ih = setInterval(() => {
        const w = dictionaryCandidates.length > 0 ? dictionaryCandidates[Math.floor(Math.random() * dictionaryCandidates.length)] : onBoardWord(grid);
        s.emit('submitWord', { word: w });
        metrics.submissions++;
      }, Math.max(50, 1000 / RATE_PER_SEC));
      intervalHandles.push(ih);
    }, startDelay);
    intervalHandles.push(h);
  }

  await new Promise(resolve => setTimeout(resolve, DURATION * 1000));

  for (const h of intervalHandles) clearInterval(h);
  host.emit('endGame');

  for (const s of clients) s.disconnect();
  host.disconnect();

  return { gameCode, roomName, metrics };
}

async function main() {
  const perRoom = [];
  const clientsPerRoom = Math.min(50, Math.ceil(CLIENTS / ROOMS));
  for (let r = 0; r < ROOMS; r++) {
    const result = await runRoom(r, clientsPerRoom);
    perRoom.push(result);
  }
  const agg = {
    server: SERVER_URL,
    rooms: ROOMS,
    clientsTotal: CLIENTS,
    clientsPerRoom,
    durationSeconds: DURATION,
    ratePerSec: RATE_PER_SEC,
    connected: perRoom.reduce((a, b) => a + b.metrics.connected, 0),
    joined: perRoom.reduce((a, b) => a + b.metrics.joined, 0),
    spectators: perRoom.reduce((a, b) => a + b.metrics.spectators, 0),
    submissions: perRoom.reduce((a, b) => a + b.metrics.submissions, 0),
    accepted: perRoom.reduce((a, b) => a + b.metrics.accepted, 0),
    rejected: perRoom.reduce((a, b) => a + b.metrics.rejected, 0),
    needsValidation: perRoom.reduce((a, b) => a + b.metrics.needsValidation, 0),
    errors: perRoom.reduce((a, b) => a + b.metrics.errors, 0),
    roomsBreakdown: perRoom.map(r => ({ gameCode: r.gameCode, roomName: r.roomName, metrics: r.metrics }))
  };
  const out = JSON.stringify(agg, null, 2);
  console.log(out);
  if (OUT_FILE && typeof OUT_FILE === 'string' && OUT_FILE.length > 0) {
    const fs = require('fs');
    try {
      fs.writeFileSync(OUT_FILE, out);
    } catch (e) {}
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});