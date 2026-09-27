/**
 * Scoring Calculation Utilities
 * Handles final game score calculation and player results
 *
 * IMPORTANT: Core scoring functions now imported from shared/utils/scoring.ts
 * This ensures consistency across frontend and backend.
 */

import type { Game, Avatar, WordDetail } from '@/shared/types/game';

// Import canonical scoring functions from shared module
import {
  calculateWordScore,
  getComboBonus,
  getComboMultiplier,
} from '@/shared/utils/scoring';

import { getGameModeRules, isDuplicateRuleDisabled } from '../modes/rules';

// Re-export for backwards compatibility
export { calculateWordScore, getComboBonus, getComboMultiplier };

export interface WordDetailResult extends WordDetail {
  // `timestamp` is inherited from base WordDetail (added for scoreMultiplier
  // boost — see SRV-CRIT-1). Pace analytics keep the per-game-clock companion.
  timeSinceStart?: number | null;
}

export interface PlayerScoreResult {
  username: string;
  score: number;
  totalScore: number;
  allWords: WordDetailResult[];
  wordDetails: WordDetailResult[];
  wordCount: number;
  avatar: Avatar | null;
  isBot: boolean;
  isHost: boolean;
  achievements: string[];
}

export interface AiValidationResult {
  isValid: boolean;
  isAiVerified?: boolean;
  source?: string;
  reason?: string | null;
}

export interface CalculateScoresOptions {
  playerCount?: number;
  /**
   * Rarity-scoring population — the denominator `wordCountMap`'s finder
   * counts (the numerator) are measured against. The caller building
   * wordCountMap already counts only HUMAN finders (bots must not strip
   * uniqueness/rarity bonuses); pass the matching human-only count here via
   * `countHumanPlayers`, or a bot-filled room drifts the percentage — a lone
   * human's word (100% of the humans who could find it) can get
   * miscategorized as rare/uncommon purely because bots inflate the
   * denominator while never appearing in the numerator. Live scoring's
   * rarity multiplier is always 1 (see wordScore.ts), so any such drift is a
   * results-only bonus the player never saw live. Defaults to `playerCount`.
   */
  humanPlayerCount?: number;
  gameMode?: string;
}

/**
 * Human (non-bot) players — the finder population rarity scoring must be
 * measured against so it stays consistent with wordCountMap's human-only
 * numerator. One shared definition of "who counts as a finder" for both.
 */
export function countHumanPlayers(users: Record<string, { isBot?: boolean } | undefined> | null | undefined): number {
  return Object.values(users || {}).filter((u) => !u?.isBot).length;
}

/**
 * Calculate final game scores for all players
 */
export function calculateGameScores(
  game: Game | null,
  wordCountMap: Record<string, number> = {},
  dictionaryValidatedWords: Set<string> = new Set(),
  communityValidatedWords: Set<string> = new Set(),
  aiValidatedWords: Map<string, AiValidationResult> = new Map(),
  options: CalculateScoresOptions = {}
): PlayerScoreResult[] {
  const { playerCount = 0, gameMode } = options;
  const rarityPopulation = options.humanPlayerCount ?? playerCount;

  // Per-mode rules (backend/modes/rules.ts) — the same rows the results payload
  // reports, so the flag the client shows is the rule applied here.
  const duplicateRuleDisabled = isDuplicateRuleDisabled(gameMode, playerCount);
  const rarityDisabled = !getGameModeRules(gameMode).rarityScoring;
  if (!game) return [];

  const results: PlayerScoreResult[] = [];
  const playerWords = game.playerWords || {};
  const playerWordDetails = game.playerWordDetails || {};

  // Pre-build Map<word, WordDetail> per player for O(1) lookup
  const playerWordDetailsMap: Record<string, Map<string, WordDetail>> = {};
  for (const [username, details] of Object.entries(playerWordDetails)) {
    const map = new Map<string, WordDetail>();
    for (const d of (details || [])) {
      map.set(d.word, d);
    }
    playerWordDetailsMap[username] = map;
  }

  for (const [username, words] of Object.entries(playerWords)) {
    const uniqueWords = [...new Set(words)];
    let totalScore = 0;
    const wordDetails: WordDetailResult[] = [];

    for (const word of uniqueWords) {
      // Determine if word is valid and get validation source
      let validated = false;
      let inDictionary = false;
      let validationSource: 'dictionary' | 'community' | 'ai' | 'cached' | 'none' = 'none';
      let isAiVerified = false;
      let aiReason: string | null = null;

      if (dictionaryValidatedWords.has(word)) {
        validated = true;
        inDictionary = true;
        validationSource = 'dictionary';
      } else if (communityValidatedWords.has(word)) {
        validated = true;
        validationSource = 'community';
      } else if (aiValidatedWords.has(word)) {
        const aiResult = aiValidatedWords.get(word)!;
        validated = aiResult.isValid;
        isAiVerified = aiResult.isAiVerified === true;
        validationSource = aiResult.isAiVerified ? 'ai' : (aiResult.source as 'cached') || 'cached';
        aiReason = aiResult.reason || null;
      }

      // Check if word is unique (only one player submitted it)
      // When duplicate rule is disabled (large rooms with >7 players), treat all words as unique
      const isUnique = duplicateRuleDisabled || (wordCountMap[word] || 0) === 1;

      // Calculate word rarity based on how many players found it
      // Rarity scoring rewards finding words that others missed
      let rarityMultiplier = 1.0;
      let wordRarity: 'common' | 'uncommon' | 'rare' | 'legendary' = 'common';

      if (rarityPopulation > 1 && !duplicateRuleDisabled && !rarityDisabled) {
        const playersWhoFoundThis = wordCountMap[word] || 1;
        const percentageWhoFound = (playersWhoFoundThis / rarityPopulation) * 100;

        if (percentageWhoFound <= 5) {
          // Only 1 player in 20 found this - legendary!
          rarityMultiplier = 1.5;   // GD-023: reduced from 2.0 (too swingy)
          wordRarity = 'legendary';
        } else if (percentageWhoFound <= 15) {
          // Less than 15% of players found this - rare
          rarityMultiplier = 1.3;   // GD-023: reduced from 1.5
          wordRarity = 'rare';
        } else if (percentageWhoFound <= 30) {
          // 15-30% of players found this - uncommon
          rarityMultiplier = 1.15;  // GD-023: reduced from 1.25
          wordRarity = 'uncommon';
        }
        // else: common word (50%+ found it), no bonus
      }

      // Get pre-calculated score from word details if available.
      // During live gameplay, scoreManager.addWord() always sets `score` (including combo bonus)
      // in playerWordDetails, so the `existingDetails.score` branch is the normal path.
      // The fallback with comboLevel=0 is defensive — it only triggers if word details are
      // missing (e.g., migrated data or test scenarios), accepting that combo bonus is lost.
      const existingDetails = playerWordDetailsMap[username]?.get(word);
      let score = 0;

      if (validated) {
        if (existingDetails && typeof existingDetails.score === 'number') {
          score = existingDetails.score;
        } else {
          score = calculateWordScore(word, 0);
        }

        // Apply rarity multiplier to base score
        score = Math.round(score * rarityMultiplier);
        totalScore += score;
      }

      const wordDetail: WordDetailResult = {
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
        timestamp: (existingDetails as WordDetailResult | undefined)?.timestamp || null,
        timeSinceStart: (existingDetails as WordDetailResult | undefined)?.timeSinceStart || null,
        // Include fire round data for results display
        fireRoundMultiplier: existingDetails?.fireRoundMultiplier || 1,
        fireRoundBonus: existingDetails?.fireRoundBonus || 0,
        // Include rarity scoring data
        rarityMultiplier,
        wordRarity
      } as WordDetailResult & { rarityMultiplier: number; wordRarity: string };

      // Only add aiReason if present (for invalid AI-verified words or valid ones with explanation)
      if (aiReason) {
        wordDetail.aiReason = aiReason;
      }

      wordDetails.push(wordDetail);
    }

    // Get user data for avatar
    const userData = game.users?.[username];

    // Event bonuses (golden/lightning/special-word/word-hunt board + target finder)
    // are added to the LIVE running score (game.playerScores) but are NOT baked into
    // per-word playerWordDetails[].score, so the word-by-word recompute above can't see
    // them. Add the per-player accumulator back so the result page matches the in-game
    // leaderboard instead of showing a lower number. See playerEventBonuses.
    const eventBonus = game.playerEventBonuses?.[username] || 0;
    const finalTotal = totalScore + eventBonus;

    results.push({
      username,
      score: finalTotal, // Frontend expects 'score' not 'totalScore'
      totalScore: finalTotal, // Keep for backwards compatibility with other usages
      allWords: wordDetails, // Frontend expects 'allWords' not 'wordDetails'
      wordDetails, // Keep for backwards compatibility with other usages
      wordCount: uniqueWords.length,
      avatar: userData?.avatar || null,
      isBot: userData?.isBot || false,
      isHost: username === game.hostUsername,
      achievements: game.playerAchievements?.[username] || []
    });
  }

  // Sort by total score descending
  results.sort((a, b) => b.totalScore - a.totalScore);

  return results;
}

