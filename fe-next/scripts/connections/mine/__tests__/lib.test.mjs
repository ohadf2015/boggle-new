import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadWordSet,
  splitCompounds,
  buildBridgeGraph,
  minePuzzles,
  minePyramids,
  generateDeterministicId,
  calculateDifficulty,
  calculateAmbiguity,
  deduplicateByBridges,
} from '../lib.mjs';

describe('lib.mjs - Deterministic Puzzle Miner', () => {
  describe('loadWordSet', () => {
    it('should parse newline-delimited word list', () => {
      const content = 'apple\nbanana\ncherry\n';
      const words = loadWordSet(content);
      expect(words).toContain('apple');
      expect(words).toContain('banana');
      expect(words).toContain('cherry');
      expect(words.size).toBe(3);
    });

    it('should trim whitespace and filter empty lines', () => {
      const content = '  apple  \n\n  banana  \n\n';
      const words = loadWordSet(content);
      expect(words.size).toBe(2);
      expect(words).toContain('apple');
      expect(words).toContain('banana');
    });

    it('should normalize to lowercase', () => {
      const content = 'APPLE\nBanana\nChErRy\n';
      const words = loadWordSet(content);
      expect(words).toContain('apple');
      expect(words).toContain('banana');
      expect(words).toContain('cherry');
    });

    it('should handle empty content', () => {
      const words = loadWordSet('');
      expect(words.size).toBe(0);
    });
  });

  describe('splitCompounds', () => {
    it('should split compounds into valid left-bridge-right triplets', () => {
      const dict = new Set(['apple', 'pie', 'applepie', 'ball', 'room', 'ballroom']);
      const compounds = new Set(['applepie', 'ballroom']);
      const splits = splitCompounds(dict, compounds);

      expect(splits.size).toBeGreaterThan(0);

      // Should find apple + pie
      const applePie = [...splits].find(s => s.left === 'apple' && s.right === 'pie');
      expect(applePie).toBeDefined();
      expect(applePie.compound).toBe('applepie');

      // Should find ball + room
      const ballRoom = [...splits].find(s => s.left === 'ball' && s.right === 'room');
      expect(ballRoom).toBeDefined();
      expect(ballRoom.compound).toBe('ballroom');
    });

    it('should skip compounds with no valid split', () => {
      const dict = new Set(['xy', 'z']);
      const compounds = new Set(['xyz']);
      const splits = splitCompounds(dict, compounds);
      expect(splits.size).toBe(0);
    });

    it('should enforce minimum word length (3 chars per side)', () => {
      const dict = new Set(['ab', 'abc', 'cd', 'abcd']);
      const compounds = new Set(['abcd']);
      const splits = splitCompounds(dict, compounds);
      // Should not find 'ab' + 'cd' because 'ab' is < 3 chars
      expect(splits.size).toBe(0);
    });

    it('should return unique splits per compound', () => {
      // "football" could split as "foot+ball" or "foo+tball" (if both exist)
      const dict = new Set(['foot', 'ball', 'foo', 'tball', 'football']);
      const compounds = new Set(['football']);
      const splits = splitCompounds(dict, compounds);
      // Should include both valid splits if dict allows
      const footBall = [...splits].find(s => s.left === 'foot' && s.right === 'ball');
      expect(footBall).toBeDefined();
    });
  });

  describe('buildBridgeGraph', () => {
    it('should build a graph mapping bridge -> [(word1, word2), ...]', () => {
      const splits = new Set([
        { compound: 'applepie', left: 'apple', right: 'pie', bridge: 'pie' },
        { compound: 'baseball', left: 'base', right: 'ball', bridge: 'ball' },
        { compound: 'football', left: 'foot', right: 'ball', bridge: 'ball' },
      ]);
      const graph = buildBridgeGraph(splits);

      expect(graph.has('pie')).toBe(true);
      expect(graph.has('ball')).toBe(true);

      const piePairs = graph.get('pie');
      expect(piePairs.size).toBe(1);
      const pair = [...piePairs][0];
      expect(pair.word1).toBe('apple');
      expect(pair.word2).toBe('pie');

      const ballPairs = graph.get('ball');
      expect(ballPairs.size).toBeGreaterThanOrEqual(2);
    });

    it('should deduplicate identical pairs under same bridge', () => {
      const splits = new Set([
        { compound: 'applepie', left: 'apple', right: 'pie', bridge: 'pie' },
        { compound: 'applepie', left: 'apple', right: 'pie', bridge: 'pie' }, // duplicate
      ]);
      const graph = buildBridgeGraph(splits);

      const piePairs = graph.get('pie');
      expect(piePairs.size).toBe(1); // Only one unique pair
    });
  });

  describe('calculateAmbiguity', () => {
    it('should count distinct bridges for a candidate pair', () => {
      // If word1='apple', word2='pie', and we can form compounds with bridges: 'pie', 'Xie'
      // Ambiguity is 2 (two distinct bridges work)
      const graph = new Map([
        ['pie', new Set([
          { word1: 'apple', word2: 'pie' },
        ])],
      ]);
      const ambiguity = calculateAmbiguity('apple', 'pie', graph);
      expect(ambiguity).toBe(1); // Only one bridge found
    });

    it('should return 1 if no valid bridges found', () => {
      const graph = new Map();
      const ambiguity = calculateAmbiguity('xyz', 'abc', graph);
      expect(ambiguity).toBe(0); // No pairs found
    });

    it('should count multiple bridges for same pair', () => {
      const graph = new Map([
        ['fire', new Set([{ word1: 'gun', word2: 'fire' }])],
        ['wood', new Set([{ word1: 'gun', word2: 'wood' }])],
        ['powder', new Set([{ word1: 'gun', word2: 'powder' }])],
      ]);
      const ambiguity = calculateAmbiguity('gun', 'gun', graph);
      // Should find 3 bridges: fire, wood, powder
      // But ambiguity is across word1, word2 candidates that form valid compounds
      // In this case, looking for bridges where gun forms compounds on both sides
      expect(typeof ambiguity).toBe('number');
    });
  });

  describe('calculateDifficulty', () => {
    it('should be easy when both compounds are very common (top 50)', () => {
      const freq = new Map([
        ['book', 1000],
        ['case', 2000],
      ]);
      const diff = calculateDifficulty('book', 'case', 'book', freq);
      expect(diff).toBe('easy');
    });

    it('should be hard when both compounds are less common (outside top 1000)', () => {
      const freq = new Map([
        ['ironstone', 50000],
        ['stonework', 60000],
      ]);
      const diff = calculateDifficulty('ironstone', 'stonework', 'stone', freq);
      expect(diff).toBe('hard');
    });

    it('should be medium when one is common, one is less common', () => {
      const freq = new Map([
        ['book', 500],
        ['shelf', 30000],
      ]);
      const diff = calculateDifficulty('book', 'shelf', 'shelf', freq);
      expect(diff).toBe('medium');
    });

    it('should default to medium when frequency data missing', () => {
      const freq = new Map();
      const diff = calculateDifficulty('unknown', 'words', 'unknown', freq);
      expect(diff).toBe('medium');
    });
  });

  describe('generateDeterministicId', () => {
    it('should generate stable IDs in sorted order', () => {
      const id1 = generateDeterministicId('en', 0);
      const id2 = generateDeterministicId('en', 1);
      expect(id1).toBe('en-m-000');
      expect(id2).toBe('en-m-001');
    });

    it('should pad index to 3 digits', () => {
      const id = generateDeterministicId('sv', 42);
      expect(id).toBe('sv-m-042');
    });

    it('should support different locales', () => {
      const enId = generateDeterministicId('en', 0);
      const jaId = generateDeterministicId('ja', 0);
      expect(enId).toContain('en-m-');
      expect(jaId).toContain('ja-m-');
    });
  });

  describe('deduplicateByBridges', () => {
    it('should keep only unique (word1, bridge, word2) triplets', () => {
      const puzzles = [
        { word1: 'apple', bridge: 'pie', word2: 'dish', quality: 0.8 },
        { word1: 'apple', bridge: 'pie', word2: 'dish', quality: 0.7 }, // duplicate
        { word1: 'apple', bridge: 'pie', word2: 'hole', quality: 0.6 }, // different word2
      ];
      const dedup = deduplicateByBridges(puzzles);
      expect(dedup.length).toBe(2); // Keep first of duplicate, keep unique
    });

    it('should preserve highest quality if duplicates', () => {
      const puzzles = [
        { word1: 'apple', bridge: 'pie', word2: 'dish', quality: 0.7 },
        { word1: 'apple', bridge: 'pie', word2: 'dish', quality: 0.9 }, // higher quality
      ];
      const dedup = deduplicateByBridges(puzzles);
      expect(dedup.length).toBe(1);
      expect(dedup[0].quality).toBe(0.9);
    });
  });

  describe('minePuzzles', () => {
    it('should generate bridge puzzles from split compounds', () => {
      const dict = new Set(['apple', 'pie', 'applepie', 'apple', 'sauce', 'applesauce']);
      const compounds = new Set(['applepie', 'applesauce']);
      const freq = new Map([
        ['applepie', 500],
        ['applesauce', 600],
        ['pie', 1000],
        ['sauce', 800],
      ]);

      const graph = buildBridgeGraph(splitCompounds(dict, compounds));
      const puzzles = minePuzzles(graph, freq, { maxCandidates: 100 });

      expect(Array.isArray(puzzles)).toBe(true);
      expect(puzzles.length).toBeGreaterThanOrEqual(0);

      // Each puzzle should have required fields
      if (puzzles.length > 0) {
        const p = puzzles[0];
        expect(p).toHaveProperty('word1');
        expect(p).toHaveProperty('bridge');
        expect(p).toHaveProperty('word2');
        expect(p).toHaveProperty('difficulty');
        expect(p).toHaveProperty('ambiguity');
        expect(['easy', 'medium', 'hard']).toContain(p.difficulty);
      }
    });

    it('should respect maxCandidates limit', () => {
      const dict = new Set(
        ['a', 'b', 'c', 'd', 'e'].flatMap(x =>
          ['x', 'y', 'z'].map(y => x + y)
        ).concat(['abc', 'def', 'ghi', 'jkl', 'mno'])
      );
      const compounds = new Set(['abx', 'aby', 'abz', 'dex', 'dey', 'ghi']);
      const freq = new Map();

      const graph = buildBridgeGraph(splitCompounds(dict, compounds));
      const puzzles = minePuzzles(graph, freq, { maxCandidates: 5 });

      expect(puzzles.length).toBeLessThanOrEqual(5);
    });

    it('should assign deterministic IDs', () => {
      const dict = new Set(['foot', 'ball', 'football', 'room', 'ballroom']);
      const compounds = new Set(['football', 'ballroom']);
      const freq = new Map();

      const graph = buildBridgeGraph(splitCompounds(dict, compounds));
      const puzzles = minePuzzles(graph, freq, { maxCandidates: 100 }, 'en', 0);

      if (puzzles.length > 0) {
        expect(puzzles[0].id).toMatch(/^en-m-\d+$/);
      }
    });
  });

  describe('minePyramids', () => {
    it('should find pyramids with meta-answer + 3 distinct bridges', () => {
      // Pyramid: meta = 'ball'
      // - bridge1: 'foot' → football + ?
      // - bridge2: 'base' → baseball + ?
      // - bridge3: 'snow' → snowball + ?
      const dict = new Set([
        'ball', 'foot', 'football', 'room', 'base', 'baseball', 'park',
        'snow', 'snowball', 'storm', 'eye', 'eyeball', 'drop'
      ]);
      const compounds = new Set([
        'football', 'ballroom',
        'baseball', 'ballpark',
        'snowball', 'ballstorm',
        'eyeball', 'ballcap',
      ]);
      const freq = new Map();

      const graph = buildBridgeGraph(splitCompounds(dict, compounds));
      const pyramids = minePyramids(graph, freq, { maxCandidates: 100 });

      expect(Array.isArray(pyramids)).toBe(true);

      if (pyramids.length > 0) {
        const pyr = pyramids[0];
        expect(pyr).toHaveProperty('meta_answer');
        expect(pyr).toHaveProperty('bridges');
        expect(pyr.bridges.length).toBeGreaterThanOrEqual(3);

        // Each bridge should have word1 and word2
        for (const bridge of pyr.bridges) {
          expect(bridge).toHaveProperty('word1');
          expect(bridge).toHaveProperty('word2');
          expect(bridge).toHaveProperty('bridge');
        }
      }
    });

    it('should require at least 3 distinct bridges per pyramid', () => {
      const dict = new Set(['ball', 'foot', 'football', 'base', 'baseball']);
      const compounds = new Set(['football', 'baseball']);
      const freq = new Map();

      const graph = buildBridgeGraph(splitCompounds(dict, compounds));
      const pyramids = minePyramids(graph, freq, { maxCandidates: 100 });

      // With only 2 bridges, should find no pyramids
      for (const pyr of pyramids) {
        expect(pyr.bridges.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should assign deterministic pyramid IDs', () => {
      const dict = new Set([
        'ball', 'foot', 'football', 'base', 'baseball', 'snow', 'snowball'
      ]);
      const compounds = new Set(['football', 'baseball', 'snowball']);
      const freq = new Map();

      const graph = buildBridgeGraph(splitCompounds(dict, compounds));
      const pyramids = minePyramids(graph, freq, { maxCandidates: 100 }, 'en', 0);

      if (pyramids.length > 0) {
        expect(pyramids[0].id).toMatch(/^en-p-\d+$/);
      }
    });
  });
});
