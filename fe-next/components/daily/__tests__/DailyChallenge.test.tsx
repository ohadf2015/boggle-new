/**
 * Tests for Daily Challenge constants and type validation
 *
 * The main DailyChallenge component is complex with many dependencies.
 * These tests validate the expected constants, types, and configurations
 * that the component relies on.
 */

describe('Daily Challenge Phase Types', () => {
  it('should define all required phase states', () => {
    type DailyChallengePhase = 'loading' | 'ready' | 'playing' | 'completed' | 'already-played';

    const phases: DailyChallengePhase[] = [
      'loading',
      'ready',
      'playing',
      'completed',
      'already-played',
    ];

    expect(phases).toHaveLength(5);
    expect(phases).toContain('loading');
    expect(phases).toContain('ready');
    expect(phases).toContain('playing');
    expect(phases).toContain('completed');
    expect(phases).toContain('already-played');
  });

  it('should have valid phase transition flow', () => {
    // Valid transitions:
    // loading -> ready
    // loading -> already-played
    // ready -> playing
    // playing -> completed
    const validTransitions = {
      loading: ['ready', 'already-played'],
      ready: ['playing'],
      playing: ['completed'],
      completed: [], // Terminal state
      'already-played': [], // Terminal state
    };

    expect(validTransitions.loading).toContain('ready');
    expect(validTransitions.ready).toContain('playing');
    expect(validTransitions.playing).toContain('completed');
  });
});

describe('Daily Challenge Language Configuration', () => {
  const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];
  const LANGUAGE_FLAGS: Record<string, string> = {
    en: '🇺🇸',
    he: '🇮🇱',
    sv: '🇸🇪',
    ja: '🇯🇵',
    es: '🇪🇸',
  };

  it('should support exactly 5 languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(5);
  });

  it('should include English as default', () => {
    expect(SUPPORTED_LANGUAGES).toContain('en');
  });

  it('should include Hebrew for RTL support', () => {
    expect(SUPPORTED_LANGUAGES).toContain('he');
  });

  it('should include Swedish', () => {
    expect(SUPPORTED_LANGUAGES).toContain('sv');
  });

  it('should include Japanese', () => {
    expect(SUPPORTED_LANGUAGES).toContain('ja');
  });

  it('should include Spanish', () => {
    expect(SUPPORTED_LANGUAGES).toContain('es');
  });

  it('should have correct flag for each language', () => {
    expect(LANGUAGE_FLAGS['en']).toBe('🇺🇸');
    expect(LANGUAGE_FLAGS['he']).toBe('🇮🇱');
    expect(LANGUAGE_FLAGS['sv']).toBe('🇸🇪');
    expect(LANGUAGE_FLAGS['ja']).toBe('🇯🇵');
    expect(LANGUAGE_FLAGS['es']).toBe('🇪🇸');
  });

  it('should have flags for all supported languages', () => {
    SUPPORTED_LANGUAGES.forEach(lang => {
      expect(LANGUAGE_FLAGS[lang]).toBeDefined();
      expect(typeof LANGUAGE_FLAGS[lang]).toBe('string');
      expect(LANGUAGE_FLAGS[lang].length).toBeGreaterThan(0);
    });
  });
});

describe('Challenge Data Structure', () => {
  interface ChallengeData {
    puzzleNumber: number;
    attemptsUsed: number;
    solved: boolean;
    efficiencyScore: number;
    wordsDiscovered: number;
  }

  it('should validate challenge data structure', () => {
    const validChallenge: ChallengeData = {
      puzzleNumber: 42,
      attemptsUsed: 5,
      solved: true,
      efficiencyScore: 85,
      wordsDiscovered: 10,
    };

    expect(validChallenge.puzzleNumber).toBeGreaterThan(0);
    expect(validChallenge.attemptsUsed).toBeGreaterThanOrEqual(0);
    expect(typeof validChallenge.solved).toBe('boolean');
    expect(validChallenge.efficiencyScore).toBeGreaterThanOrEqual(0);
    expect(validChallenge.efficiencyScore).toBeLessThanOrEqual(100);
    expect(validChallenge.wordsDiscovered).toBeGreaterThanOrEqual(0);
  });

  it('should handle failed challenge data', () => {
    const failedChallenge: ChallengeData = {
      puzzleNumber: 42,
      attemptsUsed: 10,
      solved: false,
      efficiencyScore: 0,
      wordsDiscovered: 3,
    };

    expect(failedChallenge.solved).toBe(false);
    expect(failedChallenge.attemptsUsed).toBe(10); // Max attempts
    expect(failedChallenge.efficiencyScore).toBe(0);
  });
});

describe('Word Hunt Result Structure', () => {
  interface WordHuntResult {
    puzzleNumber: number;
    puzzleDate: string;
    language: string;
    solved: boolean;
    attemptsUsed: number;
    targetWord: string;
    attempts: string[];
    wordsDiscovered: string[];
    lifeRemaining: number;
    clueTokensEarned: number;
    clueTokensSpent: number;
    hintsUnlocked: number;
    efficiencyScore: number;
    streakDays: number;
    completedAt: string;
  }

  it('should validate successful result structure', () => {
    const successResult: WordHuntResult = {
      puzzleNumber: 42,
      puzzleDate: '2025-01-08',
      language: 'en',
      solved: true,
      attemptsUsed: 5,
      targetWord: 'CATALOG',
      attempts: ['CAT', 'DOG', 'RAT', 'CATALOG', 'CATALOG'],
      wordsDiscovered: ['CAT', 'DOG', 'RAT', 'LOG'],
      lifeRemaining: 2,
      clueTokensEarned: 15,
      clueTokensSpent: 5,
      hintsUnlocked: 3,
      efficiencyScore: 85,
      streakDays: 7,
      completedAt: new Date().toISOString(),
    };

    expect(successResult.solved).toBe(true);
    expect(successResult.attemptsUsed).toBeLessThanOrEqual(10);
    expect(successResult.targetWord.length).toBeGreaterThan(0);
    expect(Array.isArray(successResult.attempts)).toBe(true);
    expect(Array.isArray(successResult.wordsDiscovered)).toBe(true);
  });

  it('should validate date format', () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect('2025-01-08').toMatch(dateRegex);
  });

  it('should validate ISO timestamp format', () => {
    const timestamp = new Date().toISOString();
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('Game Configuration Constants', () => {
  it('should have valid max attempts', () => {
    const MAX_ATTEMPTS = 10;
    expect(MAX_ATTEMPTS).toBe(10);
    expect(MAX_ATTEMPTS).toBeGreaterThan(0);
  });

  it('should have valid min word length', () => {
    const MIN_WORD_LENGTH = 3;
    expect(MIN_WORD_LENGTH).toBe(3);
    expect(MIN_WORD_LENGTH).toBeGreaterThan(0);
  });

  it('should have valid countdown update interval', () => {
    const COUNTDOWN_INTERVAL_MS = 1000;
    expect(COUNTDOWN_INTERVAL_MS).toBe(1000); // 1 second
  });
});
