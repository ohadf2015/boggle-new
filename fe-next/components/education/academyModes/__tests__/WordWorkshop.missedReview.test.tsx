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
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ setGameActive: vi.fn() }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGameEnd: vi.fn(), trackGameStart: vi.fn() }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/components/word-craft/WordCraftGameScreen', () => ({
  WordCraftGameView: () => <div data-testid="stub-game-view" />,
}));

import WordWorkshop from '../WordWorkshop';
import { emitWordCraftGameEnd } from '@/components/word-craft/wordCraftTelemetry';
import { loadLeitnerState } from '@/lib/education/missedWordsLeitnerStore';
import { reviewKey } from '@/lib/education/missedWordsReview';

beforeEach(() => localStorage.clear());

async function playAndEnd(words: string[], review?: { studentId: string; lessonId: string }, score = 80) {
  render(
    <WordWorkshop
      lessonName="Weekly"
      lessonWords={['teacher', 'puzzle', 'cat']}
      lessonLanguage="en"
      onBack={vi.fn()}
      startSession={vi.fn().mockResolvedValue(true)}
      recordResult={vi.fn().mockResolvedValue(40)}
      review={review}
    />,
  );
  await act(async () => { fireEvent.click(screen.getByTestId('workshop-play')); });
  await screen.findByTestId('stub-game-view');
  await act(async () => {
    emitWordCraftGameEnd(
      { player: { score }, bot: { score: 60 }, turn: 'over', history: [{ who: 'player', words }] } as unknown as WordCraftState,
      { hotseat: false },
    );
  });
}

describe('WordWorkshop → Missed Words Review', () => {
  it('GIVEN lesson words left unbuilt WHEN the match ends THEN they are queued for this student and the results link to review', async () => {
    await playAndEnd(['TEACHER', 'SUN'], { studentId: 'stu-1', lessonId: 'L1' });
    const keys = Object.keys(loadLeitnerState('stu-1')).sort();
    expect(keys).toEqual([reviewKey('L1', 'cat'), reviewKey('L1', 'puzzle')].sort());
    const link = screen.getByTestId('wordcraft-missed-review');
    expect(link.getAttribute('href')).toBe('/en/student/review?lesson=L1');
    expect(link.textContent).toContain('wordcraftReview.cta(2)');
  });

  it('GIVEN a match below the chest bar WHEN it ends THEN the nudge still links to the missed words', async () => {
    await playAndEnd([], { studentId: 'stu-1', lessonId: 'L1' }, 0);
    expect(screen.getByTestId('workshop-nudge')).toBeTruthy();
    expect(screen.getByTestId('wordcraft-missed-review').textContent).toContain('wordcraftReview.cta(3)');
  });

  it('GIVEN no signed-in student WHEN the match ends THEN nothing is queued and no link shows', async () => {
    await playAndEnd(['TEACHER'], undefined);
    expect(screen.queryByTestId('wordcraft-missed-review')).toBeNull();
    expect(loadLeitnerState('stu-1')).toEqual({});
  });
});
