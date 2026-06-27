export interface WordHuntTipInput {
  score: number;
  survived: boolean;
  lifeRemaining: number;
  discoveryWords: number;
  foundTarget: boolean;
  isFirstFinder: boolean;
  totalPlayers: number;
  rank: number;
  validWordCount: number;
  invalidWordCount: number;
  avgWordLength: number;
  longestWordLength: number;
  /**
   * Same-length target guesses used to solve. Optional: present in SP (guesses
   * used) but not in MP results. Drives guess-efficiency insights when known.
   */
  attemptsToFind?: number;
}

export interface WordHuntTip {
  key: string;
  params?: Record<string, string | number>;
}

/**
 * Returns a practical, data-driven improvement tip based on the player's
 * actual Word Hunt performance metrics. Prioritizes the biggest scoring
 * opportunity the player is missing.
 */
export function getWordHuntTip(stats: WordHuntTipInput): WordHuntTip {
  const {
    survived, lifeRemaining, validWordCount, invalidWordCount,
    avgWordLength, longestWordLength, rank, isFirstFinder,
    foundTarget, attemptsToFind,
  } = stats;

  const totalAttempts = validWordCount + invalidWordCount;
  const accuracy = totalAttempts > 0 ? Math.round((validWordCount / totalAttempts) * 100) : 0;

  // --- Guess-efficiency insights (only when attemptsToFind is known) ---
  // These teach the point-maximization loop: words → clues → fast solve.
  if (foundTarget && typeof attemptsToFind === 'number' && attemptsToFind > 0) {
    // Solved blind — no words farmed, so no clues. Teach the core mechanic.
    if (validWordCount === 0) {
      return { key: 'wordHuntTips.spellWordsFirst' };
    }
    // Fast clean solve (1–2 guesses) — reassure it scored big, nudge for the
    // exploration ceiling, never frame the few words as a failure.
    if (attemptsToFind <= 2) {
      return { key: 'wordHuntTips.fastSolveFarmMore', params: { attempts: attemptsToFind } };
    }
    // Many guesses despite having clues — trust them and commit sooner.
    if (attemptsToFind >= 5) {
      return { key: 'wordHuntTips.trustCluesSooner', params: { attempts: attemptsToFind } };
    }
  }

  // 1. Eliminated + barely any words → they need to find more words to stay alive
  if (!survived && validWordCount < 5) {
    return {
      key: 'wordHuntTips.needMoreWords',
      params: { count: validWordCount },
    };
  }

  // 2. Eliminated + many invalid words → accuracy problem draining life
  if (!survived && accuracy < 50 && invalidWordCount >= 3) {
    return {
      key: 'wordHuntTips.accuracyDrainsLife',
      params: { accuracy, invalid: invalidWordCount },
    };
  }

  // 3. Eliminated + short words → need longer words for more points per attempt
  if (!survived && avgWordLength > 0 && avgWordLength < 4) {
    return {
      key: 'wordHuntTips.longerWordsSurvive',
      params: { avg: avgWordLength },
    };
  }

  // 4. Eliminated with decent stats → general survival tip
  if (!survived) {
    return {
      key: 'wordHuntTips.shortWordsBetweenGuesses',
    };
  }

  // --- Survived from here ---

  // 5. Winner + first finder → practical next-level advice
  if (rank === 1 && isFirstFinder) {
    return {
      key: 'wordHuntTips.firstFinderPush',
      params: { words: validWordCount },
    };
  }

  // 6. Winner → push for higher score
  if (rank === 1) {
    if (avgWordLength < 4.5) {
      return {
        key: 'wordHuntTips.winnerLongerWords',
        params: { avg: avgWordLength },
      };
    }
    return {
      key: 'wordHuntTips.winnerMoreWords',
      params: { count: validWordCount },
    };
  }

  // 7. Low accuracy → wasting attempts
  if (accuracy < 60 && invalidWordCount >= 3) {
    return {
      key: 'wordHuntTips.tooManyInvalid',
      params: { accuracy, invalid: invalidWordCount },
    };
  }

  // 8. Barely survived → life management
  if (lifeRemaining < 20) {
    return {
      key: 'wordHuntTips.lifeManagement',
      params: { life: lifeRemaining },
    };
  }

  // 9. Short words → biggest scoring opportunity
  if (avgWordLength > 0 && avgWordLength < 4) {
    return {
      key: 'wordHuntTips.pushWordLength',
      params: { avg: avgWordLength, longest: longestWordLength },
    };
  }

  // 10. Few words → volume opportunity
  if (validWordCount < 5) {
    return {
      key: 'wordHuntTips.scanMoreWords',
      params: { count: validWordCount },
    };
  }

  // 11. Good performance, not winner → specific gap
  return {
    key: 'wordHuntTips.pushForFirst',
    params: { rank },
  };
}
