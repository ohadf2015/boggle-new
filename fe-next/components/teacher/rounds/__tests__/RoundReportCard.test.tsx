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
  it('Pro: the session report shows the summary and every player strip (reports are Pro only; a free teacher gets the page lock)', () => {
    render(<RoundReportCard {...props} hasPro />);
    const card = screen.getByTestId('round-report');
    expect(within(card).getByTestId('round-report-played').textContent).toBe('teacher.windowProgress.activeLine|3|4');
    expect(within(card).getAllByTestId('round-report-missed-word').map((n) => n.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('enormous')]),
    );
    const strips = within(card).getAllByTestId('round-report-strip');
    expect(strips).toHaveLength(3);
    expect(within(strips[0]).getAllByTestId('round-report-cell')).toHaveLength(4);
    expect(within(strips[0]).getByText('75%')).toBeInTheDocument();
    expect(within(card).getByText('academy.student.review')).toBeInTheDocument();
  });

  it('collapses the students who did not play into one line with their names', () => {
    render(<RoundReportCard {...props} hasPro={false} />);
    const absent = screen.getByTestId('round-report-absent');
    expect(within(absent).getByText('teacher.classReport.didNotPlay')).toBeInTheDocument();
    expect(within(absent).getByText('1')).toBeInTheDocument();
    expect(within(absent).getByText('Leo')).toBeInTheDocument();
  });

  it('titles an unknown mode as a class game, never the raw mode id', () => {
    render(<RoundReportCard {...props} game={{ ...ROUND_FIXTURE, gameMode: 'mystery-mode' }} hasPro={false} />);
    expect(screen.getByRole('heading', { level: 3 }).textContent).toContain('teacher.classReport.notes.title');
    expect(screen.queryByText(/mystery-mode/)).not.toBeInTheDocument();
  });

  it('sorts students by accuracy, lowest first, or by name', () => {
    render(<RoundReportCard {...props} hasPro={false} />);
    const names = () => screen.getAllByTestId('round-report-strip').map((n) => n.textContent?.match(/Maya|Omar|Sofia/)?.[0]);
    expect(names()).toEqual(['Maya', 'Omar', 'Sofia']);
    fireEvent.change(screen.getByLabelText('ugc.gallery.sortLabel'), { target: { value: 'accuracy' } });
    expect(names()).toEqual(['Sofia', 'Omar', 'Maya']);
    fireEvent.change(screen.getByLabelText('ugc.gallery.sortLabel'), { target: { value: 'name' } });
    expect(names()).toEqual(['Maya', 'Omar', 'Sofia']);
  });

  it('the words tab lists every lesson word with how many players missed it, hardest first', () => {
    render(<RoundReportCard {...props} hasPro={false} />);
    fireEvent.click(screen.getByRole('tab', { name: 'teacher.lastGame.lessonWords' }));
    const rows = screen.getAllByTestId('round-report-word-row');
    expect(rows.map((r) => r.getAttribute('data-word'))).toEqual(['enormous', 'fragile', 'ancient', 'brave']);
    expect(within(rows[0]).getByText('3/3')).toBeInTheDocument();
    expect(within(rows[0]).getByText('100%')).toBeInTheDocument();
    expect(screen.queryByTestId('round-report-strip')).not.toBeInTheDocument();
  });

  it('the grid tab shows a word x student grid of the players only, and a header opens the drill-down', () => {
    const onStudentClick = vi.fn();
    render(<RoundReportCard {...props} hasPro={false} onStudentClick={onStudentClick} />);
    fireEvent.click(screen.getByRole('tab', { name: 'teacher.classReport.title' }));
    const headers = screen.getAllByTestId('report-student-header');
    expect(headers.map((h) => h.textContent)).toEqual(['Maya', 'Omar', 'Sofia']);
    expect(screen.getAllByTestId('report-row')).toHaveLength(4);
    fireEvent.click(headers[1]);
    expect(onStudentClick).toHaveBeenCalledWith('s2', 'Omar');
  });

  it('prints the round report', () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    render(<RoundReportCard {...props} hasPro={false} />);
    fireEvent.click(screen.getByTestId('round-report-print'));
    expect(print).toHaveBeenCalled();
    vi.unstubAllGlobals();
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

  it('warns that a quiz may count unasked words as missed, on the words and grid views', () => {
    render(<RoundReportCard {...props} hasPro={false} />);
    fireEvent.click(screen.getByRole('tab', { name: 'teacher.lastGame.lessonWords' }));
    expect(screen.getByTestId('round-report-quiz-caveat').textContent).toContain('teacher.classReport.quizCaveat');
    fireEvent.click(screen.getByRole('tab', { name: 'teacher.classReport.title' }));
    expect(screen.getByTestId('round-report-quiz-caveat')).toBeInTheDocument();
  });

  it('shows no quiz caveat for a board round', () => {
    render(<RoundReportCard {...props} game={{ ...ROUND_FIXTURE, gameMode: 'wordcraft' }} hasPro={false} />);
    fireEvent.click(screen.getByRole('tab', { name: 'teacher.lastGame.lessonWords' }));
    expect(screen.queryByTestId('round-report-quiz-caveat')).not.toBeInTheDocument();
  });

  it('a round with no lesson words says so and lists the players by score, instead of claiming the class found every word', () => {
    const game = { ...ROUND_FIXTURE, gameMode: 'classic', missedWords: [], wordsNobodyFound: [], totalLessonWords: 0 };
    render(<RoundReportCard {...props} game={game} hasPro={false} />);
    expect(screen.getByText('eduLive.results.noLessonTitle')).toBeInTheDocument();
    expect(screen.queryByText('teacher.lastGame.nothingToReview')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('practice-action')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('round-report-player').map((n) => n.textContent)).toEqual(['Maya420', 'Omar310', 'Sofia150']);
  });

  it('colours the accuracy stat by how well the class did, so a 0% never renders as a pale success colour', () => {
    const { rerender } = render(<RoundReportCard {...props} game={{ ...ROUND_FIXTURE, averageAccuracyPct: 0 }} hasPro />);
    expect(screen.getByTestId('round-report-accuracy').getAttribute('data-tone')).toBe('danger');
    rerender(<RoundReportCard {...props} game={{ ...ROUND_FIXTURE, averageAccuracyPct: 65 }} hasPro />);
    expect(screen.getByTestId('round-report-accuracy').getAttribute('data-tone')).toBe('warning');
    rerender(<RoundReportCard {...props} game={{ ...ROUND_FIXTURE, averageAccuracyPct: 92 }} hasPro />);
    expect(screen.getByTestId('round-report-accuracy').getAttribute('data-tone')).toBe('success');
  });

  it('puts the practice action in its own footer inside the card, not on the card edge', () => {
    render(<RoundReportCard {...props} hasPro />);
    const footer = screen.getByTestId('round-report-footer');
    expect(within(footer).getByTestId('practice-action')).toBeInTheDocument();
    expect(footer.closest('[data-testid="round-report"]')).not.toBeNull();
  });

  it('gives each student row a column header line and a glyph in every word cell, so the strip survives print', () => {
    render(<RoundReportCard {...props} hasPro />);
    expect(screen.getByTestId('round-report-columns')).toBeInTheDocument();
    const cells = within(screen.getAllByTestId('round-report-strip')[0]).getAllByTestId('round-report-cell');
    expect(cells.map((c) => c.getAttribute('data-state'))).toEqual(['missed', 'found', 'found', 'found']);
    cells.forEach((c) => expect(c.querySelector('svg')).not.toBeNull());
    expect(cells[0].getAttribute('title')).toBe('enormous: teacher.lastGame.missed');
  });

  it('lets a student\'s word cells wrap inside their column, so a long lesson never spills over the accuracy and score on a phone', () => {
    render(<RoundReportCard {...props} hasPro />);
    const strip = screen.getAllByTestId('round-report-strip')[0];
    const cells = within(strip).getByTestId('round-report-cells');
    expect(cells.className).toContain('flex-wrap');
    expect(cells.className).toContain('min-w-0');
  });
});
