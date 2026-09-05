/**
 * ChatGPT Action host landing: auto-seed a 3-min reteach Live.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatGptReteachAutostart } from '../ChatGptReteachAutostart';
import {
  CLASS_GAP_RETEACH_LIVE_LESSON_ID,
  CLASS_GAP_RETEACH_TIMER_SECONDS,
  type ClassGapSharePayload,
} from '@/lib/education/classGapShare';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: replace }),
}));

const payload: ClassGapSharePayload = {
  locale: 'en',
  lesson: 'Unit 4 plants',
  teacher: '',
  found: 0,
  total: 2,
  missedWords: ['photosynthesis', 'chlorophyll'],
};

describe('ChatGptReteachAutostart', () => {
  beforeEach(() => {
    replace.mockClear();
    sessionStorage.clear();
  });

  it('auto-stages missed words + 3-min timer and opens a NEW Live room', () => {
    render(
      <ChatGptReteachAutostart
        payload={payload}
        reteachLabel="Start 3-min reteach Live"
        educationHref="/en/education"
        educationLabel="Play a class game"
      />,
    );
    const staged = JSON.parse(sessionStorage.getItem('lessonGameData') || 'null');
    expect(staged.lessonId).toBe(CLASS_GAP_RETEACH_LIVE_LESSON_ID);
    expect(staged.vocabularyWords).toEqual(['photosynthesis', 'chlorophyll']);
    expect(staged.templateSettings.timerSeconds).toBe(CLASS_GAP_RETEACH_TIMER_SECONDS);
    expect(replace).toHaveBeenCalledWith('/en/multiplayer?fromLesson=true&autoCreate=true');
    expect(JSON.stringify(staged)).not.toMatch(/Maya|student/i);
  });

  it('still offers a manual start if auto-nav is skipped', () => {
    render(
      <ChatGptReteachAutostart
        payload={payload}
        reteachLabel="Start 3-min reteach Live"
        educationHref="/en/education"
        educationLabel="Play a class game"
      />,
    );
    fireEvent.click(screen.getByTestId('chatgpt-start-reteach-live'));
    expect(replace).toHaveBeenCalledWith('/en/multiplayer?fromLesson=true&autoCreate=true');
  });

  it('falls back to education when there are no missed words', () => {
    render(
      <ChatGptReteachAutostart
        payload={{ ...payload, missedWords: [] }}
        reteachLabel="Start 3-min reteach Live"
        educationHref="/en/education"
        educationLabel="Play a class game"
      />,
    );
    expect(screen.queryByTestId('chatgpt-start-reteach-live')).not.toBeInTheDocument();
    expect(screen.getByText('Play a class game')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
