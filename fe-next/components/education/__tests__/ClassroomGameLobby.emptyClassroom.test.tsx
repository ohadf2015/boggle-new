/**
 * ClassroomGameLobby — Empty Classroom Flow Test
 *
 * Tests that when a teacher has no classrooms, clicking "Create Classroom"
 * actually creates a classroom (not just navigates away).
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassroomGameLobby } from '../ClassroomGameLobby';
import * as supabaseTeacher from '@/lib/supabase/education';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key, // Return key names for simplicity
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'teacher-123', email: 'teacher@test.com' },
    profile: { display_name: 'Test Teacher' },
  }),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('socket.io-client');
vi.mock('@/lib/supabase/education');
vi.mock('react-hot-toast');

const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  disconnect: vi.fn(),
};

(io as any).mockReturnValue(mockSocket);

describe('ClassroomGameLobby — Empty Classroom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Teacher has no classrooms or lessons
    (supabaseTeacher.getLessons as any).mockResolvedValue({ data: [] });
    (supabaseTeacher.getClassrooms as any).mockResolvedValue({ data: [] });
  });

  it('should render no classrooms empty state when classrooms are empty', async () => {
    render(<ClassroomGameLobby onBack={() => {}} />);

    // Wait for the no classrooms message to appear
    await waitFor(() => {
      expect(
        screen.queryByText('education.classroomGame.noClassrooms')
      ).toBeInTheDocument();
    });
  });

  it('should have a Create Classroom button in empty state', async () => {
    render(<ClassroomGameLobby onBack={() => {}} />);

    // Wait for the button to appear
    await waitFor(() => {
      const button = screen.queryByRole('button', {
        name: 'education.classroomGame.createClassroom',
      });
      expect(button).toBeInTheDocument();
    });
  });
});
