/**
 * The gentle-timer dial on the desktop shell clock (RED first).
 *
 * MpTimer fires its own ≤10s pink urgency with no suppress path — on school
 * Chromebooks the teacher's gentle dial did nothing. suppressUrgency mirrors
 * the CircularTimer prop: the clock keeps counting, the pink punch never fires.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MpTimer } from '../MpTimer';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

describe('MpTimer — suppressUrgency (gentle dial)', () => {
  it('does not go urgent at 5s when suppressed', () => {
    render(<MpTimer remainingSec={5} totalSec={180} size="md" suppressUrgency />);
    expect(screen.getByTestId('mp-timer')).toHaveAttribute('data-urgent', 'false');
    expect(screen.getByTestId('mp-timer-digits').className).not.toContain('text-neo-pink');
  });

  it('goes urgent at 5s by default', () => {
    render(<MpTimer remainingSec={5} totalSec={180} size="md" />);
    expect(screen.getByTestId('mp-timer')).toHaveAttribute('data-urgent', 'true');
    expect(screen.getByTestId('mp-timer-digits').className).toContain('text-neo-pink');
  });
});
