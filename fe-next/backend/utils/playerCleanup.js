/**
 * Player Cleanup Utilities
 * Centralized logic for cleaning up player data when they leave a game
 */

/**
 * Clean up all player-specific data from a game
 * @param {object} game - The game object
 * @param {string} username - The username to clean up
 */
function cleanupPlayerData(game, username) {
  if (!game) return;

  // Clean up all player-specific data structures
  if (game.playerScores) {
    delete game.playerScores[username];
  }

  if (game.playerWords) {
    delete game.playerWords[username];
  }

  if (game.playerAchievements) {
    delete game.playerAchievements[username];
  }

  if (game.playerWordDetails) {
    delete game.playerWordDetails[username];
  }

  if (game.playerCombos) {
    delete game.playerCombos[username];
  }

  // Note: playerAvatars has been deprecated and removed
  // Avatar data is now stored in game.users[username].avatar
}

module.exports = {
  cleanupPlayerData
};
