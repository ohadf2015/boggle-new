/**
 * One tap to a duel.
 *
 * The dialog opened with two decisions on screen — duel type (two tiles) and
 * lesson (a select) — even though both already had the right answer chosen.
 * Visible choices you do not have to make are still choices you have to read,
 * which is the decision-fatigue rule's b ≤ 1. They now live behind a single
 * CHANGE disclosure that states what is currently picked, so the default path
 * is: open, read one line, SEND.
 *
 * Collapsing also takes ~190px off a dialog that has to fit an 844px phone.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DuelChallengeModal from '../DuelChallengeModal';

const createChallenge = vi.fn();
vi.mock('@/hooks/useDuelSocket', () => ({
  useDuelSocket: () => ({ createChallenge }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, p?: Record<string, unknown>) =>
      p ? `${key} ${Object.values(p).join(' ')}` : key,
    language: 'en',
  }),
}));
vi.mock('@/hooks/useFocusTrap', () => ({ useFocusTrap: () => {} }));

const props = {
  opponent: { userId: 'opp-1', displayName: 'Sam' },
  lessons: [
    { id: 'lesson-1', name: 'Duel Words A' },
    { id: 'lesson-2', name: 'Duel Words B' },
  ],
  classroomId: 'class-1',
  onClose: vi.fn(),
};

describe('DuelChallengeModal — one visible decision', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hides both pickers behind one disclosure by default', () => {
    render(<DuelChallengeModal {...(props as never)} />);

    expect(screen.queryByTestId('duel-type-async')).not.toBeInTheDocument();
    expect(screen.getByTestId('duel-challenge-change')).toBeInTheDocument();
    // …and says what it already picked, so nobody has to open it to find out.
    expect(screen.getByTestId('duel-challenge-summary')).toHaveTextContent('Duel Words A');
  });

  it('still sends with the recommended defaults in a single tap', () => {
    render(<DuelChallengeModal {...(props as never)} />);

    fireEvent.click(screen.getByTestId('duel-challenge-send'));

    expect(createChallenge).toHaveBeenCalledWith('opp-1', 'lesson-1', 'class-1', 'realtime');
  });

  it('opens both pickers when a student asks to change', () => {
    render(<DuelChallengeModal {...(props as never)} />);

    fireEvent.click(screen.getByTestId('duel-challenge-change'));

    expect(screen.getByTestId('duel-type-async')).toBeInTheDocument();
    expect(screen.getByTestId('duel-type-realtime')).toBeInTheDocument();
  });

  it('never lets the dialog outgrow a phone', () => {
    render(<DuelChallengeModal {...(props as never)} />);

    const dialog = screen.getByTestId('duel-challenge-modal');
    expect(dialog.className).toMatch(/max-h-\[/);
    expect(dialog.className).toContain('overflow-y-auto');
  });
});
