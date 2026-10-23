import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'en',
  }),
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
  it('free: the whole session report is free, summary and per-student strips', () => {
    render(<RoundReportCard {...props} hasPro={false} />);
    const card = screen.getByTestId('round-report');
    expect(within(card).getByTestId('round-report-played').textContent).toBe('teacher.pulse.participation|3|4|1');
    expect(within(card).getAllByTestId('round-report-missed-word').map((n) => n.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('enormous')]),
    );
    const strips = within(card).getAllByTestId('round-report-strip');
    expect(strips).toHaveLength(4);
    expect(within(strips[0]).getAllByTestId('round-report-cell')).toHaveLength(4);
    expect(within(strips[3]).getByText('teacher.classReport.state.absent')).toBeInTheDocument();
    expect(within(card).getByText('academy.student.review')).toBeInTheDocument();
  });

  it('free: practising the missed words is the Pro step, locked', () => {
    render(<RoundReportCard {...props} hasPro={false} />);
    expect(screen.getByTestId('practice-action')).toHaveAttribute('data-locked', 'true');
  });

  it('Pro: one tap practices exactly this round\'s missed words', () => {
    render(<RoundReportCard {...props} hasPro />);
    expect(screen.getByTestId('practice-action')).toHaveAttribute('data-locked', 'false');
    expect(practice).toHaveBeenLastCalledWith(expect.objectContaining({ words: ['enormous', 'fragile', 'ancient'] }));
  });

  it('tapping a player opens that student\'s drill-down; an absent student is not a link', () => {
    const onStudentClick = vi.fn();
    render(<RoundReportCard {...props} hasPro={false} onStudentClick={onStudentClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Omar/ }));
    expect(onStudentClick).toHaveBeenCalledWith('s2', 'Omar');
    expect(screen.queryByRole('button', { name: /Leo/ })).not.toBeInTheDocument();
  });
});
