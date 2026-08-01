import {
  generateShareText,
  type ShareParams,
} from '../shareResultGenerator';

describe('generateShareText', () => {
  const mockT = (key: string) => {
    const translations: Record<string, string> = {
      'shareResult.singleplayer': 'LexiClash Solo',
      'shareResult.multiplayer': 'LexiClash Battle',
      'shareResult.blast': 'LexiClash Blast',
      'shareResult.daily': 'LexiClash Daily',
      'shareResult.adventure': 'LexiClash Adventure',
      'shareResult.wordHunt': 'LexiClash Word Hunt',
      'shareResult.score': 'Score',
      'shareResult.words': 'Words',
      'shareResult.longest': 'Longest',
      'shareResult.combo': 'Combo',
      'shareResult.won': 'Won!',
      'shareResult.lost': 'Lost',
      'shareResult.level': 'Level',
      'shareResult.puzzle': 'Puzzle',
      'shareResult.vs': 'vs',
    };
    return translations[key] || key;
  };

  it('should generate singleplayer share text with score and words', () => {
    const params: ShareParams = {
      gameMode: 'singleplayer',
      score: 150,
      wordsFound: 12,
      longestWord: 'ELEPHANT',
      maxCombo: 5,
    };

    const result = generateShareText(params, mockT);

    expect(result).toContain('LexiClash Solo');
    expect(result).toContain('150');
    expect(result).toContain('12');
    expect(result).toContain('ELEPHANT');
    expect(result).toContain('5');
    expect(result).toContain('lexiclash.live');
  });

  it('should generate multiplayer share text with win/loss and opponent score', () => {
    const params: ShareParams = {
      gameMode: 'multiplayer',
      score: 200,
      wordsFound: 15,
      won: true,
      opponentScore: 120,
    };

    const result = generateShareText(params, mockT);

    expect(result).toContain('LexiClash Battle');
    expect(result).toContain('200');
    expect(result).toContain('120');
    expect(result).toContain('Won!');
    expect(result).toContain('lexiclash.live');
  });

  it('should generate multiplayer loss text', () => {
    const params: ShareParams = {
      gameMode: 'multiplayer',
      score: 80,
      wordsFound: 6,
      won: false,
      opponentScore: 150,
    };

    const result = generateShareText(params, mockT);

    expect(result).toContain('Lost');
    expect(result).toContain('80');
  });

  it('should generate blast mode share text', () => {
    const params: ShareParams = {
      gameMode: 'blast',
      score: 300,
      wordsFound: 20,
      maxCombo: 8,
    };

    const result = generateShareText(params, mockT);

    expect(result).toContain('LexiClash Blast');
    expect(result).toContain('300');
    expect(result).toContain('8');
  });

  it('should generate daily share text with puzzle number', () => {
    const params: ShareParams = {
      gameMode: 'daily',
      score: 100,
      wordsFound: 8,
      puzzleNumber: 42,
    };

    const result = generateShareText(params, mockT);

    expect(result).toContain('LexiClash Daily');
    expect(result).toContain('#42');
  });

  it('should generate adventure share text with level', () => {
    const params: ShareParams = {
      gameMode: 'adventure',
      score: 250,
      wordsFound: 18,
      level: 7,
    };

    const result = generateShareText(params, mockT);

    expect(result).toContain('LexiClash Adventure');
    expect(result).toContain('7');
  });

  it('should omit optional fields when not provided', () => {
    const params: ShareParams = {
      gameMode: 'singleplayer',
      score: 50,
      wordsFound: 3,
    };

    const result = generateShareText(params, mockT);

    expect(result).toContain('50');
    expect(result).toContain('3');
    expect(result).not.toContain('Longest');
    expect(result).not.toContain('Combo');
  });
});

/**
 * LexiClash never ships a Wordle-style emoji grid. Our share artifact is the
 * avatar-and-rival brag card (components/results/MpBragCard) — coloured squares
 * are someone else's signature and say nothing about who you beat. The grid
 * builder is gone; this fails if any of it grows back.
 */
describe('share text never contains a Wordle-style emoji grid', () => {
  const t = (k: string) => k;
  const GRID_GLYPHS = ['\u{1F7E9}', '\u{2B1B}', '\u{1F7E8}', '\u{2B1C}', '\u{1F7E6}', '\u{1F7EA}'];

  it.each(['singleplayer', 'multiplayer', 'blast', 'daily', 'adventure', 'wordHunt'] as const)(
    'emits no grid squares for %s',
    (gameMode) => {
      const result = generateShareText(
        { gameMode, score: 120, wordsFound: 9, longestWord: 'ELEPHANT', maxCombo: 4, won: true, opponentScore: 90 },
        t
      );
      for (const glyph of GRID_GLYPHS) expect(result).not.toContain(glyph);
    }
  );

  it('has no grid builder left to call', async () => {
    const mod = await import('../shareResultGenerator');
    expect('generateEmojiGrid' in mod).toBe(false);
  });
});
