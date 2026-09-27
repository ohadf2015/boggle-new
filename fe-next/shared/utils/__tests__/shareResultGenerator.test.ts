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
 * REPLACES the previous "never ships an emoji grid" guard.
 *
 * That guard encoded a real objection: coloured squares are Wordle's signature
 * and "say nothing about who you beat". The first half no longer holds and the
 * second is now answered rather than overridden.
 *
 * What changed: production, 90d, $host-filtered. The share surface was measured.
 *   growth:mp_brag_card_viewed     8,728 impressions / 848 people
 *   growth:mp_brag_card_expanded       3
 *   growth:mp_brag_card_copy_link      5 / 4 people
 * The avatar-and-rival brag card the old comment names as "our share artifact"
 * converts at 0.06%. It is collapsed behind a one-line disclosure strip, so
 * effectively nobody ever sees the artifact, and the text that travels without
 * it is a stat dump ("Score: 142 | Words: 23") that a recipient cannot rank,
 * cannot scan in a busy chat, and has no reason to tap.
 *
 * Why emoji specifically, and why this is not a Wordle knockoff:
 *  - Emoji are the only reliably FIXED-WIDTH glyph across chat clients. ASCII
 *    bars (|=#) misalign the moment a proportional font renders them, which is
 *    the actual reason Wordle uses squares. The mechanism is portable; the
 *    meaning is what must be ours.
 *  - Wordle's colours encode GUESS CORRECTNESS against a hidden answer.
 *    Ours encode WORD LENGTH — the dimension LexiClash actually scores on. The
 *    shape of your round is its fingerprint, and no two rounds look alike.
 *  - It stays spoiler-free: lengths reveal no letters and no board positions,
 *    which matters because the daily modes share one board across all players.
 *  - The head-to-head scoreline rides along, so it still says who you beat —
 *    the thing the old guard correctly insisted on and a bare grid loses.
 */
/**
 * NO EMOJI in share output — product decision, 2026-09-08.
 *
 * This replaces an emoji composition-row contract that briefly lived here. The
 * shareable artifact is now the OG image at `app/api/og/brag`, unfurled from the
 * shared link; the text is only its caption. Emoji render inconsistently across
 * platforms, break RTL runs, and read as a Wordle knockoff next to the app's
 * Neo-Brutalist identity.
 *
 * This guard is deliberately broad — any pictograph, dingbat, variation selector
 * or regional indicator — so the next well-meaning grid does not grow back.
 */
describe('share text contains no emoji, in any mode', () => {
  const t = (k: string) => k;
  const EMOJI =
    /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{1F1E6}-\u{1F1FF}]/u;

  it.each(['singleplayer', 'multiplayer', 'blast', 'daily', 'adventure', 'wordHunt'] as const)(
    'emits no emoji for %s',
    (gameMode) => {
      const out = generateShareText(
        {
          gameMode, score: 142, wordsFound: 11, longestWord: 'SPLENDID',
          maxCombo: 4, won: true, opponentScore: 118, level: 3, puzzleNumber: 1482,
        },
        t
      );
      expect(out).not.toMatch(EMOJI);
    }
  );

  it('has no grid or row builder left to call', async () => {
    const mod = await import('../shareResultGenerator');
    expect('generateEmojiGrid' in mod).toBe(false);
    expect('buildShareRow' in mod).toBe(false);
    expect('buildLengthLadder' in mod).toBe(false);
  });

  it('still carries the scoreline the image caption needs', () => {
    const out = generateShareText(
      { gameMode: 'multiplayer', score: 142, wordsFound: 11, won: true, opponentScore: 118 },
      t
    );
    expect(out).toContain('142');
    expect(out).toContain('118');
  });
});
