import { renderHook, waitFor } from '@testing-library/react';

const mockGetClassrooms = vi.fn();
vi.mock('@/lib/supabase/education', () => ({
  getClassrooms: (...a: unknown[]) => mockGetClassrooms(...a),
  createClassroom: vi.fn(),
  updateClassroom: vi.fn(),
  deleteClassroom: vi.fn(),
  getClassroomStudents: vi.fn(async () => ({ data: [], error: null })),
  removeStudentFromClassroom: vi.fn(),
  getStudentClassroom: vi.fn(async () => ({ data: null, level: 'core', error: null })),
  joinClassroom: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 'teacher-1' } }),
}));
vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { useClassrooms } from '../useClassroom';

const CLASS = { id: 'c1', name: 'ELA Period 3', teacher_id: 'teacher-1' };

describe('useClassrooms — one failed read', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given the first read fails and the second works, Then the teacher sees the classes and no error', async () => {
    mockGetClassrooms
      .mockResolvedValueOnce({ data: [], error: { message: 'Failed to fetch' } })
      .mockResolvedValue({ data: [CLASS], error: null });
    const { result } = renderHook(() => useClassrooms());
    await waitFor(() => expect(result.current.classrooms).toHaveLength(1), { timeout: 3000 });
    expect(result.current.error).toBeNull();
  });

  it('Given the first read throws and the second works, Then the teacher sees the classes', async () => {
    mockGetClassrooms
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue({ data: [CLASS], error: null });
    const { result } = renderHook(() => useClassrooms());
    await waitFor(() => expect(result.current.classrooms).toHaveLength(1), { timeout: 3000 });
    expect(result.current.error).toBeNull();
  });

  it('Given every read fails, Then the error still shows', async () => {
    mockGetClassrooms.mockResolvedValue({ data: [], error: { message: 'down' } });
    const { result } = renderHook(() => useClassrooms());
    await waitFor(() => expect(result.current.error).toBe('down'), { timeout: 3000 });
    expect(result.current.isLoading).toBe(false);
  });
});
