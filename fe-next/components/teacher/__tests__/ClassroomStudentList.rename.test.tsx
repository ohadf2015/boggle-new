import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { lang } = vi.hoisted(() => ({ lang: { value: 'en' } }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: lang.value,
  }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div>loading</div> }));

const { mockGetClassroomStudents, mockSetRosterName } = vi.hoisted(() => ({
  mockGetClassroomStudents: vi.fn(),
  mockSetRosterName: vi.fn(),
}));
vi.mock('@/lib/supabase/education', () => ({
  getClassroomStudents: (...a: unknown[]) => mockGetClassroomStudents(...a),
  setStudentLevel: vi.fn(),
  setStudentRosterName: (...a: unknown[]) => mockSetRosterName(...a),
}));

import toast from 'react-hot-toast';
import ClassroomStudentList from '../ClassroomStudentList';

const joined = new Date().toISOString();
const ada = { id: 'm1', student_id: 's1', classroom_id: 'c1', joined_at: joined, level: 'core', profiles: { display_name: 'Ada' } };
const ben = { id: 'm2', student_id: 's2', classroom_id: 'c1', joined_at: joined, level: 'core', roster_name: 'Benny', profiles: { display_name: 'Ben' } };

function renderRoster(rows: unknown[] = [ada, ben]) {
  mockGetClassroomStudents.mockResolvedValue({ data: rows, error: null });
  return render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
}

function openEditor(name: string) {
  fireEvent.click(screen.getByRole('button', { name: `eduRoster.rename:${name}` }));
  return screen.getByRole('textbox', { name: 'eduRoster.inputLabel' }) as HTMLInputElement;
}

describe('ClassroomStudentList: rename a student in this class', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lang.value = 'en';
    mockSetRosterName.mockResolvedValue({ error: null });
  });

  it('shows the roster name when set and the student’s own name underneath; a row without one (null or missing) shows their own name', async () => {
    renderRoster([ada, { ...ben }, { ...ada, id: 'm3', student_id: 's3', roster_name: null, profiles: { display_name: 'Cleo' } }]);
    expect(await screen.findByRole('heading', { name: 'Benny' })).toBeInTheDocument();
    expect(screen.getByText('eduRoster.originalName:Ben')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cleo' })).toBeInTheDocument();
    expect(screen.queryByText('eduRoster.originalName:Ada')).toBeNull();
  });

  it('Enter saves the trimmed name for this class only and shows it at once', async () => {
    renderRoster();
    await screen.findByRole('heading', { name: 'Ada' });
    const input = openEditor('Ada');
    expect(input.value).toBe('');
    expect(input).toHaveAttribute('placeholder', 'Ada');

    fireEvent.change(input, { target: { value: '  Ada L.  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByRole('heading', { name: 'Ada L.' })).toBeInTheDocument();
    expect(mockSetRosterName).toHaveBeenCalledWith('c1', 's1', 'Ada L.');
    expect(screen.getByText('eduRoster.originalName:Ada')).toBeInTheDocument();
  });

  it('Escape cancels without saving', async () => {
    renderRoster();
    await screen.findByRole('heading', { name: 'Benny' });
    const input = openEditor('Benny');
    expect(input.value).toBe('Benny');
    fireEvent.change(input, { target: { value: 'Something else' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Benny' })).toBeInTheDocument();
    expect(mockSetRosterName).not.toHaveBeenCalled();
  });

  it('a blur arriving after Escape or Enter does not save again', async () => {
    renderRoster();
    await screen.findByRole('heading', { name: 'Ada' });
    let input = openEditor('Ada');
    fireEvent.change(input, { target: { value: 'Discarded' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);
    expect(mockSetRosterName).not.toHaveBeenCalled();

    input = openEditor('Ada');
    fireEvent.change(input, { target: { value: 'Ada L.' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    await screen.findByRole('heading', { name: 'Ada L.' });
    expect(mockSetRosterName).toHaveBeenCalledTimes(1);
  });

  it('blur saves like Enter, for a tap outside the field on a phone', async () => {
    renderRoster();
    await screen.findByRole('heading', { name: 'Ada' });
    const input = openEditor('Ada');
    fireEvent.change(input, { target: { value: 'Ada B.' } });
    fireEvent.blur(input);
    expect(await screen.findByRole('heading', { name: 'Ada B.' })).toBeInTheDocument();
    expect(mockSetRosterName).toHaveBeenCalledWith('c1', 's1', 'Ada B.');
  });

  it('an emptied field clears the roster name back to the student’s own name', async () => {
    renderRoster();
    await screen.findByRole('heading', { name: 'Benny' });
    const input = openEditor('Benny');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByRole('heading', { name: 'Ben' })).toBeInTheDocument();
    expect(mockSetRosterName).toHaveBeenCalledWith('c1', 's2', null);
  });

  it('an unchanged name saves nothing', async () => {
    renderRoster();
    await screen.findByRole('heading', { name: 'Benny' });
    fireEvent.keyDown(openEditor('Benny'), { key: 'Enter' });
    expect(mockSetRosterName).not.toHaveBeenCalled();
  });

  it('a name over 40 characters is refused before any request', async () => {
    renderRoster();
    await screen.findByRole('heading', { name: 'Ada' });
    const input = openEditor('Ada');
    fireEvent.change(input, { target: { value: 'x'.repeat(41) } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockSetRosterName).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('eduRoster.tooLong');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('a failed save puts the previous name back and tells the teacher', async () => {
    mockSetRosterName.mockResolvedValue({ error: { message: 'boom' } });
    renderRoster();
    await screen.findByRole('heading', { name: 'Benny' });
    const input = openEditor('Benny');
    fireEvent.change(input, { target: { value: 'B.' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('eduRoster.saveFailed'));
    expect(screen.getByRole('heading', { name: 'Benny' })).toBeInTheDocument();
  });

  it('works in Hebrew under RTL with the input following the page direction', async () => {
    lang.value = 'he';
    const { container } = renderRoster([{ ...ada, profiles: { display_name: 'אדה' } }]);
    await screen.findByRole('heading', { name: 'אדה' });
    expect(container.firstElementChild).toHaveAttribute('dir', 'rtl');
    const input = openEditor('אדה');
    expect(input).toHaveAttribute('dir', 'auto');
    fireEvent.change(input, { target: { value: 'אדה ל.' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByRole('heading', { name: 'אדה ל.' })).toBeInTheDocument();
    expect(mockSetRosterName).toHaveBeenCalledWith('c1', 's1', 'אדה ל.');
  });
});
