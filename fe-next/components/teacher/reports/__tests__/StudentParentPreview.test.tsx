import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildStudentInsights } from '@/lib/education/studentInsights';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'en',
  }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { StudentParentPreview } from '../StudentParentPreview';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';

const insights = buildStudentInsights({
  progressRows: [{ total_xp: 10, words_mastered: [], words_attempted: { sun: { correct: 0, attempts: 3 } }, completed_at: null, current_streak: 0, longest_streak: 0 }],
  sessionRows: [],
  now: new Date(),
});

describe('StudentParentPreview', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads the shared insights for this student and renders the parent report body', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, insights }) });
    render(<StudentParentPreview classroomId={CLASS_ID} studentId={STUDENT} studentName="Ana" />);
    expect(await screen.findByTestId('report-practice')).toHaveTextContent('sun');
    expect(fetchMock).toHaveBeenCalledWith(`/api/education/classroom/${CLASS_ID}/members/${STUDENT}/insights`);
    expect(screen.getByRole('button', { name: 'education.analytics.shareParentReport' })).toBeInTheDocument();
  });

  it('shows a visible error when the read fails, never an empty report', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ ok: false }) });
    render(<StudentParentPreview classroomId={CLASS_ID} studentId={STUDENT} studentName="Ana" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('parentReport.loadFailed');
    expect(screen.queryByTestId('report-headline')).toBeNull();
  });
});
