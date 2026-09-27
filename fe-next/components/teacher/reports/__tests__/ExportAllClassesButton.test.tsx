import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const proState: { hasPro: boolean; loading: boolean } = { hasPro: true, loading: false };
const authState: { user: { id: string } | null } = { user: { id: 'teacher-1' } };

const TRANSLATIONS: Record<string, string> = {
  'teacher.reports.exportAllClasses.button': 'Export all classes',
  'teacher.reports.exportAllClasses.downloading': 'Exporting…',
  'teacher.reports.exportAllClasses.failed': 'Couldn\'t export your classes. Try again.',
  'teacher.reports.exportAllClasses.empty': 'Nothing to export yet',
  'teacher.reports.exportAllClasses.fileName': 'All classes – progress export',
  'teacher.reports.exportAllClasses.columns.classroom': 'Classroom',
  'teacher.reports.exportAllClasses.columns.student': 'Student',
  'teacher.reports.exportAllClasses.columns.lessonsCompleted': 'Lessons completed',
  'teacher.reports.exportAllClasses.columns.wordsMastered': 'Words mastered',
  'teacher.reports.exportAllClasses.columns.totalXp': 'Total XP',
  'teacher.reports.exportAllClasses.columns.lastActive': 'Last active',
  'teacher.reports.exportAllClasses.columns.gamesPlayed': 'Games played',
  'teacher.reports.exportAllClasses.anonymousStudent': 'Student {{id}}',
  'teacher.proGate.reports.title': 'Unlock reports',
  'teacher.proGate.reports.body': 'Upgrade to see printable class reports.',
  'teacher.proGate.cta': 'Upgrade for {{price}}',
};

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => proState,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      let value = TRANSLATIONS[key] || key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{{${k}}}`, String(v));
        }
      }
      return value;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

const { toastFn, toastError } = vi.hoisted(() => {
  const toastError = vi.fn();
  const toastFn = Object.assign(vi.fn(), { error: toastError, success: vi.fn() });
  return { toastFn, toastError };
});
vi.mock('react-hot-toast', () => ({
  default: toastFn,
}));

vi.mock('@/lib/supabase/education/teacherExportAllClasses', () => ({
  getTeacherExportRows: vi.fn(),
}));

vi.mock('@/lib/education/assignmentProgressReport', async () => {
  const actual = await vi.importActual<typeof import('@/lib/education/assignmentProgressReport')>(
    '@/lib/education/assignmentProgressReport',
  );
  return { ...actual, downloadCsvFile: vi.fn() };
});

import { getTeacherExportRows } from '@/lib/supabase/education/teacherExportAllClasses';
import { downloadCsvFile } from '@/lib/education/assignmentProgressReport';
import { ExportAllClassesButton } from '../ExportAllClassesButton';

const sampleRow = {
  classroomId: 'c1',
  classroomName: 'Grade 5A',
  studentId: 's1',
  studentName: 'Ada',
  lessonsCompleted: 3,
  wordsMastered: 12,
  totalXp: 450,
  lastActive: '2026-09-20',
  gamesPlayed: 7,
};

describe('ExportAllClassesButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proState.hasPro = true;
    proState.loading = false;
    authState.user = { id: 'teacher-1' };
  });

  it('hides the export action behind the Pro gate for a free teacher', () => {
    proState.hasPro = false;
    render(<ExportAllClassesButton />);

    expect(screen.queryByRole('button', { name: 'Export all classes' })).not.toBeInTheDocument();
    expect(screen.getByText('Unlock reports')).toBeInTheDocument();
  });

  it('renders nothing while Pro entitlement is still resolving (no flash)', () => {
    proState.loading = true;
    const { container } = render(<ExportAllClassesButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an enabled export button for a Pro teacher', () => {
    render(<ExportAllClassesButton />);
    const button = screen.getByRole('button', { name: 'Export all classes' });
    expect(button).toBeEnabled();
  });

  it('fetches rows, builds the CSV, and triggers the shared download helper on click', async () => {
    (getTeacherExportRows as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [sampleRow], error: null });
    const user = userEvent.setup();
    render(<ExportAllClassesButton />);

    await user.click(screen.getByRole('button', { name: 'Export all classes' }));

    await waitFor(() => expect(downloadCsvFile).toHaveBeenCalledTimes(1));
    const [fileName, csv] = (downloadCsvFile as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fileName).toBe('All classes – progress export');
    expect(csv.split('\n')[0]).toBe('Classroom,Student,Lessons completed,Words mastered,Total XP,Last active,Games played');
    expect(csv.split('\n')[1]).toBe('Grade 5A,Ada,3,12,450,2026-09-20,7');
    expect(getTeacherExportRows).toHaveBeenCalledWith('teacher-1');
  });

  it('substitutes the translated anonymous-student label instead of a hardcoded string for a null studentName', async () => {
    (getTeacherExportRows as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ ...sampleRow, studentName: null, studentId: 'abcdef1234567890' }],
      error: null,
    });
    const user = userEvent.setup();
    render(<ExportAllClassesButton />);

    await user.click(screen.getByRole('button', { name: 'Export all classes' }));

    await waitFor(() => expect(downloadCsvFile).toHaveBeenCalledTimes(1));
    const [, csv] = (downloadCsvFile as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(csv.split('\n')[1]).toBe('Grade 5A,Student abcdef12,3,12,450,2026-09-20,7');
  });

  it('shows a loading state while the export is in flight, then returns to idle', async () => {
    let resolveFetch: (v: { data: typeof sampleRow[]; error: null }) => void = () => {};
    (getTeacherExportRows as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => { resolveFetch = resolve; }),
    );
    const user = userEvent.setup();
    render(<ExportAllClassesButton />);

    const button = screen.getByRole('button', { name: 'Export all classes' });
    await user.click(button);

    expect(await screen.findByRole('button', { name: 'Exporting…' })).toBeDisabled();

    resolveFetch({ data: [sampleRow], error: null });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Export all classes' })).toBeEnabled());
  });

  it('shows an error toast and does not download anything when the fetch fails', async () => {
    (getTeacherExportRows as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: { message: 'RLS denied' } });
    const user = userEvent.setup();
    render(<ExportAllClassesButton />);

    await user.click(screen.getByRole('button', { name: 'Export all classes' }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Couldn\'t export your classes. Try again.'));
    expect(downloadCsvFile).not.toHaveBeenCalled();
  });

  it('shows an info toast and does not download an empty file when there is nothing to export', async () => {
    (getTeacherExportRows as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    const user = userEvent.setup();
    render(<ExportAllClassesButton />);

    await user.click(screen.getByRole('button', { name: 'Export all classes' }));

    await waitFor(() => expect(toastFn).toHaveBeenCalledWith('Nothing to export yet'));
    expect(downloadCsvFile).not.toHaveBeenCalled();
  });

  it('shows an error toast if getTeacherExportRows throws instead of returning {error}', async () => {
    (getTeacherExportRows as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();
    render(<ExportAllClassesButton />);

    await user.click(screen.getByRole('button', { name: 'Export all classes' }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Couldn\'t export your classes. Try again.'));
    expect(downloadCsvFile).not.toHaveBeenCalled();
  });
});
