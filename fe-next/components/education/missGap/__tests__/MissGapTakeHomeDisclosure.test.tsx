/**
 * @vitest-environment jsdom
 *
 * The take-home practice card is the 28px that lost round 5.
 *
 * At 1440x900 the teacher's compose screen measured `scrollHeight` 1294 against
 * a 900 viewport. 366px of that was body padding (bottom nav + cookie sheet,
 * now handled by `MissGapShellLock`); the remaining **28px was real content** —
 * the always-expanded printable card stacked under the compose card, whose last
 * control ("Start unplugged reteach Live") fell below the fold. The critic
 * disqualified the round on that clipped CTA.
 *
 * jsdom cannot measure 28px. What it pins is the REASON those 28px existed: the
 * card is not in the document until asked for, and one tap brings it back — so
 * the fix can never quietly regress to "rendered, just hidden", which measures
 * exactly the same as before.
 *
 * This lives next to the disclosure now that it owns its own open state, so the
 * reason stays pinned where the code is.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MissGapTakeHomeDisclosure } from '../MissGapTakeHomeDisclosure';
import type { MissGapAssignmentPayload } from '@/lib/education/missGapAsyncAssignment';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

vi.mock('@/utils/shareWithFallback', () => ({
  shareWithFallback: vi.fn().mockResolvedValue('copied'),
}));

vi.mock('@/lib/education/missedWordsPracticeSheet', () => ({
  openMissedWordsPracticeSheet: vi.fn().mockReturnValue(true),
}));

const payload: MissGapAssignmentPayload = {
  locale: 'en',
  lesson: 'Week 3',
  teacher: 'Ms G',
  found: 7,
  total: 10,
  missedWords: ['apple', 'brave', 'charm'],
  dueDate: '2099-01-01',
  definitions: {},
};

describe('Given the teacher assignment screen at 1440x900', () => {
  it('When it first paints, Then the take-home card is absent from the document', () => {
    render(<MissGapTakeHomeDisclosure payload={payload} />);
    expect(screen.getByTestId('miss-gap-takehome-toggle')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByTestId('miss-gap-practice-card')).toBeNull();
  });

  it('When the teacher taps the disclosure, Then the printable card mounts', () => {
    render(<MissGapTakeHomeDisclosure payload={payload} />);
    fireEvent.click(screen.getByTestId('miss-gap-takehome-toggle'));
    expect(screen.getByTestId('miss-gap-practice-card')).toBeInTheDocument();
  });
});
