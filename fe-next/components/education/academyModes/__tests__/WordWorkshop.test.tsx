/**
 * Word Workshop — Word Craft vs the bot with the lesson words as stars. The
 * stock game view is stubbed; moves and the game end arrive through the REAL
 * `emitWordCraftMove` / `emitWordCraftGameEnd`, the calls the game view makes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { WordCraftState } from '@/lib/word-craft/useWordCraftGame';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: unknown, params?: Record<string, unknown>) => {
      const p = (typeof fallback === 'object' ? fallback : params) as Record<string, unknown> | undefined;
      return p ? `${key}(${Object.values(p).join(',')})` : key;
    },
    language: 'en',
  }),
}));
const sfx = { playComboSound: vi.fn(), playPerfectWordSound: vi.fn(), playChestOpenSound: vi.fn(), playQuestCompleteSound: vi.fn(), setGameActive: vi.fn() };
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfx }));
vi.mock('@/utils/growthTracking', () => ({ trackGameEnd: vi.fn(), trackGameStart: vi.fn() }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
const gameViewProps = vi.fn();
vi.mock('@/components/word-craft/WordCraftGameScreen', () => ({
  WordCraftGameView: (props: Record<string, unknown>) => {
    gameViewProps(props);
    return <div data-testid="stub-game-view" />;
  },
}));

import WordWorkshop from '../WordWorkshop';
import { emitWordCraftGameEnd, emitWordCraftMove } from '@/components/word-craft/wordCraftTelemetry';
import { WORKSHOP_DIMS } from '@/lib/education/workshopOpener';
import { WORKSHOP_GUIDE_KEY } from '@/lib/education/workshopCoach';

const onBack = vi.fn();
const startSession = vi.fn();
const recordResult = vi.fn();
beforeEach(() => {
  [onBack, startSession, recordResult, gameViewProps].forEach((f) => f.mockReset());
  startSession.mockResolvedValue(true);
});

const renderIt = (language: 'en' | 'ru' = 'en') =>
  render(
    <WordWorkshop
      lessonName="Weekly"
      lessonWords={['teacher', 'puzzle', 'classroom']}
      lessonLanguage={language}
      onBack={onBack}
      startSession={startSession}
      recordResult={recordResult}
    />,
  );

async function play() {
  await act(async () => { fireEvent.click(screen.getByTestId('workshop-play')); });
  await screen.findByTestId('stub-game-view');
}

describe('WordWorkshop', () => {
  it('GIVEN the intro WHEN shown THEN it stars the lesson words and offers PLAY', () => {
    renderIt();
    expect(screen.getByText('TEACHER')).toBeTruthy();
    expect(screen.getByText('CLASSROOM')).toBeTruthy();
    expect(screen.getByTestId('workshop-play')).toBeTruthy();
  });

  it('GIVEN a lesson language Word Craft has no tiles for WHEN opened THEN a friendly fallback, not a crash', () => {
    renderIt('ru');
    expect(screen.getByTestId('workshop-unsupported')).toBeTruthy();
    fireEvent.click(screen.getByTestId('workshop-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('GIVEN PLAY WHEN tapped THEN a session starts and the game opens short (phone board) vs an easy bot', async () => {
    renderIt();
    await play();
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(gameViewProps).toHaveBeenCalledWith(expect.objectContaining({ difficulty: 'easy', hotseat: false, duel: null }));
    const lesson = gameViewProps.mock.calls.at(-1)![0].lesson as {
      dims: unknown; targets: string[]; bare?: boolean; initialTiles?: { letter: string; row: number; col: number }[]; achievements?: boolean;
    };
    // Short board: the academy's own 7x7 (was the 11x11 PHONE_DIMS — 80% empty on a phone).
    expect(lesson.dims).toEqual(WORKSHOP_DIMS);
    // The first frame has letters: the Baron opens with a lesson word that is not the one dealt to the student.
    // Its row spells the opener; a short second word crosses it so the phone board is never one lonely row.
    const tiles = (lesson.initialTiles ?? []) as { letter: string; row: number; col: number }[];
    const openerRow = tiles[0].row;
    expect(tiles.filter((t) => t.row === openerRow).sort((a, b) => a.col - b.col).map((t) => t.letter).join('')).toBe('TEACHER');
    expect(tiles.filter((t) => t.row !== openerRow).length).toBeGreaterThan(0);
    // Public-game achievements (untranslated keys) never toast over the academy scoreboard.
    expect(lesson.achievements).toBe(false);
    // No site header in the match: its Back could leave the academy; the game's own Back returns to the intro.
    expect(lesson.bare).toBe(true);
    // The dealt/steered lesson target; the Baron's opener word is already on the board, so refills never steer toward it.
    expect(lesson.targets).toContain('PUZZLE');
    expect(lesson.targets).not.toContain('TEACHER');
  });

  it('GIVEN the first match THEN the 1-2-3 guide shows; WHEN a later match starts THEN it is gone for good', async () => {
    localStorage.removeItem(WORKSHOP_GUIDE_KEY);
    const first = renderIt();
    await play();
    expect((gameViewProps.mock.calls.at(-1)![0].lesson as { guide?: boolean }).guide).toBe(true);
    first.unmount();
    renderIt();
    await play();
    expect((gameViewProps.mock.calls.at(-1)![0].lesson as { guide?: boolean }).guide).toBe(false);
  });

  it('GIVEN a player move containing a lesson word WHEN committed THEN a golden callout names the lesson word; bot moves do not', async () => {
    renderIt();
    await play();
    act(() => { emitWordCraftMove({ who: 'bot', words: ['PUZZLE'], score: 9 }, { hotseat: false }); });
    expect(screen.queryByTestId('workshop-callout')).toBeNull();
    act(() => { emitWordCraftMove({ who: 'player', words: ['TEACHERS'], score: 12 }, { hotseat: false }); });
    expect(screen.getByTestId('workshop-callout').textContent).toContain('TEACHER');
    expect(sfx.playPerfectWordSound).toHaveBeenCalled();
  });

  it('GIVEN the game ends WHEN recorded THEN lesson words go to XP and the results show the server XP', async () => {
    recordResult.mockResolvedValue(55);
    renderIt();
    await play();
    await act(async () => {
      emitWordCraftGameEnd(
        { player: { score: 80 }, bot: { score: 60 }, turn: 'over', history: [{ who: 'player', words: ['TEACHERS', 'AT'] }] } as unknown as WordCraftState,
        { hotseat: false },
      );
    });
    expect(recordResult).toHaveBeenCalledWith({ vocabularyWordsFound: ['TEACHER'], wordsFound: ['TEACHERS', 'AT'] });
    expect(screen.getByTestId('workshop-results')).toBeTruthy();
    fireEvent.click(screen.getByTestId('academy-chest'));
    expect(screen.getByTestId('academy-xp').textContent).toContain('55');
  });

  it('GIVEN the round could not be recorded (null) WHEN the chest opens THEN it says XP was not saved instead of inventing a number', async () => {
    recordResult.mockResolvedValue(null);
    renderIt();
    await play();
    await act(async () => {
      emitWordCraftGameEnd(
        { player: { score: 80 }, bot: { score: 60 }, turn: 'over', history: [{ who: 'player', words: ['TEACHERS', 'AT'] }] } as unknown as WordCraftState,
        { hotseat: false },
      );
    });
    expect(screen.getByTestId('workshop-xp-not-saved')).toBeTruthy();
    fireEvent.click(screen.getByTestId('academy-chest'));
    expect(screen.getByTestId('academy-xp').textContent).toContain('0');
  });

  describe('scene states', () => {
    const endGame = (won: boolean) =>
      emitWordCraftGameEnd(
        { player: { score: won ? 80 : 20 }, bot: { score: won ? 60 : 70 }, turn: 'over', history: [{ who: 'player', words: ['TEACHERS', 'PUZZLE'] }] } as unknown as WordCraftState,
        { hotseat: false },
      );

    it('GIVEN the intro WHEN shown THEN it is a full-bleed workshop scene with a hero reveal, the named rival and the student', () => {
      render(
        <WordWorkshop
          lessonName="Weekly"
          lessonWords={['teacher']}
          lessonLanguage="en"
          onBack={onBack}
          startSession={startSession}
          recordResult={recordResult}
          player={{ name: 'Maya', userId: 'u1', avatarConfig: null }}
        />,
      );
      expect(screen.getByTestId('academy-scene').getAttribute('data-theme')).toBe('workshop');
      expect(screen.getByTestId('workshop-hero')).toBeTruthy();
      expect(screen.getByTestId('workshop-rival').getAttribute('data-mood')).toBe('idle');
      expect(screen.getByTestId('workshop-rival').textContent).toContain('academy.modes.workshop.rival.name');
      expect(screen.getByTestId('academy-player').textContent).toContain('Maya');
    });

    it('GIVEN the match WHEN the rival plays THEN it attacks with a taunt; WHEN the student builds a lesson word THEN it is hurt and the word is ticked off', async () => {
      renderIt();
      await play();
      expect(screen.getByTestId('workshop-rival').getAttribute('data-mood')).toBe('idle');
      act(() => { emitWordCraftMove({ who: 'bot', words: ['CAT'], score: 5 }, { hotseat: false }); });
      expect(screen.getByTestId('workshop-rival').getAttribute('data-mood')).toBe('attack');
      expect(screen.getByTestId('workshop-rival-taunt').textContent).toMatch(/academy\.modes\.workshop\.rival\.taunt/);
      const puzzle = () => screen.getAllByTestId('workshop-lesson-word').find((el) => el.textContent?.includes('PUZZLE'))!;
      expect(puzzle().getAttribute('data-found')).toBe('false');
      act(() => { emitWordCraftMove({ who: 'player', words: ['PUZZLE'], score: 20 }, { hotseat: false }); });
      expect(screen.getByTestId('workshop-rival').getAttribute('data-mood')).toBe('hurt');
      expect(puzzle().getAttribute('data-found')).toBe('true');
    });

    it('GIVEN a lesson word WHEN the golden banner shows THEN the rival bubble waits (never overlaps it), then speaks', async () => {
      renderIt();
      await play();
      vi.useFakeTimers();
      try {
        act(() => { emitWordCraftMove({ who: 'player', words: ['PUZZLE'], score: 20 }, { hotseat: false }); });
        expect(screen.getByTestId('workshop-callout')).toBeTruthy();
        expect(screen.queryByTestId('workshop-rival-taunt')).toBeNull();
        await act(async () => { vi.advanceTimersByTime(2300); });
        expect(screen.queryByTestId('workshop-callout')).toBeNull();
        expect(screen.getByTestId('workshop-rival-taunt').textContent).toMatch(/academy\.modes\.workshop\.rival\.hurt/);
      } finally {
        vi.useRealTimers();
      }
    });

    it('GIVEN a won match with two lesson words WHEN the results show THEN a gold reward scene with trophy stats and a defeated rival', async () => {
      recordResult.mockResolvedValue(40);
      renderIt();
      await play();
      await act(async () => { endGame(true); });
      expect(screen.getByTestId('academy-reward').getAttribute('data-tier')).toBe('gold');
      const stats = screen.getAllByTestId('academy-stat').map((el) => el.textContent);
      expect(stats.some((s) => s?.includes('2'))).toBe(true);
      expect(screen.getByTestId('workshop-rival').getAttribute('data-mood')).toBe('defeated');
    });

    it('GIVEN a lost match THEN the rival gloats (not defeated)', async () => {
      recordResult.mockResolvedValue(10);
      renderIt();
      await play();
      await act(async () => { endGame(false); });
      expect(screen.getByTestId('workshop-rival').getAttribute('data-mood')).toBe('attack');
    });
  });
});
