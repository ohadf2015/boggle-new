const { io } = require('socket.io-client');

const SERVER_URL = process.env.STRESS_SERVER_URL || 'http://localhost:3001';
const DURATION = 30; // 30 seconds test
const CLIENTS = 10;

console.log(`[Stability Test] Connecting to ${SERVER_URL}`);

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

// Helper to simulate a client
class TestClient {
  constructor(gameCode, index) {
    this.gameCode = gameCode;
    this.username = `StableUser${index}`;
    this.playerId = `stable-p-${index}`;
    this.socket = null;
    this.connected = false;
  }

  async connect() {
    this.socket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
    await new Promise(resolve => this.socket.on('connect', resolve));
    this.connected = true;
    
    // Join
    this.socket.emit('join', { gameCode: this.gameCode, username: this.username, playerId: this.playerId });
    
    // Listeners
    this.socket.on('joined', () => {});
    this.socket.on('reconnect', () => {});
  }

  async disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }

  async reconnect() {
    await this.disconnect();
    // Short random delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
    await this.connect();
    // Reconnection logic in backend handles state restoration
  }
}

async function runStabilityTest() {
  const gameCode = randomCode();
  const roomName = `Stability-${gameCode}`;
  
  // 1. Host
  const host = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
  await new Promise(resolve => host.on('connect', resolve));
  host.emit('createGame', { gameCode, roomName, language: 'en', hostUsername: 'Host', playerId: 'host-stable' });
  await new Promise(resolve => host.on('joined', resolve));
  console.log('[Stability Test] Game Created');

  // 2. Clients
  const clients = [];
  for (let i = 0; i < CLIENTS; i++) {
    const c = new TestClient(gameCode, i);
    await c.connect();
    clients.push(c);
  }
  console.log(`[Stability Test] ${CLIENTS} Clients Connected`);

  // 3. Start Game
  const grid = makeGrid();
  host.emit('startGame', { letterGrid: grid, timerSeconds: DURATION, language: 'en' });
  console.log('[Stability Test] Game Started');

  // 4. Chaos Loop
  const chaosInterval = setInterval(async () => {
    // Pick a random client to flap
    const idx = Math.floor(Math.random() * CLIENTS);
    const client = clients[idx];
    console.log(`[Stability Test] Flapping connection for ${client.username}...`);
    try {
      await client.reconnect();
    } catch (e) {
      console.error(`[Stability Test] Reconnect failed for ${client.username}:`, e.message);
    }
  }, 2000); // Flap someone every 2s

  // 5. Submission Loop (keep load up)
  const submitInterval = setInterval(() => {
    clients.forEach(c => {
      if (c.connected && c.socket) {
        c.socket.emit('submitWord', { word: 'STABLE' });
      }
    });
  }, 500);

  // Wait for duration
  await new Promise(resolve => setTimeout(resolve, DURATION * 1000));

  clearInterval(chaosInterval);
  clearInterval(submitInterval);

  console.log('[Stability Test] Ending Game...');
  host.emit('endGame');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify server is still responsive by creating a new game
  const checkSocket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
  let responsive = false;
  try {
     await new Promise((resolve, reject) => {
         const to = setTimeout(() => reject(new Error('Timeout')), 5000);
         checkSocket.on('connect', () => {
             checkSocket.emit('createGame', { gameCode: randomCode(), roomName: 'Check', hostUsername: 'Check' });
             checkSocket.on('joined', () => {
                 clearTimeout(to);
                 responsive = true;
                 resolve();
             });
         });
     });
  } catch (e) {
      console.error('[Stability Test] Server Unresponsive after chaos!');
  }

  // Cleanup
  clients.forEach(c => c.disconnect());
  host.disconnect();
  checkSocket.disconnect();

  if (responsive) {
      console.log('[Stability Test] PASSED: Server survived connection chaos.');
      process.exit(0);
  } else {
      console.log('[Stability Test] FAILED: Server unresponsive.');
      process.exit(1);
  }
}

runStabilityTest().catch(console.error);
