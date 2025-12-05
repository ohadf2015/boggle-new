/**
 * Peer Validation Manager Module
 * Handles AI-approved word tracking and peer validation voting
 * Extracted from gameStateManager.js for better modularity
 */

/**
 * Track an AI-approved word for potential peer validation
 * @param {object} game - Game object
 * @param {string} word - The AI-approved word
 * @param {string} submitter - Username who submitted the word
 * @param {number} score - Score for this word
 * @param {number} confidence - AI confidence score (0-100)
 */
function trackAiApprovedWord(game, word, submitter, score, confidence) {
  if (!game) return;

  if (!game.aiApprovedWords) {
    game.aiApprovedWords = [];
  }

  game.aiApprovedWords.push({
    word: word.toLowerCase(),
    submitter,
    score,
    confidence,
    timestamp: Date.now()
  });
}

/**
 * Track a bot-submitted word for potential peer validation
 * Bot words appear in the "is this real word?" modal and can be blacklisted if rejected
 * @param {object} game - Game object
 * @param {string} word - The word submitted by bot
 * @param {string} botUsername - Bot username
 * @param {number} score - Score for this word
 */
function trackBotWord(game, word, botUsername, score) {
  if (!game) return;

  // Track bot words separately for potential validation
  if (!game.botWords) {
    game.botWords = [];
  }

  // Also add to aiApprovedWords pool so they can be shown in peer validation
  // Bot words mix with AI-validated words for community validation
  if (!game.aiApprovedWords) {
    game.aiApprovedWords = [];
  }

  const wordData = {
    word: word.toLowerCase(),
    submitter: botUsername,
    score,
    isBot: true, // Mark as bot word for blacklist handling
    timestamp: Date.now()
  };

  game.botWords.push(wordData);
  game.aiApprovedWords.push(wordData);
}

/**
 * Select a random AI-approved word for peer validation
 * Excludes words from a specific submitter if needed
 * @param {object} game - Game object
 * @returns {object|null} - The selected word object or null if none available
 */
function selectWordForPeerValidation(game) {
  if (!game || !game.aiApprovedWords || game.aiApprovedWords.length === 0) {
    return null;
  }

  // Randomly select one word from the AI-approved list
  const randomIndex = Math.floor(Math.random() * game.aiApprovedWords.length);
  const selectedWord = game.aiApprovedWords[randomIndex];

  game.peerValidationWord = selectedWord;
  game.peerValidationVotes = {};

  return selectedWord;
}

/**
 * Record a peer validation vote
 * @param {object} game - Game object
 * @param {string} username - Username who is voting
 * @param {boolean} isValid - True if player thinks word is valid
 * @returns {object} - { success, totalVotes, invalidVotes, shouldReject }
 */
function recordPeerValidationVote(game, username, isValid) {
  if (!game || !game.peerValidationWord) {
    return { success: false, error: 'No word for peer validation' };
  }

  // Don't allow the submitter to vote on their own word
  if (username === game.peerValidationWord.submitter) {
    return { success: false, error: 'Cannot vote on your own word' };
  }

  // Record the vote (only one vote per user)
  if (!game.peerValidationVotes) {
    game.peerValidationVotes = {};
  }

  // Only allow one vote per player
  if (game.peerValidationVotes[username]) {
    return { success: false, error: 'Already voted' };
  }

  game.peerValidationVotes[username] = isValid ? 'valid' : 'invalid';

  // Count votes
  const votes = Object.values(game.peerValidationVotes);
  const invalidVotes = votes.filter(v => v === 'invalid').length;
  const totalVotes = votes.length;

  // Check if word should be rejected (more than 3 players said invalid)
  const shouldReject = invalidVotes > 3;

  return {
    success: true,
    totalVotes,
    invalidVotes,
    validVotes: votes.filter(v => v === 'valid').length,
    shouldReject,
    word: game.peerValidationWord.word,
    submitter: game.peerValidationWord.submitter,
    isBot: game.peerValidationWord.isBot || false // Track if it's a bot word for blacklisting
  };
}

/**
 * Get the peer validation word info
 * @param {object} game - Game object
 * @returns {object|null} - The peer validation word or null
 */
function getPeerValidationWord(game) {
  if (!game) return null;
  return game.peerValidationWord || null;
}

/**
 * Remove score for a peer-rejected word
 * @param {object} game - Game object
 * @param {string} word - The rejected word
 * @param {string} submitter - Username who submitted the word
 * @returns {number} - Score that was removed
 */
function removePeerRejectedWordScore(game, word, submitter) {
  if (!game) return 0;

  // Find the word in playerWordDetails and mark as invalidated
  const wordDetails = game.playerWordDetails?.[submitter] || [];
  const wordDetail = wordDetails.find(wd => wd.word === word.toLowerCase());

  if (!wordDetail) return 0;

  const scoreRemoved = wordDetail.score || 0;

  // Mark word as invalidated by peers
  wordDetail.validated = false;
  wordDetail.peerRejected = true;

  // Subtract score from player
  if (game.playerScores[submitter]) {
    game.playerScores[submitter] = Math.max(0, game.playerScores[submitter] - scoreRemoved);
  }

  return scoreRemoved;
}

/**
 * Reset peer validation state for a new round
 * @param {object} game - Game object
 */
function resetPeerValidation(game) {
  if (!game) return;

  game.aiApprovedWords = [];
  game.botWords = [];
  game.peerValidationWord = null;
  game.peerValidationVotes = {};
}

/**
 * Get peer validation statistics for a game
 * @param {object} game - Game object
 * @returns {object} - Statistics about peer validation
 */
function getPeerValidationStats(game) {
  if (!game) return { aiApprovedCount: 0, botWordCount: 0, currentValidation: null };

  return {
    aiApprovedCount: game.aiApprovedWords?.length || 0,
    botWordCount: game.botWords?.length || 0,
    currentValidation: game.peerValidationWord ? {
      word: game.peerValidationWord.word,
      submitter: game.peerValidationWord.submitter,
      voteCount: Object.keys(game.peerValidationVotes || {}).length,
    } : null,
  };
}

module.exports = {
  // AI word tracking
  trackAiApprovedWord,
  trackBotWord,

  // Peer validation
  selectWordForPeerValidation,
  recordPeerValidationVote,
  getPeerValidationWord,
  removePeerRejectedWordScore,
  resetPeerValidation,

  // Statistics
  getPeerValidationStats,
};
