import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'en',
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => <a href={href} {...props}>{children}</a>,
}));
const practice = vi.fn();
vi.mock('@/components/teacher/reports/MissedPracticeAction', () => ({
  MissedPracticeAction: (p: { locked: boolean; words?: string[] }) => {
    practice(p);
    return <div data-testid="practice-action" data-locked={String(p.locked)} />;
  },
}));

import { RoundReportCard } from '../RoundReportCard';
import { ROUND_FIXTURE } from '../roundFixture';

const props = { game: ROUND_FIXTURE, classroomId: 'c1', classroomName: 'Room 7B' };

describe('RoundReportCard', () => {
  it('free: shows the round summary and the missed words, not the per-student strips', () => {
    render(<RoundReportCard {...props} hasPro={false} />);
    const card = screen.getByTestId('round-report');
    expect(within(card).getByTestId('round-report-played').textContent).toBe('teacher.rounds.played|3|4');
    expect(within(card).getAllByTestId('round-report-missed-word').map((n) => n.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('enormous')]),
    );
    expect(within(card).queryAllByTestId('round-report-strip')).toHaveLength(0);
    expect(within(card).getByTestId('round-report-locked')).toBeInTheDocument();
    expect(screen.getByTestId('practice-action')).toHaveAttribute('data-locked', 'true');
  });

  it('Pro: one strip per student with a cell per word, absentees marked', () => {
    render(<RoundReportCard {...props} hasPro />);
    const strips = screen.getAllByTestId('round-report-strip');
    expect(strips).toHaveLength(4);
    expect(within(strips[0]).getAllByTestId('round-report-cell')).toHaveLength(4);
    expect(within(strips[3]).getByText('teacher.rounds.absent')).toBeInTheDocument();
    expect(screen.queryByTestId('round-report-locked')).not.toBeInTheDocument();
  });

  it('Pro: one tap practices exactly this round\'s missed words', () => {
    render(<RoundReportCard {...props} hasPro />);
    expect(screen.getByTestId('practice-action')).toHaveAttribute('data-locked', 'false');
    expect(practice).toHaveBeenLastCalledWith(expect.objectContaining({ words: ['enormous', 'fragile', 'ancient'] }));
  });
});
