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
const getClassroomStudents = vi.fn();
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassrooms: (...a: unknown[]) => getClassrooms(...a),
  getClassroomStudents: (...a: unknown[]) => getClassroomStudents(...a),
}));
const download = vi.fn();
vi.mock('@/lib/education/assignmentProgressReport', () => ({ downloadCsvFile: (...a: unknown[]) => download(...a) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { ParentReportPack } from '../ParentReportPack';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const S1 = '22222222-2222-4222-8222-222222222222';
const S2 = '33333333-3333-4333-8333-333333333333';

const roster = () => ({
  data: [
    { student_id: S1, profiles: { display_name: 'Maya', username: null } },
    { student_id: S2, profiles: { display_name: null, username: null } },
  ],
  error: null,
});

const linksResponse = (links: Array<{ studentId: string; name: string; path: string }>) => ({
  ok: true,
  status: 200,
  json: async () => ({ ok: true, classroomName: '4B', links }),
});

describe('ParentReportPack — pick students, then share their parent reports', () => {
  const fetchMock = vi.fn();
  const writeText = vi.fn();
  beforeEach(() => {
    getClassrooms.mockResolvedValue({ data: [{ id: CLASS_ID, name: '4B', member_count: 2 }], error: null });
    getClassroomStudents.mockResolvedValue(roster());
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
  });

  it('says there is no class yet when the teacher has none', async () => {
    getClassrooms.mockResolvedValue({ data: [], error: null });
    render(<ParentReportPack />);
    expect(await screen.findByText('eg2Pro.pack.noClasses')).toBeInTheDocument();
  });

  it('a fixed classroomId skips the class picker and loads that roster', async () => {
    render(<ParentReportPack classroomId={CLASS_ID} />);
    expect(await screen.findAllByRole('checkbox')).toHaveLength(2);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(getClassroomStudents).toHaveBeenCalledWith(CLASS_ID);
    expect(getClassrooms).not.toHaveBeenCalled();
  });

  it('makes nothing until a student is selected, then mints links for the selection only', async () => {
    fetchMock.mockResolvedValue(linksResponse([{ studentId: S1, name: 'Maya', path: '/report/a' }]));
    render(<ParentReportPack classroomId={CLASS_ID} />);
    const make = await screen.findByRole('button', { name: /parentReportsFlow\.make/ });
    expect(make).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Maya' }));
    fireEvent.click(screen.getByRole('button', { name: /parentReportsFlow\.make/ }));
    await screen.findAllByTestId('parent-pack-row', undefined, { timeout: 5000 });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ classroomId: CLASS_ID, studentIds: [S1] });
  });

  it('names an unnamed student in the picker instead of a blank row', async () => {
    render(<ParentReportPack classroomId={CLASS_ID} />);
    expect(await screen.findByRole('checkbox', { name: 'eg2Pro.pack.unnamed|2' })).toBeInTheDocument();
  });

  it('each link can be previewed or copied; all can be copied and downloaded as CSV', async () => {
    fetchMock.mockResolvedValue(linksResponse([
      { studentId: S1, name: 'Maya', path: '/report/a' },
      { studentId: S2, name: '', path: '/report/b' },
    ]));
    render(<ParentReportPack classroomId={CLASS_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: 'parentReportsFlow.selectAll' }));
    fireEvent.click(screen.getByRole('button', { name: /parentReportsFlow\.make/ }));
    const rows = await screen.findAllByTestId('parent-pack-row', undefined, { timeout: 5000 });
    expect(rows).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /parentReportsFlow\.preview/ })[0]).toHaveAttribute('href', expect.stringMatching(/\/en\/report\/a$/));

    fireEvent.click(screen.getAllByRole('button', { name: /parentReportsFlow\.copyOne/ })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/en\/report\/a$/)));

    fireEvent.click(screen.getByRole('button', { name: /eg2Pro\.pack\.copyAll/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText.mock.calls[1][0]).toMatch(/^Maya: http.*\/en\/report\/a\neg2Pro\.pack\.unnamed\|2: /);

    fireEvent.click(screen.getByRole('button', { name: /eg2Pro\.pack\.csv/ }));
    expect(download.mock.calls[0][1]).toContain('Maya,');
  });

  it('changing the selection drops links made for the old selection', async () => {
    fetchMock.mockResolvedValue(linksResponse([{ studentId: S1, name: 'Maya', path: '/report/a' }]));
    render(<ParentReportPack classroomId={CLASS_ID} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Maya' }));
    fireEvent.click(screen.getByRole('button', { name: /parentReportsFlow\.make/ }));
    await screen.findAllByTestId('parent-pack-row', undefined, { timeout: 5000 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'eg2Pro.pack.unnamed|2' }));
    expect(screen.queryAllByTestId('parent-pack-row')).toHaveLength(0);
  });

  it('explains a 402 instead of failing silently', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 402, json: async () => ({ ok: false }) });
    render(<ParentReportPack classroomId={CLASS_ID} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Maya' }));
    fireEvent.click(screen.getByRole('button', { name: /parentReportsFlow\.make/ }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('eg2Pro.pack.needsPro'));
  });

  it('a roster read error is shown, never an empty class', async () => {
    getClassroomStudents.mockResolvedValue({ data: [], error: { message: 'boom' } });
    render(<ParentReportPack classroomId={CLASS_ID} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('parentReportsFlow.rosterFailed');
  });
});
