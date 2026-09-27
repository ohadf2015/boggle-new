/**
 * @vitest-environment jsdom
 *
 * RED first — the teacher's assignment screen must fit 1440x900.
 *
 * Measured live 2026-09-12: `documentElement.scrollHeight` 1294 against a 900
 * viewport. 366px of that is body padding (bottom nav + cookie sheet, handled
 * by `MissGapShellLock`); the remaining **28px is real content** — the
 * always-expanded take-home practice card stacked under the compose card, whose
 * last control ("Start unplugged reteach Live") sat below the fold. The critic
 * disqualified the round on that clipped CTA.
 *
 * The take-home card is a printable parent-facing artifact, not the thing the
 * teacher came here to do — the teacher came to send the homework link. It is
 * also a second full CTA cluster (Print / Share / Start unplugged) under the
 * screen's one primary action, which the decision-fatigue rule forbids. Both
 * gates close with one change: the same disclosure the student already has.
 *
 * jsdom cannot measure 28px. What it CAN pin is the reason those 28px existed:
 * the card is not in the document until the teacher asks for it, and one tap
 * brings it back — so the fix cannot silently regress to "rendered, just
 * hidden", which measures exactly the same as before.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MissGapAsyncAssignment } from '../MissGapAsyncAssignment';
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

vi.mock('@/components/education/missGap/MissGapTeacherProgress', () => ({
  MissGapTeacherProgress: () => <div data-testid="stub-teacher-progress" />,
}));

const payload: MissGapAssignmentPayload = {
  locale: 'en',
  lesson: 'Physics 101',
  teacher: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron', 'quark'],
  dueDate: '2026-09-30',
};

function renderTeacher() {
  return render(<MissGapAsyncAssignment payload={payload} teacherMode />);
}

describe('MissGapAsyncAssignment — the teacher screen fits the fold', () => {
  it('does not render the take-home card until the teacher asks for it', () => {
    renderTeacher();
    // Absent from the DOM, not merely off-screen: a hidden-but-rendered card
    // still contributes its height and the 28px comes straight back.
    expect(screen.queryByTestId('miss-gap-practice-card')).toBeNull();
  });

  it('keeps the send-the-link action as the only primary CTA above the fold', () => {
    renderTeacher();
    expect(screen.getByTestId('share-miss-gap-async-homework')).toBeInTheDocument();
    // The take-home cluster's own CTAs go with the card.
    expect(screen.queryByTestId('miss-gap-practice-open-unplugged')).toBeNull();
    expect(screen.queryByTestId('miss-gap-practice-print-pdf')).toBeNull();
  });

  it('brings the whole take-home card back in one tap', () => {
    renderTeacher();
    fireEvent.click(screen.getByTestId('miss-gap-takehome-toggle'));
    expect(screen.getByTestId('miss-gap-practice-card')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-practice-open-unplugged')).toBeInTheDocument();
  });

  it('reports the disclosure state to assistive tech', () => {
    renderTeacher();
    const toggle = screen.getByTestId('miss-gap-takehome-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
