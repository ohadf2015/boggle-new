"use strict";
/**
 * Scoring Calculation Utilities
 * Handles word scoring, combo bonuses, and final game score calculation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComboMultiplier = getComboMultiplier;
exports.getComboBonus = getComboBonus;
exports.calculateWordScore = calculateWordScore;
exports.calculateGameScores = calculateGameScores;
/**
 * Get combo multiplier based on combo level
 * Higher combo levels give better multipliers
 * Combo 0-2: x1.0 (no bonus for small combos)
 * Combo 3-4: x1.25
 * Combo 5-6: x1.5
 * Combo 7-8: x1.75
 * Combo 9-10: x2.0
 * Combo 11+: x2.25 (max)
 */
function getComboMultiplier(comboLevel) {
    if (comboLevel <= 2)
        return 1.0;
    if (comboLevel <= 4)
        return 1.25;
    if (comboLevel <= 6)
        return 1.5;
    if (comboLevel <= 8)
        return 1.75;
    if (comboLevel <= 10)
        return 2.0;
    return 2.25; // Max multiplier at combo 11+
}
/**
 * Get flat combo bonus based on combo level and word length
 * Combo bonus now scales with word length to reward longer words in combos
 * Formula: comboBonus = floor(comboLevel * wordLengthFactor)
 * Optimized to help slower/perfectionist players who find quality words
 * wordLengthFactor: 3 letters = 0.2, 4 letters = 0.5, 5 letters = 1.0, 6 letters = 1.5, 7+ letters = 2.0
 */
function getComboBonus(comboLevel, wordLength = 4) {
    if (comboLevel <= 0)
        return 0; // No bonus for combo 0
    // Word length factor - longer words get significantly better combo bonuses
    // This rewards perfectionist players who find quality words
    // Short words still get minimal combo benefit to discourage short word spam
    let wordLengthFactor;
    if (wordLength <= 3) {
        wordLengthFactor = 0.2; // Very short words - minimal combo bonus
    }
    else if (wordLength === 4) {
        wordLengthFactor = 0.5; // Short words - modest combo bonus
    }
    else if (wordLength === 5) {
        wordLengthFactor = 1.0; // Medium words - full base bonus
    }
    else if (wordLength === 6) {
        wordLengthFactor = 1.5; // Good words - 1.5x bonus
    }
    else {
        wordLengthFactor = 2.0; // Long words (7+) - 2x bonus (perfectionist reward)
    }
    // Base bonus scales with combo level, starting from combo 1
    // This helps slower players who build combos more deliberately
    const baseBonus = Math.min(comboLevel, 10); // Caps at 10 bonus points base
    return Math.floor(baseBonus * wordLengthFactor);
}
/**
 * Calculate score based on word length - 1 point per letter beyond the first
 * This gives every letter value: 2 letters = 1 point, 3 letters = 2 points, 4 letters = 3 points, etc.
 * Combo bonus is applied based on word length (longer words benefit more from combos)
 * Fire round multiplier (2x during earthquake fire round) is applied to the final score
 */
function calculateWordScore(word, comboLevel = 0, fireRoundMultiplier = 1) {
    const length = word.length;
    if (length === 1)
        return 0; // Single letters not allowed
    const baseScore = length - 1; // Each letter beyond the first gets 1 point
    const bonus = getComboBonus(comboLevel, length);
    return (baseScore + bonus) * fireRoundMultiplier;
}
/**
 * Calculate final game scores for all players
 */
function calculateGameScores(game, wordCountMap = {}, dictionaryValidatedWords = new Set(), communityValidatedWords = new Set(), aiValidatedWords = new Map(), options = {}) {
    const { playerCount = 0 } = options;
    // Disable duplicate rule for large rooms (more than 7 players)
    const duplicateRuleDisabled = playerCount > 7;
    if (!game)
        return [];
    const results = [];
    const playerWords = game.playerWords || {};
    const playerWordDetails = game.playerWordDetails || {};
    for (const [username, words] of Object.entries(playerWords)) {
        const uniqueWords = [...new Set(words)];
        let totalScore = 0;
        const wordDetails = [];
        for (const word of uniqueWords) {
            // Determine if word is valid and get validation source
            let validated = false;
            let inDictionary = false;
            let validationSource = 'none';
            let isAiVerified = false;
            let aiReason = null;
            if (dictionaryValidatedWords.has(word)) {
                validated = true;
                inDictionary = true;
                validationSource = 'dictionary';
            }
            else if (communityValidatedWords.has(word)) {
                validated = true;
                validationSource = 'community';
            }
            else if (aiValidatedWords.has(word)) {
                const aiResult = aiValidatedWords.get(word);
                validated = aiResult.isValid;
                isAiVerified = aiResult.isAiVerified === true;
                validationSource = aiResult.isAiVerified ? 'ai' : aiResult.source || 'cached';
                aiReason = aiResult.reason || null;
            }
            // Check if word is unique (only one player submitted it)
            // When duplicate rule is disabled (large rooms with >7 players), treat all words as unique
            const isUnique = duplicateRuleDisabled || (wordCountMap[word] || 0) === 1;
            // Calculate word rarity based on how many players found it
            // Rarity scoring rewards finding words that others missed
            let rarityMultiplier = 1.0;
            let wordRarity = 'common';
            if (playerCount > 1 && !duplicateRuleDisabled) {
                const playersWhoFoundThis = wordCountMap[word] || 1;
                const percentageWhoFound = (playersWhoFoundThis / playerCount) * 100;
                if (percentageWhoFound <= 5) {
                    // Only 1 player in 20 found this - legendary!
                    rarityMultiplier = 2.0;
                    wordRarity = 'legendary';
                }
                else if (percentageWhoFound <= 15) {
                    // Less than 15% of players found this - rare
                    rarityMultiplier = 1.5;
                    wordRarity = 'rare';
                }
                else if (percentageWhoFound <= 30) {
                    // 15-30% of players found this - uncommon
                    rarityMultiplier = 1.25;
                    wordRarity = 'uncommon';
                }
                // else: common word (50%+ found it), no bonus
            }
            // Get pre-calculated score from word details if available
            const existingDetails = (playerWordDetails[username] || []).find(d => d.word === word);
            let score = 0;
            if (validated) {
                if (existingDetails && typeof existingDetails.score === 'number') {
                    score = existingDetails.score;
                }
                else {
                    score = calculateWordScore(word, 0);
                }
                // Apply rarity multiplier to base score
                score = Math.round(score * rarityMultiplier);
                totalScore += score;
            }
            const wordDetail = {
                word,
                score,
                validated,
                inDictionary,
                validationSource,
                isUnique,
                isDuplicate: !isUnique, // Frontend expects isDuplicate (inverse of isUnique)
                comboBonus: existingDetails?.comboBonus || 0,
                isAiVerified,
                // Include timestamp for pace analysis in PlayerInsights
                timestamp: existingDetails?.timestamp || null,
                timeSinceStart: existingDetails?.timeSinceStart || null,
                // Include fire round data for results display
                fireRoundMultiplier: existingDetails?.fireRoundMultiplier || 1,
                fireRoundBonus: existingDetails?.fireRoundBonus || 0,
                // Include rarity scoring data
                rarityMultiplier,
                wordRarity
            };
            // Only add aiReason if present (for invalid AI-verified words or valid ones with explanation)
            if (aiReason) {
                wordDetail.aiReason = aiReason;
            }
            wordDetails.push(wordDetail);
        }
        // Get user data for avatar
        const userData = game.users?.[username];
        results.push({
            username,
            score: totalScore, // Frontend expects 'score' not 'totalScore'
            totalScore, // Keep for backwards compatibility with other usages
            allWords: wordDetails, // Frontend expects 'allWords' not 'wordDetails'
            wordDetails, // Keep for backwards compatibility with other usages
            wordCount: uniqueWords.length,
            avatar: userData?.avatar || null,
            isBot: userData?.isBot || false,
            achievements: game.playerAchievements?.[username] || []
        });
    }
    // Sort by total score descending
    results.sort((a, b) => b.totalScore - a.totalScore);
    return results;
}
// CommonJS exports for backward compatibility
module.exports = {
    calculateWordScore,
    calculateGameScores,
    getComboBonus,
    getComboMultiplier // Legacy, kept for backwards compatibility
};
