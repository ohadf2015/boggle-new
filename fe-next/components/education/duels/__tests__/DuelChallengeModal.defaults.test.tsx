// @ts-nocheck
/**
 * One tap must be enough to challenge a classmate.
 *
 * The dialog opened with NOTHING chosen: duel type defaulted to turn-based and
 * the lesson picker was empty, so SEND CHALLENGE stayed disabled until the
 * student made two decisions. The recommended path (a live duel on the lesson
 * the class is on) is now pre-selected; the choices remain, they are just not
 * a toll gate.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DuelChallengeModal from '../DuelChallengeModal';
import { useDuelSocket } from '@/hooks/useDuelSocket';

vi.mock('@/hooks/useDuelSocket');
vi.mock('@/components/ui/select', () => {
  const Select = ({ value, onValueChange, children }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  );
  const SelectItem = ({ value, children }: any) => <option value={value}>{children}</option>;
  const passthrough = ({ children }: any) => <>{children}</>;
  return {
    Select,
    SelectContent: passthrough,
    SelectItem,
    SelectTrigger: passthrough,
    SelectValue: passthrough,
  };
});
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', t: (key: string) => key }),
}));

describe('DuelChallengeModal — one tap to a duel', () => {
  const createChallenge = vi.fn();
  const onClose = vi.fn();
  const props = {
    opponent: { userId: 'opponent-1', displayName: 'Maya', avatarUrl: null },
    lessons: [
      { id: 'lesson-1', name: 'Unit 3 verbs' },
      { id: 'lesson-2', name: 'Unit 4 nouns' },
    ],
    classroomId: 'classroom-1',
    onClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useDuelSocket as any).mockReturnValue({
      socket: {},
      isConnected: true,
      createChallenge,
    });
  });

  it('sends a real-time duel on the first lesson with a single tap', () => {
    render(<DuelChallengeModal {...props} />);

    fireEvent.click(screen.getByText('sendChallenge'));

    expect(createChallenge).toHaveBeenCalledWith(
      'opponent-1',
      'lesson-1',
      'classroom-1',
      'realtime'
    );
  });

  it('marks the live duel as the recommended option', () => {
    render(<DuelChallengeModal {...props} />);
    // Both pickers now live behind the CHANGE disclosure.
    fireEvent.click(screen.getByTestId('duel-challenge-change'));

    const recommended = screen.getByTestId('duel-type-realtime');
    expect(recommended).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('duel-type-async')).toHaveAttribute('aria-pressed', 'false');
  });

  it('leaves the unselected duel type readable as a control', () => {
    render(<DuelChallengeModal {...props} />);
    // Both pickers now live behind the CHANGE disclosure.
    fireEvent.click(screen.getByTestId('duel-challenge-change'));

    // A black border on the navy dialog measures 1.23:1 and vanishes; the
    // unselected tile needs a cream edge, and the width must be arbitrary so
    // tailwind-merge cannot collapse it into the colour class.
    const unselected = screen.getByTestId('duel-type-async');
    expect(unselected).toHaveClass('border-[3px]');
    expect(unselected).toHaveClass('border-neo-cream');
  });

  it('still lets the student change both choices', () => {
    render(<DuelChallengeModal {...props} />);
    // Both pickers now live behind the CHANGE disclosure.
    fireEvent.click(screen.getByTestId('duel-challenge-change'));

    fireEvent.click(screen.getByTestId('duel-type-async'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lesson-2' } });
    fireEvent.click(screen.getByText('sendChallenge'));

    expect(createChallenge).toHaveBeenCalledWith('opponent-1', 'lesson-2', 'classroom-1', 'async');
  });
});
