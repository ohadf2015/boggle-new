import {
  generateShareText,
  generateEmojiGrid,
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

describe('generateEmojiGrid', () => {
  it('should generate green squares for found words based on length', () => {
    const result = generateEmojiGrid([
      { word: 'CAT', found: true },
      { word: 'DOG', found: true },
    ]);

    expect(result).toBe('🟩🟩🟩\n🟩🟩🟩');
  });

  it('should generate black squares for missed words', () => {
    const result = generateEmojiGrid([
      { word: 'CAT', found: true },
      { word: 'LONG', found: false },
    ]);

    expect(result).toBe('🟩🟩🟩\n⬛⬛⬛⬛');
  });

  it('should return empty string for empty array', () => {
    expect(generateEmojiGrid([])).toBe('');
  });
});
