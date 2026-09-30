/**
 * P6 live-E2E scripted student: joins a classroom wordcraft room as a guest,
 * waits for wordcraft:init, requests state, places the first lesson word the
 * rack can build, and reports every wire event. Run:
 *   npx tsx scripts/p6-scripted-student.ts <CODE> [username]
 */
import '../server/loadEnv';
import { io, type Socket } from 'socket.io-client';

const code = process.argv[2];
const username = process.argv[3] || 'P6 Script Student';
if (!code) throw new Error('usage: p6-scripted-student.ts <CODE> [username]');

const socket: Socket = io('http://localhost:3001', { transports: ['websocket'] });
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

let myState: {
  rack: Array<{ id: string; letter: string; value: number }>;
  targets: string[];
} | null = null;

socket.on('connect', () => {
  log('connected, joining', code, 'as', username);
  socket.emit('join', { gameCode: code, username, language: 'en' });
});

socket.on('joined', (d: unknown) => log('JOINED', JSON.stringify(d).slice(0, 200)));
socket.on('error', (e: unknown) => log('ERROR', JSON.stringify(e).slice(0, 300)));
socket.on('startGame', (d: { gameMode?: string }) => log('START GAME mode=', d?.gameMode));
socket.on('updateLeaderboard', (d: { leaderboard?: Array<{ username: string; score: number }> }) =>
  log('LEADERBOARD', JSON.stringify(d?.leaderboard)));
socket.on('wordcraft:activity', (d: unknown) => log('ACTIVITY', JSON.stringify(d).slice(0, 200)));

socket.on('wordcraft:init', (d: { targets?: string[] }) => {
  log('WORDCRAFT INIT targets=', JSON.stringify(d?.targets));
  socket.emit('wordcraft:requestState', { gameCode: code });
});

socket.on('wordcraft:state', (d: typeof myState) => {
  myState = d;
  log('STATE rack=', JSON.stringify(d?.rack), 'targets=', JSON.stringify(d?.targets));
  attemptPlace();
});

socket.on('wordcraft:placeResult', (d: unknown) => {
  log('PLACE RESULT', JSON.stringify(d).slice(0, 400));
});

function attemptPlace(): void {
  if (!myState || !myState.targets?.length) return;
  const word = myState.targets[0].toLowerCase();
  const rack = [...myState.rack];
  const placements: Array<{ rackTileId: string; row: number; col: number }> = [];
  for (let i = 0; i < word.length; i++) {
    const tileIdx = rack.findIndex((t) => t.letter.toLowerCase() === word[i]);
    if (tileIdx === -1) {
      log('cannot build', word, 'from rack — waiting for Baron/manual');
      return;
    }
    placements.push({ rackTileId: rack[tileIdx].id, row: 4, col: 4 + i - Math.floor(word.length / 2) });
    rack.splice(tileIdx, 1);
  }
  const cols = placements.map((p) => p.col);
  if (Math.max(...cols) > 8) placements.forEach((p) => (p.col -= Math.max(...cols) - 8));
  log('PLACING', word, JSON.stringify(placements));
  socket.emit('wordcraft:place', { gameCode: code, placements, direction: 'horizontal' });
}

process.on('SIGINT', () => process.exit(0));
setTimeout(() => { log('timeout — exiting'); process.exit(2); }, 180000);
