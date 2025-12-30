const { io } = require('socket.io-client');
// Simple arg parsing to avoid dependencies
// Re-using simple arg parsing from stress-test.js to avoid dependency issues if yargs isn't instaled locally (though it likely is)

function arg(key, def) {
  const v = process.argv.find(a => a.startsWith(`--${key}=`));
  if (!v) return def;
  const val = v.split('=')[1];
  if (!val) return def;
  const n = Number(val);
  return Number.isNaN(n) ? val : n;
}

const SERVER_URL = process.env.STRESS_SERVER_URL || 'http://localhost:3001';
const ROOM_CODE = arg('room', '');
const CLIENTS = arg('clients', 10);
const RATE_PER_SEC = arg('rate', 3);
const LANGUAGE = arg('lang', 'en'); 
const DURATION = arg('duration', 60); // Fallback duration if server doesn't tell us, or just for safety
// Dictionary loading
const englishDict = LANGUAGE === 'en' ? new Set(require('an-array-of-english-words').map(w => w.toLowerCase())) : null;

if (!ROOM_CODE) {
  console.error('Error: You must provide a room code using --room=CODE');
  process.exit(1);
}

console.log(`🚀 Connecting ${CLIENTS} bots to room ${ROOM_CODE}...`);

// Grid solver helpers (copied from stress-test.js)
function onBoardWord(grid, minLen = 3, maxLen = 6) {
    const rows = grid.length;
    const cols = grid[0].length;
    const dirs = [[-1, -1], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 1]];
    // Simple random walk
    let attempts = 0;
    while(attempts < 50) {
        attempts++;
        let r = Math.floor(Math.random() * rows);
        let c = Math.floor(Math.random() * cols);
        const letters = [grid[r][c]];
        const len = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
        let valid = true;
        for (let i = 1; i < len; i++) {
            const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
            const nr = r + dx, nc = c + dy;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) { valid = false; break; }
            r = nr; c = nc;
            letters.push(grid[r][c]);
        }
        if (valid) return letters.join('').toLowerCase();
    }
    return "abc"; // Fallback
}

function buildCandidates(grid, minLen = 3, maxLen = 6) {
  const rows = grid.length;
  const cols = grid[0].length;
  const dirs = [[-1, -1], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 1]];
  const out = new Set();
  
  function dfs(r, c, currentWord, visited) {
      if (currentWord.length >= minLen) out.add(currentWord.toLowerCase());
      if (currentWord.length >= maxLen) return;

      for (const [dx, dy] of dirs) {
          const nr = r + dx, nc = c + dy;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(`${nr},${nc}`)) {
              visited.add(`${nr},${nc}`);
              dfs(nr, nc, currentWord + grid[nr][nc], visited);
              visited.delete(`${nr},${nc}`);
          }
      }
  }

  for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
          const visited = new Set([`${r},${c}`]);
          dfs(r, c, grid[r][c], visited);
      }
  }
  return Array.from(out);
}

const clients = [];

async function main() {
    for (let i = 0; i < CLIENTS; i++) {
        const s = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
        
        s.on('connect', () => {
             const username = `Bot-${i+1}`;
             s.emit('join', { gameCode: ROOM_CODE, username, playerId: `bot-${Date.now()}-${i}` });
        });

        s.on('startGame', (payload) => {
            console.log(`Bot ${i+1} detected game start!`);
            if (payload && payload.messageId) s.emit('startGameAck', { messageId: payload.messageId });

            const grid = payload.letterGrid;
            if (!grid) return;

            // Find words
            let candidates = buildCandidates(grid);
            if (englishDict) {
                candidates = candidates.filter(w => englishDict.has(w));
            }
            // If no dictionary words found (or non-english), use raw grid words
            if (candidates.length === 0) candidates = [onBoardWord(grid)];

            // Start submitting
            const interval = setInterval(() => {
                const w = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : "test";
                s.emit('submitWord', { word: w });
            }, Math.max(50, 1000 / RATE_PER_SEC));
            
            // Stop after duration (or when game ends)
             s.on('endGame', () => {
                 clearInterval(interval);
                 console.log(`Bot ${i+1} game ended.`);
             });
        });
        
        clients.push(s);
        // Stagger connection slightly
        await new Promise(r => setTimeout(r, 50));
    }
    console.log(`All ${CLIENTS} bots connected. Waiting for Host to start game...`);
}

main();
