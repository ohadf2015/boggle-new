const counters = {
  wordAccepted: 0,
  wordNotOnBoard: 0,
  wordNeedsValidation: 0,
  rateLimited: 0,
  eventLoopLagMs: 0
};

const perRoom = new Map();

function inc(name, by = 1) {
  if (counters[name] === undefined) return;
  counters[name] += by;
}

function incPerGame(gameCode, name, by = 1) {
  if (!gameCode) return;
  const current = perRoom.get(gameCode) || {
    wordAccepted: 0,
    wordNotOnBoard: 0,
    wordNeedsValidation: 0,
    rateLimited: 0
  };
  if (current[name] === undefined) current[name] = 0;
  current[name] += by;
  perRoom.set(gameCode, current);
}

function getMetrics() {
  return { ...counters };
}

function getRoomMetrics() {
  const out = [];
  for (const [gameCode, m] of perRoom.entries()) {
    out.push({ gameCode, ...m });
  }
  return out;
}

function resetAll() {
  counters.wordAccepted = 0;
  counters.wordNotOnBoard = 0;
  counters.wordNeedsValidation = 0;
  counters.rateLimited = 0;
  counters.eventLoopLagMs = 0;
  perRoom.clear();
}

function setEventLoopLag(ms) {
  counters.eventLoopLagMs = ms;
}

function ensureGame(gameCode) {
  if (!gameCode) return;
  if (!perRoom.has(gameCode)) {
    perRoom.set(gameCode, {
      wordAccepted: 0,
      wordNotOnBoard: 0,
      wordNeedsValidation: 0,
      rateLimited: 0
    });
  }
}

module.exports = { inc, incPerGame, getMetrics, getRoomMetrics, ensureGame, resetAll, setEventLoopLag };