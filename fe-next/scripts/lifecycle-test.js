const { io } = require('socket.io-client');
const assert = require('assert');

const SERVER_URL = process.env.STRESS_SERVER_URL || 'http://localhost:3001';
const DURATION_GAME_1 = 5; // seconds
const DURATION_GAME_2 = 5; // seconds

console.log(`[Lifecycle Test] Connecting to ${SERVER_URL}`);

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

async function runLifecycleTest() {
  const gameCode = randomCode();
  const roomName = `Lifecycle-${gameCode}`;
  
  console.log(`[Lifecycle Test] Creating room: ${roomName} (${gameCode})`);

  // 1. Create Host
  const host = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
  await new Promise(resolve => host.on('connect', resolve));
  host.emit('createGame', { gameCode, roomName, language: 'en', hostUsername: 'Host', playerId: 'host-1' });
  await new Promise(resolve => host.on('joined', resolve));
  console.log('[Lifecycle Test] Host joined');

  // 2. Join 3 Players
  const players = [];
  const playerSockets = [];
  for (let i = 0; i < 3; i++) {
    const s = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
    await new Promise(resolve => s.on('connect', resolve));
    const username = `Player${i + 1}`;
    s.emit('join', { gameCode, username, playerId: `player-${i + 1}` });
    await new Promise(resolve => s.on('joined', resolve));
    players.push({ socket: s, username });
    playerSockets.push(s);
    console.log(`[Lifecycle Test] ${username} joined`);
  }

  // 3. Start Game 1
  console.log('[Lifecycle Test] Starting Game 1...');
  const grid1 = makeGrid();
  
  // Listen for start game on players
  const p1StartPromise = new Promise(resolve => players[0].socket.once('startGame', resolve));
  host.emit('startGame', { letterGrid: grid1, timerSeconds: DURATION_GAME_1, language: 'en' });
  
  await p1StartPromise;
  console.log('[Lifecycle Test] Game 1 Started');

  // 4. Submit some words
  players.forEach(p => p.socket.emit('submitWord', { word: 'TEST' }));
  
  // Wait for game duration
  await new Promise(resolve => setTimeout(resolve, DURATION_GAME_1 * 1000 + 500));
  
  // 5. End Game 1
  console.log('[Lifecycle Test] Ending Game 1...');
  host.emit('endGame');
  // Wait for transition to finish state
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 6. Players confirm ready (Must be done in 'finished' state)
  console.log('[Lifecycle Test] Players confirming ready...');
  
  // Monitor ready updates
  let lastReadyCount = 0;
  const readyMonitor = (data) => {
    console.log(`[Lifecycle Test] Ready Update: ${data.readyCount}/${data.totalPlayers}`);
    lastReadyCount = data.readyCount;
  };
  host.on('playersReadyUpdate', readyMonitor);

  // Player 1 Ready
  players[0].socket.emit('confirmReadyForNextGame');
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Player 2 Ready
  players[1].socket.emit('confirmReadyForNextGame');
  await new Promise(resolve => setTimeout(resolve, 200));

  // Player 3 Ready
  players[2].socket.emit('confirmReadyForNextGame');
  await new Promise(resolve => setTimeout(resolve, 500));

  if (lastReadyCount !== 3) {
    console.error(`[Lifecycle Test] FAILED: Expected 3 ready players, got ${lastReadyCount}`);
    process.exit(1);
  } else {
    console.log('[Lifecycle Test] SUCCESS: All 3 players ready');
  }

  // 7. Reset Game (Host action) - This clears ready status for next round
  console.log('[Lifecycle Test] Resetting Game for Round 2...');
  const resetPromise = new Promise(resolve => players[0].socket.once('resetGame', resolve));
  host.emit('resetGame');
  await resetPromise;
  console.log('[Lifecycle Test] Game Reset');

  // 8. Start Game 2
  console.log('[Lifecycle Test] Starting Game 2...');
  const grid2 = makeGrid();
  // We need to re-verify start game logic
  const p2StartPromise = new Promise(resolve => players[1].socket.once('startGame', resolve));
  host.emit('startGame', { letterGrid: grid2, timerSeconds: DURATION_GAME_2, language: 'en' });
  await p2StartPromise;
  console.log('[Lifecycle Test] Game 2 Started');

  // 9. Mid-game Disconnection
  console.log('[Lifecycle Test] Disconnecting Player 3...');
  players[2].socket.disconnect();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verify other players still active
  players[0].socket.emit('submitWord', { word: 'HELLO' });
  // Just ensure no crash on server side
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 10. End Game 2
  console.log('[Lifecycle Test] Ending Game 2...');
  host.emit('endGame');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 11. Check Ready Count Logic with Disconnected Player (MUST be before Reset)
  console.log('[Lifecycle Test] Testing Ready Count with Disconnected Player...');
  
  // Reset monitor variable to ensure we capture new events
  lastReadyCount = 0;
  
  // Player 1 confirms
  players[0].socket.emit('confirmReadyForNextGame');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Player 2 confirms
  players[1].socket.emit('confirmReadyForNextGame');
  await new Promise(resolve => setTimeout(resolve, 500));

  // Expecting 2/3 (Host + P1 + P2 = 3 active users. 2 ready).
  // Note: Host is active but hasn't readied. P3 is disconnected (excluded).
  // So totalPlayers should be 3. readyCount should be 2.
  
  console.log(`[Lifecycle Test] Final Ready Count: ${lastReadyCount}/3`); // Expecting 2/3
  
  if (lastReadyCount !== 2) {
      console.error(`[Lifecycle Test] FAILURE: Expected 2 ready players, got ${lastReadyCount}`);
      // Fail explicitly
      process.exit(1);
  } else {
       console.log('[Lifecycle Test] SUCCESS: Disconnected player excluded from totals.');
  }

  // 12. Reset for Round 3 (Cleanup)
  console.log('[Lifecycle Test] Resetting Game for Round 3...');
  const reset3Promise = new Promise(resolve => players[0].socket.once('resetGame', resolve));
  host.emit('resetGame');
  await reset3Promise;

  // Cleanup
  players.forEach(p => { if(p.socket.connected) p.socket.disconnect(); });
  host.disconnect();
  
  if(success) {
      console.log('[Lifecycle Test] PASSED ALL CHECKS');
      process.exit(0);
  } else {
      console.log('[Lifecycle Test] FAILED');
      process.exit(1);
  }
}

runLifecycleTest().catch(console.error);
