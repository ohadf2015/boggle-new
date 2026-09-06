/**
 * Class-gap page CTA: seed a 3-min reteach Live from public missed words.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassGapReteachLiveCta } from '../ClassGapReteachLiveCta';
import {
  CLASS_GAP_RETEACH_LIVE_LESSON_ID,
  CLASS_GAP_RETEACH_TIMER_SECONDS,
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

  it('offers Start reteach Live when the card has missed words', () => {
    render(
      <ClassGapReteachLiveCta
        payload={payload}
        reteachLabel="Start 3-min reteach Live"
        unpluggedLabel="Start unplugged reteach Live"
        educationHref="/en/education"
        educationLabel="Play a class game"
      />,
    );
    expect(screen.getByTestId('start-reteach-live')).toBeInTheDocument();
  });

  it('stages missed words + 3-min timer then opens a NEW Live room', () => {
    render(
      <ClassGapReteachLiveCta
        payload={payload}
        reteachLabel="Start 3-min reteach Live"
        unpluggedLabel="Start unplugged reteach Live"
        educationHref="/en/education"
        educationLabel="Play a class game"
      />,
    );
    fireEvent.click(screen.getByTestId('start-reteach-live'));
    const staged = JSON.parse(sessionStorage.getItem('lessonGameData') || 'null');
    expect(staged.lessonId).toBe(CLASS_GAP_RETEACH_LIVE_LESSON_ID);
    expect(staged.vocabularyWords).toEqual(['neutron']);
    expect(staged.templateSettings.timerSeconds).toBe(CLASS_GAP_RETEACH_TIMER_SECONDS);
    expect(push).toHaveBeenCalledWith('/en/multiplayer?fromLesson=true&autoCreate=true');
  });

  it('falls back to the education link when every word was found', () => {
    render(
      <ClassGapReteachLiveCta
        payload={{ ...payload, missedWords: [] }}
        reteachLabel="Start 3-min reteach Live"
        unpluggedLabel="Start unplugged reteach Live"
        educationHref="/en/education"
        educationLabel="Play a class game"
      />,
    );
    expect(screen.queryByTestId('start-reteach-live')).not.toBeInTheDocument();
    expect(screen.getByText('Play a class game')).toBeInTheDocument();
  });

  it('offers Start unplugged reteach Live linking to the teacher-screen path', () => {
    render(
      <ClassGapReteachLiveCta
        payload={payload}
        reteachLabel="Start 3-min reteach Live"
        unpluggedLabel="Start unplugged reteach Live"
        educationHref="/en/education"
        educationLabel="Play a class game"
      />,
    );
    const link = screen.getByTestId('start-unplugged-reteach-live');
    expect(link).toHaveAttribute('href');
    const href = link.getAttribute('href') || '';
    expect(href).toContain('/en/education/unplugged-reteach');
    expect(href).toContain('neutron');
    expect(href).not.toContain('Maya');
  });

});
