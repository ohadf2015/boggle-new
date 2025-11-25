// Game state management utilities

const games = {};
// Use Map instead of plain objects to properly store WebSocket as keys
const gameWs = new Map();
const wsUsername = new Map();

// Get active rooms (show all rooms while host is present)
const getActiveRooms = () => {
  return Object.keys(games).map(gameCode => ({
    gameCode,
    roomName: games[gameCode].roomName || `Room ${gameCode}`,
    playerCount: Object.keys(games[gameCode].users).length,
    gameState: games[gameCode].gameState,
    language: games[gameCode].language || 'en', // Default to English if not set
  }));
};

// Get game by code
const getGame = (gameCode) => games[gameCode];

// Get username from WebSocket
const getUsernameFromWs = (ws) => wsUsername.get(ws);

// Get host WebSocket from game code
const getWsHostFromGameCode = (gameCode) => games[gameCode]?.host;

// Get WebSocket from username in a game
const getWsFromUsername = (gameCode, username) => games[gameCode]?.users[username];

// Get game code from username
const getGameCodeFromUsername = (username) => {
  for (const gameCode in games) {
    if (games[gameCode].users[username]) {
      return gameCode;
    }
  }
  return null;
};

// Delete game
const deleteGame = (gameCode) => {
  if (games[gameCode]) {
    delete games[gameCode];
  }
};

// Get tournament ID from game code
const getTournamentIdFromGame = (gameCode) => {
  return games[gameCode]?.tournamentId || null;
};

// Set tournament ID for a game
const setTournamentIdForGame = (gameCode, tournamentId) => {
  if (games[gameCode]) {
    games[gameCode].tournamentId = tournamentId;
    return true;
  }
  return false;
};

module.exports = {
  games,
  gameWs,
  wsUsername,
  getActiveRooms,
  getGame,
  getUsernameFromWs,
  getWsHostFromGameCode,
  getWsFromUsername,
  getGameCodeFromUsername,
  deleteGame,
  getTournamentIdFromGame,
  setTournamentIdForGame
};
