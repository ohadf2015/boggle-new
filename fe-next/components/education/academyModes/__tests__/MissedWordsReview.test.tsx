/**
 * Missed Words Review — the run screen. Cards are handed in pre-built (the
 * scheduling is pure and tested in lib/education); this pins the screen's key
 * states: empty, a card of each kind, the streak meter, and the chest that
 * shows the SERVER's XP only once the round is recorded.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ReviewCard } from '@/lib/education/missedWordsReview';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: unknown, params?: Record<string, unknown>) => {
      const p = (typeof fallback === 'object' ? fallback : params) as Record<string, unknown> | undefined;
      return p ? `${key}(${Object.values(p).join(',')})` : key;
    },
    language: 'en',
  }),
}));
const sfx = { playComboSound: vi.fn(), playWordRejectedSound: vi.fn(), playChestOpenSound: vi.fn(), playQuestCompleteSound: vi.fn(), playTileSelectSound: vi.fn(), setGameActive: vi.fn() };
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfx }));

import MissedWordsReview from '../MissedWordsReview';

const base = { lessonId: 'L', lessonName: 'Weekly', language: 'en' as const, attempts: 0, misses: 0 };
const unscramble = (word: string, i: number): ReviewCard => ({
  ...base, key: `L::${word}`, id: `${i}-${word}`, word, kind: 'unscramble', tiles: [...word].reverse(),
});
const meaning: ReviewCard = {
  ...base, key: 'L::dog', id: '9-dog', word: 'dog', definition: 'a pet that barks', kind: 'meaning',
  options: ['gives milk', 'a pet that barks', 'hoots', 'purrs'],
};

const onFinish = vi.fn();
const onBack = vi.fn();
beforeEach(() => {
  onFinish.mockReset();
  onBack.mockReset();
  Object.values(sfx).forEach((f) => f.mockReset());
});

const renderIt = (cards: ReviewCard[]) =>
  render(<MissedWordsReview cards={cards} lessonName="Weekly" onBack={onBack} onFinish={onFinish} feedbackMs={0} />);

function tapWord(word: string) {
  const used = new Set<Element>();
  for (const ch of word) {
    const tile = screen.getAllByTestId('review-tile').find((el) => el.textContent === ch && !used.has(el) && !(el as HTMLButtonElement).disabled)!;
    used.add(tile);
    fireEvent.click(tile);
  }
}

describe('MissedWordsReview', () => {
  it('GIVEN no words to review WHEN shown THEN a friendly empty state with a way back', () => {
    renderIt([]);
    expect(screen.getByTestId('review-empty')).toBeTruthy();
    fireEvent.click(screen.getByTestId('review-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('GIVEN a deck WHEN started THEN the first unscramble card shows its scrambled tiles and a progress count', () => {
    renderIt([unscramble('cat', 0), meaning]);
    fireEvent.click(screen.getByTestId('review-start'));
    expect(screen.getAllByTestId('review-tile').map((el) => el.textContent)).toEqual(['t', 'a', 'c']);
    expect(screen.getByTestId('review-progress').textContent).toContain('1');
  });

  it('GIVEN an unscramble card WHEN spelled right THEN the streak climbs and the combo SFX fires; a meaning card accepts its definition', async () => {
    renderIt([unscramble('cat', 0), meaning]);
    fireEvent.click(screen.getByTestId('review-start'));
    await act(async () => { tapWord('cat'); });
    expect(sfx.playComboSound).toHaveBeenCalled();
    expect(await screen.findByTestId('review-meaning-prompt')).toBeTruthy();
    expect(screen.getByTestId('review-streak').textContent).toContain('1');
    onFinish.mockResolvedValue(42);
    await act(async () => { fireEvent.click(screen.getByText('a pet that barks')); });
    expect(onFinish).toHaveBeenCalledWith([true, true]);
  });

  it('GIVEN a wrong letter WHEN tapped THEN the card is missed and the answer is revealed', async () => {
    renderIt([unscramble('cat', 0)]);
    fireEvent.click(screen.getByTestId('review-start'));
    onFinish.mockResolvedValue(10);
    await act(async () => { fireEvent.click(screen.getAllByTestId('review-tile')[0]); }); // 't' first = wrong
    expect(sfx.playWordRejectedSound).toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledWith([false]);
  });

  // jsdom does not run framer's keyframe resolver, so the browser-only "spring + 5 keyframes" throw
  // that once froze runs on a miss is covered by .edu-harness/p4stall.mts, not here.
  it('GIVEN a miss on card 1 WHEN the feedback pause ends THEN card 2 is dealt', async () => {
    const errors: unknown[] = [];
    const onErr = (e: ErrorEvent) => errors.push(e.error ?? e.message);
    window.addEventListener('error', onErr);
    render(<MissedWordsReview cards={[unscramble('cat', 0), unscramble('dog', 1)]} lessonName="Weekly" onBack={onBack} onFinish={onFinish} feedbackMs={20} />);
    fireEvent.click(screen.getByTestId('review-start'));
    await act(async () => { fireEvent.click(screen.getAllByTestId('review-tile')[0]); }); // 't' first = wrong
    await vi.waitFor(() => expect(screen.getAllByTestId('review-tile').map((el) => el.textContent).join('')).toBe('god'), { timeout: 2000 });
    window.removeEventListener('error', onErr);
    expect(errors).toEqual([]);
  });

  it('GIVEN a finished run WHEN the chest is tapped THEN it opens and shows the recorded XP', async () => {
    let resolve!: (xp: number) => void;
    onFinish.mockReturnValue(new Promise<number>((r) => { resolve = r; }));
    renderIt([unscramble('cat', 0)]);
    fireEvent.click(screen.getByTestId('review-start'));
    await act(async () => { tapWord('cat'); });
    const chest = await screen.findByTestId('academy-chest');
    fireEvent.click(chest);
    expect(sfx.playChestOpenSound).toHaveBeenCalled();
    expect(screen.queryByTestId('academy-xp')).toBeNull(); // not yet recorded
    await act(async () => { resolve(37); });
    expect(screen.getByTestId('academy-xp').textContent).toContain('37');
  });

  describe('scene states', () => {
    it('GIVEN the intro WHEN shown THEN it is the vault scene with a hero reveal and a big start', () => {
      renderIt([unscramble('cat', 0)]);
      expect(screen.getByTestId('academy-scene').getAttribute('data-theme')).toBe('vault');
      expect(screen.getByTestId('review-hero')).toBeTruthy();
      expect(screen.getByTestId('review-start')).toBeTruthy();
    });

    it('GIVEN a card is up WHEN answering THEN the mascot thinks, cheers a right answer and says oops on a miss; the ring tracks progress', async () => {
      render(<MissedWordsReview cards={[unscramble('cat', 0), unscramble('dog', 1)]} lessonName="Weekly" onBack={onBack} onFinish={onFinish} feedbackMs={60_000} />);
      fireEvent.click(screen.getByTestId('review-start'));
      expect(screen.getByTestId('review-mascot').getAttribute('data-mood')).toBe('think');
      expect(screen.getByTestId('review-ring').getAttribute('aria-valuenow')).toBe('0');
      await act(async () => { tapWord('cat'); });
      expect(screen.getByTestId('review-mascot').getAttribute('data-mood')).toBe('cheer');
      expect(screen.getByTestId('review-ring').getAttribute('aria-valuenow')).toBe('1');
    });

    it('GIVEN a miss WHEN answered THEN the mascot says oops', async () => {
      render(<MissedWordsReview cards={[unscramble('cat', 0), unscramble('dog', 1)]} lessonName="Weekly" onBack={onBack} onFinish={onFinish} feedbackMs={60_000} />);
      fireEvent.click(screen.getByTestId('review-start'));
      await act(async () => { fireEvent.click(screen.getAllByTestId('review-tile')[0]); });
      expect(screen.getByTestId('review-mascot').getAttribute('data-mood')).toBe('oops');
    });

    it('GIVEN a perfect run WHEN finished THEN a gold reward scene with big trophy stats', async () => {
      onFinish.mockResolvedValue(30);
      renderIt([unscramble('cat', 0)]);
      fireEvent.click(screen.getByTestId('review-start'));
      await act(async () => { tapWord('cat'); });
      expect(screen.getByTestId('academy-reward').getAttribute('data-tier')).toBe('gold');
      expect(screen.getAllByTestId('academy-stat').length).toBeGreaterThanOrEqual(2);
    });
  });
});
