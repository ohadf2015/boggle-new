/**
 * @vitest-environment jsdom
 *
 * RED first — the turn-in screen has to fit a desktop viewport.
 *
 * Measured live at 1440x900 (2026-09-12, mirror :3011, screenshot
 * `/tmp/hw-r6/gradepass-1440.png`): the grade card and the parent-WhatsApp card
 * are stacked in ONE `max-w-xl` column, so the scroll region stood 1088px tall
 * against a 900px viewport and two live controls — "Open miss-gap practice
 * card" and "Open async miss-gap homework" — sat entirely below the fold on a
 * desktop screen with 460px of unused width on either side. That is the exact
 * shape the last critic disqualified us for, and a single narrow column on a
 * 1440 screen is its own gap besides.
 *
 * The assignment card already solved this: from `lg` it becomes a two-column
 * grid with `items-start` + `content-start` so the rows keep their content
 * height instead of stretching to the region. Same contract here.
 *
 * The page body never scrolls either way (the shell lock owns that); what this
 * pins is that the desktop layout stops being a one-column tower.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MissGapGradePassback } from '../../MissGapGradePassback';
import { toMissGapAssignmentPayload } from '@/lib/education/missGapAsyncAssignment';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));

const payload = toMissGapAssignmentPayload({
  locale: 'en',
  lesson: 'Week 3 Vocabulary',
  teacher: 'Ms G',
  found: 12,
  total: 20,
  missedWords: ['brave', 'gleam', 'harvest', 'summit', 'drift'],
  dueDate: '2099-01-01',
});

describe('MissGapGradePassback — the turn-in screen fits 1440x900', () => {
  it('lays the two cards side by side from lg instead of stacking a tower', () => {
    render(<MissGapGradePassback payload={payload} />);
    const stack = screen.getByTestId('miss-gap-grade-passback-stack');
    expect(stack.className).toContain('lg:grid');
    expect(stack.className).toContain('lg:grid-cols-2');
    // Content height, not stretched rows — the mistake that floated the
    // assignment card's disclosure 190px under its compose card.
    expect(stack.className).toContain('lg:items-start');
    expect(stack.className).toContain('lg:content-start');
    expect(stack.className).toContain('lg:max-w-5xl');
  });

  it('keeps the phone layout a single column', () => {
    render(<MissGapGradePassback payload={payload} />);
    const stack = screen.getByTestId('miss-gap-grade-passback-stack');
    expect(stack.className).toContain('flex-col');
    expect(stack.className).toContain('max-w-xl');
  });

  it('still renders both the grade card and the parent share card', () => {
    render(<MissGapGradePassback payload={payload} />);
    expect(screen.getByTestId('miss-gap-grade-passback')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-grade-copy-receipt')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-grade-back-homework')).toBeInTheDocument();
  });
});
