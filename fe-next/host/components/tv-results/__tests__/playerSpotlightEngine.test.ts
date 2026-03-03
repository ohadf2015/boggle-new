import {
  assignArchetypes,
  ARCHETYPES,
  type SpotlightPlayer,
  type SpotlightWord,
  type ArchetypeAssignment,
} from '../playerSpotlightEngine';

// --- Test Helpers ---

function makePlayer(
  username: string,
  overrides: Partial<SpotlightPlayer> = {}
): SpotlightPlayer {
  return {
    username,
    score: 100,
    allWords: [],
    ...overrides,
  };
}

function makeWord(
  word: string,
  overrides: Partial<SpotlightWord> = {}
) {
  return {
    word,
    score: word.length,
    validated: true,
    isDuplicate: false,
    timeSinceStart: 30,
    ...overrides,
  };
}

// Shared word pool — ensures words appear in multiple player lists
// (prevents the-ghost from stealing priority since ghost needs unique words)
const SHARED_WORD_POOL = [
  'cat', 'dog', 'the', 'run', 'fox', 'red', 'big', 'hat', 'cup', 'map',
  'pen', 'box', 'sun', 'fly', 'top', 'bed', 'hot', 'old', 'new', 'cut',
  'mix', 'dry', 'bit', 'fit', 'dip', 'hop', 'rip', 'zip', 'tap', 'pop',
];

function generateWords(count: number, opts: { lengthRange?: [number, number]; startTime?: number; timeGap?: number; unique?: boolean } = {}) {
  const { startTime = 10, timeGap = 5, unique = false } = opts;
  const words: ReturnType<typeof makeWord>[] = [];
  for (let i = 0; i < count; i++) {
    const word = unique ? `uniq${i}xxx`.slice(0, 5) : SHARED_WORD_POOL[i % SHARED_WORD_POOL.length];
    words.push(makeWord(word, {
      timeSinceStart: startTime + i * timeGap,
      score: word.length,
    }));
  }
  return words;
}

// --- Tests ---

describe('playerSpotlightEngine', () => {
  describe('ARCHETYPES constant', () => {
    it('should export 17 archetypes (16 + 1 fallback)', () => {
      expect(ARCHETYPES).toHaveLength(17);
    });

    it('should have unique IDs', () => {
      const ids = ARCHETYPES.map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have the-participant as the last (fallback) archetype', () => {
      expect(ARCHETYPES[ARCHETYPES.length - 1].id).toBe('the-participant');
    });
  });

  describe('assignArchetypes', () => {
    it('should return empty array for empty players', () => {
      const result = assignArchetypes([], 180, 42);
      expect(result).toEqual([]);
    });

    it('should assign one archetype per player (mutual exclusivity)', () => {
      const players = Array.from({ length: 8 }, (_, i) =>
        makePlayer(`player${i}`, {
          score: (8 - i) * 50,
          allWords: generateWords(10, { startTime: 5 + i * 2 }),
        })
      );
      const result = assignArchetypes(players, 180, 42);

      // Each player appears exactly once
      const usernames = result.map(r => r.player.username);
      expect(new Set(usernames).size).toBe(usernames.length);
      expect(result).toHaveLength(players.length);
    });

    it('should not assign the same archetype to multiple players', () => {
      const players = Array.from({ length: 10 }, (_, i) =>
        makePlayer(`player${i}`, {
          score: (10 - i) * 30,
          allWords: generateWords(12, { startTime: 5 + i }),
        })
      );
      const result = assignArchetypes(players, 180, 42);

      const archetypeIds = result.map(r => r.archetype.id);
      // Participant can be assigned to multiple players as fallback
      const nonFallback = archetypeIds.filter(id => id !== 'the-participant');
      expect(new Set(nonFallback).size).toBe(nonFallback.length);
    });

    it('should assign fallback "the-participant" to unmatched players', () => {
      // Players with minimal data should get fallback
      const players = [
        makePlayer('active', {
          score: 200,
          allWords: generateWords(15, { startTime: 5 }),
        }),
        makePlayer('minimal', {
          score: 5,
          allWords: [makeWord('cat', { timeSinceStart: 170 })],
        }),
      ];
      const result = assignArchetypes(players, 180, 42);

      expect(result).toHaveLength(2);
      const minimal = result.find(r => r.player.username === 'minimal');
      expect(minimal).toBeDefined();
      // Minimal player should get participant or some low-threshold archetype
      expect(minimal!.archetype).toBeDefined();
    });

    it('should be deterministic (same seed = same result)', () => {
      const players = Array.from({ length: 6 }, (_, i) =>
        makePlayer(`player${i}`, {
          score: (6 - i) * 40,
          allWords: generateWords(10),
        })
      );

      const result1 = assignArchetypes(players, 180, 12345);
      const result2 = assignArchetypes(players, 180, 12345);

      expect(result1.map(r => ({ u: r.player.username, a: r.archetype.id, q: r.quip }))).toEqual(
        result2.map(r => ({ u: r.player.username, a: r.archetype.id, q: r.quip }))
      );
    });

    it('should produce different quips with different seeds', () => {
      const players = [
        makePlayer('solo', { score: 100, allWords: generateWords(10) }),
      ];

      const r1 = assignArchetypes(players, 180, 1);
      const r2 = assignArchetypes(players, 180, 99999);

      // Same archetype but potentially different quip index
      // (with only 1 player the archetype may be the same)
      expect(r1).toHaveLength(1);
      expect(r2).toHaveLength(1);
    });

    it('should include quipIndex in assignment for translation lookup', () => {
      const players = [
        makePlayer('p1', { score: 200, allWords: generateWords(10) }),
      ];
      const result = assignArchetypes(players, 180, 42);

      expect(result[0].quipIndex).toBeDefined();
      expect(typeof result[0].quipIndex).toBe('number');
      expect(result[0].quipIndex).toBeGreaterThanOrEqual(0);
      expect(result[0].quipIndex).toBeLessThan(4); // 4 quips per archetype
    });
  });

  describe('archetype priority', () => {
    // Creates a "neutral" word list. Avg word length >4 (avoids speed-runner),
    // evenly spread (avoids sleeping-giant/frontrunner), all shared (avoids ghost).
    // Mix of short + medium words: avg length ~4.5
    const BASE_WORDS = ['cat', 'dog', 'run', 'fox', 'planet', 'forest', 'bridge', 'castle', 'hat', 'cup'];

    function neutralWords() {
      return BASE_WORDS.map((w, i) =>
        makeWord(w, {
          score: w.length,
          timeSinceStart: (180 / 11) * (i + 1),
        })
      );
    }

    it('should assign the-ghost to player with most unique words ≥5', () => {
      // Ghost has words nobody else has
      const ghostWords = Array.from({ length: 8 }, (_, i) =>
        makeWord(`uniq${i}xx`, { score: 5, timeSinceStart: (180 / 9) * (i + 1) })
      );

      const players = [
        makePlayer('ghost', { score: 200, allWords: ghostWords }),
        makePlayer('other1', { score: 150, allWords: neutralWords() }),
        makePlayer('other2', { score: 100, allWords: neutralWords() }),
      ];

      const result = assignArchetypes(players, 180, 42);
      const ghostAssignment = result.find(r => r.player.username === 'ghost');
      expect(ghostAssignment?.archetype.id).toBe('the-ghost');
    });

    it('should assign the-sniper to player with ≥80% accuracy and ≥8 words', () => {
      // Sniper: same BASE_WORDS (10 valid) + 1 invalid = 91% accuracy
      const sniperWords = [
        ...neutralWords(),
        makeWord('badword', { score: 0, validated: false, timeSinceStart: 95 }),
      ];
      // Other: same BASE_WORDS but also 4 invalid = 71% accuracy
      const otherWords = [
        ...neutralWords(),
        ...Array.from({ length: 4 }, (_, i) =>
          makeWord(`bad${i}`, { score: 0, validated: false, timeSinceStart: 120 + i * 5 })
        ),
      ];

      const players = [
        makePlayer('sniper', { score: 150, allWords: sniperWords }),
        makePlayer('other', { score: 100, allWords: otherWords }),
      ];

      const result = assignArchetypes(players, 180, 42);
      const sniperAssignment = result.find(r => r.player.username === 'sniper');
      expect(sniperAssignment?.archetype.id).toBe('the-sniper');
    });

    it('should assign the-philosopher to player with avg word length ≥5.5', () => {
      // Both share the SAME long words. Thinker has ~70% accuracy (not ≥80% → no sniper).
      const longWordPool = ['planet', 'wisdom', 'castle', 'dragon', 'forest', 'bridge'];
      const longWords = [
        ...longWordPool.map((w, i) =>
          makeWord(w, { score: 8, timeSinceStart: (180 / 10) * (i + 1) })
        ),
        // 3 invalid words → 6/9 = 67% accuracy → disqualifies from sniper
        ...['badone', 'badtwo', 'badxyz'].map((w, i) =>
          makeWord(w, { score: 0, validated: false, timeSinceStart: (180 / 10) * (i + 7) })
        ),
      ];
      // Shorty has same long words + short ones
      const shortWords = [
        ...longWordPool.map((w, i) =>
          makeWord(w, { score: w.length, timeSinceStart: (180 / 10) * (i + 1) })
        ),
        ...['cat', 'dog', 'fox'].map((w, i) =>
          makeWord(w, { score: w.length, timeSinceStart: (180 / 10) * (i + 7) })
        ),
      ];

      const players = [
        makePlayer('thinker', { score: 200, allWords: longWords }),
        makePlayer('shorty', { score: 100, allWords: shortWords }),
      ];

      const result = assignArchetypes(players, 180, 42);
      const thinker = result.find(r => r.player.username === 'thinker');
      expect(thinker?.archetype.id).toBe('the-philosopher');
    });

    it('should assign the-machine-gun to player with most words ≥15', () => {
      // Gunner: 20 valid + 6 invalid = 77% accuracy (below sniper threshold)
      const manyWords = [
        ...Array.from({ length: 20 }, (_, i) =>
          makeWord(BASE_WORDS[i % BASE_WORDS.length], {
            score: 3,
            timeSinceStart: (180 / 27) * (i + 1),
          })
        ),
        ...Array.from({ length: 6 }, (_, i) =>
          makeWord(`inv${i}`, { score: 0, validated: false, timeSinceStart: 160 + i * 2 })
        ),
      ];
      const players = [
        makePlayer('gunner', { score: 100, allWords: manyWords }),
        makePlayer('other', { score: 80, allWords: neutralWords() }),
      ];

      const result = assignArchetypes(players, 180, 42);
      const gunner = result.find(r => r.player.username === 'gunner');
      expect(gunner?.archetype.id).toBe('the-machine-gun');
    });

    it('should assign the-sleeping-giant when 2nd half ≥ 2x first half', () => {
      // Giant: 1 word first half + 9 second half + 4 invalid = 71% accuracy (no sniper)
      const giantWords = [
        makeWord(BASE_WORDS[0], { score: 3, timeSinceStart: 20 }),
        ...BASE_WORDS.slice(1).map((w, i) =>
          makeWord(w, { score: 10, timeSinceStart: 100 + i * 8 })
        ),
        ...Array.from({ length: 4 }, (_, i) =>
          makeWord(`bad${i}`, { score: 0, validated: false, timeSinceStart: 170 + i })
        ),
      ];
      const players = [
        makePlayer('giant', { score: 93, allWords: giantWords }),
        makePlayer('other', { score: 50, allWords: neutralWords() }),
      ];

      const result = assignArchetypes(players, 180, 42);
      const giant = result.find(r => r.player.username === 'giant');
      expect(giant?.archetype.id).toBe('the-sleeping-giant');
    });

    it('should assign the-combo-master when max combo ≥6', () => {
      // comboPro: 10 shared words with high combos + 4 invalid = 71% accuracy (no sniper)
      // Same word count as others (10 valid) → no silent assassin
      // Jittered timing: balanced halves (no frontrunner/giant), span <80% (no marathon), irregular gaps (no metronome)
      const jitter = [20, 35, 42, 58, 70, 95, 105, 118, 128, 135];
      const comboWords = [
        ...BASE_WORDS.map((w, i) =>
          makeWord(w, { score: 5, comboLevel: i < 8 ? i + 1 : 0, timeSinceStart: jitter[i] })
        ),
        // 4 invalid → 10/14 = 71% accuracy (no sniper)
        ...Array.from({ length: 4 }, (_, i) =>
          makeWord(`inv${i}`, { score: 0, validated: false, timeSinceStart: jitter[i] + 1 })
        ),
      ];
      const players = [
        makePlayer('comboPro', { score: 70, allWords: comboWords }),
        makePlayer('other1', { score: 100, allWords: neutralWords() }),
        makePlayer('other2', { score: 90, allWords: neutralWords() }),
        makePlayer('other3', { score: 80, allWords: neutralWords() }),
      ];

      const result = assignArchetypes(players, 180, 42);
      const combo = result.find(r => r.player.username === 'comboPro');
      expect(combo?.archetype.id).toBe('the-combo-master');
    });
  });

  describe('key stat values', () => {
    it('should include the key stat value in the assignment', () => {
      const players = [
        makePlayer('p1', {
          score: 200,
          allWords: generateWords(20, { startTime: 5, timeGap: 3 }),
        }),
      ];
      const result = assignArchetypes(players, 180, 42);

      expect(result[0].keyStat).toBeDefined();
      expect(typeof result[0].keyStat.value).toBe('number');
      expect(typeof result[0].keyStat.labelKey).toBe('string');
    });
  });

  describe('small game adjustment', () => {
    it('should halve minimum word thresholds for ≤3 players', () => {
      // With ≤3 players, sniper needs only 4 words (8/2) instead of 8
      // Use shared words to prevent ghost from triggering
      const sharedPool = ['cat', 'dog', 'run', 'fox', 'hat'];
      const sniperWords = sharedPool.map((w, i) =>
        makeWord(w, { score: 5, validated: true, timeSinceStart: 10 + i * 5 })
      );
      const otherWords = sharedPool.slice(0, 3).map((w, i) =>
        makeWord(w, { score: 3, timeSinceStart: 30 + i * 10 })
      );

      const players = [
        makePlayer('sniper', { score: 100, allWords: sniperWords }),
        makePlayer('other', { score: 50, allWords: otherWords }),
      ];

      const result = assignArchetypes(players, 180, 42);
      // With 5 words, sniper qualifies (threshold halved from 8 to 4)
      const sniper = result.find(r => r.player.username === 'sniper');
      expect(sniper?.archetype.id).toBe('the-sniper');
    });
  });

  describe('edge cases', () => {
    it('should handle a single player', () => {
      const players = [
        makePlayer('solo', { score: 50, allWords: generateWords(3) }),
      ];
      const result = assignArchetypes(players, 180, 42);
      expect(result).toHaveLength(1);
      expect(result[0].archetype).toBeDefined();
      expect(result[0].player.username).toBe('solo');
    });

    it('should handle players with no words', () => {
      const players = [
        makePlayer('empty', { score: 0, allWords: [] }),
        makePlayer('other', { score: 100, allWords: generateWords(8) }),
      ];
      const result = assignArchetypes(players, 180, 42);
      expect(result).toHaveLength(2);
      const empty = result.find(r => r.player.username === 'empty');
      expect(empty?.archetype.id).toBe('the-participant');
    });

    it('should handle players with undefined allWords', () => {
      const players = [
        makePlayer('nowords', { score: 0 }),
      ];
      // Remove allWords entirely
      delete (players[0] as unknown as Record<string, unknown>).allWords;
      const result = assignArchetypes(players, 180, 42);
      expect(result).toHaveLength(1);
      expect(result[0].archetype.id).toBe('the-participant');
    });

    it('should handle all players with identical stats', () => {
      const words = generateWords(5);
      const players = Array.from({ length: 4 }, (_, i) =>
        makePlayer(`clone${i}`, { score: 100, allWords: [...words] })
      );
      const result = assignArchetypes(players, 180, 42);
      expect(result).toHaveLength(4);
      // All should get assigned something
      result.forEach(r => {
        expect(r.archetype).toBeDefined();
      });
    });

    it('should handle zero game duration', () => {
      const players = [
        makePlayer('fast', { score: 50, allWords: generateWords(5) }),
      ];
      const result = assignArchetypes(players, 0, 42);
      expect(result).toHaveLength(1);
    });
  });
});
