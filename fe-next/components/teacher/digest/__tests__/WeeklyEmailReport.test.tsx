import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeeklyEmailReport } from '../WeeklyEmailReport';

const refresh = vi.fn();
const digestMock = vi.fn();
vi.mock('@/hooks/useWeeklyProgressDigest', () => ({
  useWeeklyProgressDigest: (...args: unknown[]) => digestMock(...args),
}));

const copied = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  trackTeacherWeeklyEmailReportCopied: (args: unknown) => copied(args),
}));

const langState = { language: 'en' as string };
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}:${JSON.stringify(vars)}` : k),
    language: langState.language,
  }),
}));

const writeText = vi.fn().mockResolvedValue(undefined);
const share = vi.fn().mockResolvedValue(undefined);

function metrics(overrides: Record<string, unknown> = {}) {
  return {
    metrics: {
      thisWeek: {
        studentsActive: 4,
        rosterCount: 10,
        gamesCompleted: 6,
        wordsCompleted: 22,
        assignmentCompleted: 3,
        assignmentExpected: 10,
        assignmentCompletionPct: 30,
      },
      lastWeek: {
        studentsActive: 2,
        rosterCount: 10,
        gamesCompleted: 3,
        wordsCompleted: 10,
        assignmentCompleted: 1,
        assignmentExpected: 10,
        assignmentCompletionPct: 10,
      },
      wow: {
        studentsActive: 2,
        gamesCompleted: 3,
        wordsCompleted: 12,
        assignmentCompletionPctPoints: 20,
      },
      averageScorePct: 81,
      averageScoreWowDeltaPct: 5,
      inactiveCount: 1,
      students: [],
      ...overrides,
    },
    studentsJoinedThisWeek: 2,
    wordsMasteredThisWeek: 14,
    isLoading: false,
    error: null,
    refresh,
    assignmentCount: 0,
  };
}

describe('WeeklyEmailReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    langState.language = 'en';
    digestMock.mockReturnValue(metrics());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  });

  it('shows the four weekly metrics for the selected classroom', () => {
    render(<WeeklyEmailReport classroomId="c1" classroomName="Year 7" />);
    const block = screen.getByTestId('weekly-email-report');
    expect(block).toHaveTextContent('2');
    expect(block).toHaveTextContent('6');
    expect(block).toHaveTextContent('81% (+5)');
    expect(block).toHaveTextContent('14');
  });

  it('copies the email text and captures the copy action', async () => {
    render(<WeeklyEmailReport classroomId="c1" classroomName="Year 7" />);
    fireEvent.click(screen.getByTestId('weekly-email-report-copy'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('teacher.digest.emailReportSubject:{"classroom":"Year 7"}');
    expect(text).toContain('teacher.digest.emailReportStudentsJoined:{"count":2}');
    expect(text).toContain('teacher.digest.emailReportGamesPlayed:{"count":6}');
    expect(text).toContain('teacher.digest.emailReportWordsMastered:{"count":14}');
    expect(copied).toHaveBeenCalledWith({ classroomId: 'c1' });
    expect(screen.getByTestId('weekly-email-report-copied')).toBeInTheDocument();
  });

  it('falls back to the share sheet when the clipboard rejects', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    render(<WeeklyEmailReport classroomId="c1" classroomName="Year 7" />);
    fireEvent.click(screen.getByTestId('weekly-email-report-copy'));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0]).toMatchObject({ text: expect.stringContaining('Year 7') });
  });

  it('builds the mailto href from the formatter subject and body', () => {
    render(<WeeklyEmailReport classroomId="c1" classroomName="Year 7" />);
    const href = screen.getByTestId('weekly-email-report-mailto').getAttribute('href') ?? '';
    expect(href.startsWith('mailto:?subject=')).toBe(true);
    const query = href.slice('mailto:'.length);
    const params = new URLSearchParams(query);
    expect(params.get('subject')).toBe('teacher.digest.emailReportSubject:{"classroom":"Year 7"}');
    const body = params.get('body') ?? '';
    expect(body).toContain('teacher.digest.emailReportStudentsJoined:{"count":2}');
    expect(body).toContain('teacher.digest.emailReportGamesPlayed:{"count":6}');
    expect(body).toContain('teacher.digest.emailReportWordsMastered:{"count":14}');
  });

  it('renders loading and error states like the digest card', () => {
    digestMock.mockReturnValue({ ...metrics(), isLoading: true, metrics: null });
    const { rerender } = render(<WeeklyEmailReport classroomId="c1" classroomName="Year 7" />);
    expect(screen.getByTestId('weekly-email-report-loading')).toBeInTheDocument();

    digestMock.mockReturnValue({ ...metrics(), metrics: null, error: new Error('boom') });
    rerender(<WeeklyEmailReport classroomId="c1" classroomName="Year 7" />);
    expect(screen.getByTestId('weekly-email-report-error')).toBeInTheDocument();
  });

  it('renders Hebrew strings through t() without hardcoded text', () => {
    langState.language = 'he';
    digestMock.mockReturnValue(metrics({ averageScorePct: null, averageScoreWowDeltaPct: null }));
    render(<WeeklyEmailReport classroomId="c1" classroomName="כיתה ז" />);
    expect(screen.getByTestId('weekly-email-report')).toHaveTextContent(
      'teacher.digest.emailReportTitle',
    );
    expect(screen.getByTestId('weekly-email-report')).toHaveTextContent('—');
  });
});
