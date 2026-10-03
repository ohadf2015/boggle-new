import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }));
const getClassrooms = vi.fn();
vi.mock('@/lib/supabase/education/classrooms', () => ({ getClassrooms: (...a: unknown[]) => getClassrooms(...a) }));
const download = vi.fn();
vi.mock('@/lib/education/assignmentProgressReport', () => ({ downloadCsvFile: (...a: unknown[]) => download(...a) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { ParentReportPack } from '../ParentReportPack';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';

describe('ParentReportPack — every parent link for a class in one click', () => {
  const fetchMock = vi.fn();
  const writeText = vi.fn();
  beforeEach(() => {
    getClassrooms.mockResolvedValue({ data: [{ id: CLASS_ID, name: '4B', member_count: 2 }], error: null });
    fetchMock.mockReset();
    writeText.mockReset().mockResolvedValue(undefined);
    download.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('offers only classes that have students, so an empty class name never fills the pick list', async () => {
    getClassrooms.mockResolvedValue({
      data: [
        { id: 'empty', name: 'EG2 QA class', member_count: 0 },
        { id: CLASS_ID, name: '4B', member_count: 2 },
      ],
      error: null,
    });
    render(<ParentReportPack />);
    const select = await screen.findByRole('combobox');
    expect(select).toHaveValue(CLASS_ID);
    expect(screen.queryByText(/EG2 QA class/)).toBeNull();
  });

  it('with no students anywhere, says how to get them in instead of listing empty classes', async () => {
    getClassrooms.mockResolvedValue({ data: [{ id: 'empty', name: 'EG2 QA class', member_count: 0 }], error: null });
    render(<ParentReportPack />);
    expect(await screen.findByTestId('parent-pack-no-students')).toHaveTextContent('eg2Polish.pack.noStudents');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByText(/EG2 QA class/)).toBeNull();
  });

  it('mints links for the chosen class and lists every student', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, classroomName: '4B', links: [
        { studentId: 's1', name: 'Maya', path: '/report/a' },
        { studentId: 's2', name: '', path: '/report/b' },
      ] }),
    });
    render(<ParentReportPack />);
    const make = await screen.findByRole('button', { name: /eg2Pro\.pack\.make/ });
    fireEvent.click(make);
    await waitFor(() => expect(screen.getAllByTestId('parent-pack-row')).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledWith('/api/teacher/pro/parent-links', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ classroomId: CLASS_ID });
    expect(screen.getByText(/eg2Pro\.pack\.unnamed\|2/)).toBeInTheDocument();
  });

  it('copies all links as name: url lines and downloads a CSV', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, classroomName: '4B', links: [{ studentId: 's1', name: 'Maya', path: '/report/a' }] }),
    });
    render(<ParentReportPack />);
    fireEvent.click(await screen.findByRole('button', { name: /eg2Pro\.pack\.make/ }));
    fireEvent.click(await screen.findByRole('button', { name: /eg2Pro\.pack\.copyAll/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toMatch(/^Maya: http.*\/en\/report\/a$/);
    fireEvent.click(screen.getByRole('button', { name: /eg2Pro\.pack\.csv/ }));
    expect(download).toHaveBeenCalledTimes(1);
    expect(download.mock.calls[0][1]).toContain('Maya,');
  });

  it('explains a 402 instead of failing silently', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 402, json: async () => ({ ok: false }) });
    render(<ParentReportPack />);
    fireEvent.click(await screen.findByRole('button', { name: /eg2Pro\.pack\.make/ }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('eg2Pro.pack.needsPro'));
  });

  it('says there is no class yet when the teacher has none', async () => {
    getClassrooms.mockResolvedValue({ data: [], error: null });
    render(<ParentReportPack />);
    expect(await screen.findByText('eg2Pro.pack.noClasses')).toBeInTheDocument();
  });
});
