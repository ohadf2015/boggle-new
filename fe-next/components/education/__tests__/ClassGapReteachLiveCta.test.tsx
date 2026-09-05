/**
 * Class-gap page CTA → NEW 3-min reteach Live (not same-room #896).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClassGapReteachLiveCta } from '../ClassGapReteachLiveCta';
import {
  CLASS_GAP_RETEACH_LIVE_LESSON_ID,
  RETEACH_LIVE_TIMER_SECONDS,
  type ClassGapSharePayload,
} from '@/lib/education/classGapShare';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const payload: ClassGapSharePayload = {
  locale: 'en',
  lesson: 'Physics 101',
  teacher: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron'],
};

describe('ClassGapReteachLiveCta', () => {
  beforeEach(() => {
    push.mockClear();
    sessionStorage.clear();
  });

  it('stages a 3-min reteach lesson and opens a NEW Live room', () => {
    render(
      <ClassGapReteachLiveCta
        payload={payload}
        reteachLabel="Start reteach Live"
        educationHref="/en/education"
        educationLabel="Play a class game"
      />,
    );
    fireEvent.click(screen.getByTestId('start-reteach-live'));
    const staged = JSON.parse(sessionStorage.getItem('lessonGameData')!);
    expect(staged.lessonId).toBe(CLASS_GAP_RETEACH_LIVE_LESSON_ID);
    expect(staged.vocabularyWords).toEqual(['neutron']);
    expect(staged.templateSettings.timerSeconds).toBe(RETEACH_LIVE_TIMER_SECONDS);
    expect(push).toHaveBeenCalledWith('/en/multiplayer?fromLesson=true&autoCreate=true');
  });

  it('does not navigate when sessionStorage is blocked', () => {
    const setItem = vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      render(
        <ClassGapReteachLiveCta
          payload={payload}
          reteachLabel="Start reteach Live"
          educationHref="/en/education"
          educationLabel="Play a class game"
        />,
      );
      fireEvent.click(screen.getByTestId('start-reteach-live'));
      expect(push).not.toHaveBeenCalled();
    } finally {
      setItem.mockRestore();
    }
  });

  it('falls back to the education CTA when every word was found', () => {
    render(
      <ClassGapReteachLiveCta
        payload={{ ...payload, missedWords: [], found: 3 }}
        reteachLabel="Start reteach Live"
        educationHref="/en/education"
        educationLabel="Play a class game"
      />,
    );
    expect(screen.queryByTestId('start-reteach-live')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Play a class game' })).toHaveAttribute(
      'href',
      '/en/education',
    );
  });
});
