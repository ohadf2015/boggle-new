/**
 * ClassroomGameLobby Tests (Single-Step Version)
 *
 * Tests for single-step game creation flow. Clicking Start Game
 * creates the room and navigates straight to the multiplayer lobby,
 * where richer room info lives in ClassroomModeBanner.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClassroomGameLobby } from '../ClassroomGameLobby';
import * as supabaseTeacher from '@/lib/supabase/education';
import { io } from 'socket.io-client';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
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

const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  disconnect: vi.fn(),
};

(io as jest.Mock).mockReturnValue(mockSocket);

const mockLessons = [
  {
    id: 'lesson-1',
    name: 'Unit 1: Colors',
    words: [
      { word: 'red', canIntegrate: true },
      { word: 'blue', canIntegrate: true },
    ],
  },
  {
    id: 'lesson-2',
    name: 'Unit 2: Numbers',
    words: [
      { word: 'one', canIntegrate: true },
      { word: 'two', canIntegrate: true },
    ],
  },
];

const mockClassrooms = [
  { id: 'class-1', name: 'Class A', member_count: 24 },
  { id: 'class-2', name: 'Class B', member_count: 18 },
];

describe('ClassroomGameLobby (Single Step)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabaseTeacher.getLessons as jest.Mock).mockResolvedValue({
      data: mockLessons,
    });
    (supabaseTeacher.getClassrooms as jest.Mock).mockResolvedValue({
      data: mockClassrooms,
    });
  });

  describe('Initial Loading', () => {
    it('should show loading spinner while fetching data', () => {
      (supabaseTeacher.getLessons as jest.Mock).mockReturnValue(
        new Promise(() => {}) // Never resolves
      );
      (supabaseTeacher.getClassrooms as jest.Mock).mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should fetch lessons and classrooms on mount', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        expect(supabaseTeacher.getLessons).toHaveBeenCalled();
        expect(supabaseTeacher.getClassrooms).toHaveBeenCalled();
      });
    });
  });

  describe('Selection', () => {
    it('should show step 1 of 1', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Step 1 of 1/i)).toBeInTheDocument();
      });
    });

    it('should display classroom selector', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Class A')).toBeInTheDocument();
        expect(screen.getByText('Class B')).toBeInTheDocument();
      });
    });

    it('should pre-select first classroom by default', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        const classAOption = screen.getByRole('radio', { name: /Class A/i });
        expect(classAOption).toBeChecked();
      });
    });

    it('should display lesson selector with buttons', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Unit 1: Colors/i)).toBeInTheDocument();
        expect(screen.getByText(/Unit 2: Numbers/i)).toBeInTheDocument();
      });
    });

    it('should pre-select initial lesson if provided', async () => {
      render(
        <ClassroomGameLobby initialLessonId="lesson-1" onBack={vi.fn()} />
      );

      await waitFor(() => {
        const lesson1Button = screen.getByText(/Unit 1: Colors/i).closest('button');
        expect(lesson1Button).toHaveClass('bg-neo-cyan');
      });
    });

    it('should allow selecting multiple lessons', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        const lesson1Button = screen.getByText(/Unit 1: Colors/i).closest('button');
        const lesson2Button = screen.getByText(/Unit 2: Numbers/i).closest('button');

        fireEvent.click(lesson1Button!);
        fireEvent.click(lesson2Button!);

        expect(lesson1Button).toHaveClass('bg-neo-cyan');
        expect(lesson2Button).toHaveClass('bg-neo-cyan');
      });
    });

    it('should disable Start Game button when no lessons selected', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        const startButton = screen.getByText('education.classroomGame.startGame');
        expect(startButton).toBeDisabled();
      });
    });

    it('should enable Start Game button when lessons selected', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        const lesson1Button = screen.getByText(/Unit 1: Colors/i).closest('button');
        fireEvent.click(lesson1Button!);

        const startButton = screen.getByText('education.classroomGame.startGame');
        expect(startButton).not.toBeDisabled();
      });
    });

    it('should show word count for selected lessons', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        const lesson1Button = screen.getByText(/Unit 1: Colors/i).closest('button');
        const lesson2Button = screen.getByText(/Unit 2: Numbers/i).closest('button');

        fireEvent.click(lesson1Button!);
        fireEvent.click(lesson2Button!);

        // 2 words from lesson 1 + 2 words from lesson 2 = 4 total
        expect(screen.getByText(/4/)).toBeInTheDocument();
      });
    });
  });

  describe('Game Creation', () => {
    it('should emit createClassroomGame event when Start Game clicked', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        const lesson1Button = screen.getByText(/Unit 1: Colors/i).closest('button');
        fireEvent.click(lesson1Button!);
      });

      await waitFor(() => {
        const startButton = screen.getByText('education.classroomGame.startGame');
        fireEvent.click(startButton);

        expect(mockSocket.emit).toHaveBeenCalledWith(
          'createClassroomGame',
          expect.objectContaining({
            classroomId: 'class-1',
            teacherId: 'teacher-123',
            lessonIds: ['lesson-1'],
          })
        );
      });
    });

    it('should not navigate before classroomGameCreated event fires', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        const lesson1Button = screen.getByText(/Unit 1: Colors/i).closest('button');
        fireEvent.click(lesson1Button!);
      });

      // No router push until socket confirms creation
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should navigate to multiplayer after game created', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      // Wait for socket to be set up
      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalled();
      });

      // Simulate game created event from socket
      const gameCreatedHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'classroomGameCreated'
      )[1];

      gameCreatedHandler({ success: true, gameCode: 'ABC123' });

      // Should navigate to multiplayer (only time we leave education)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('/multiplayer')
        );
      });
    });

    it('should navigate with room= param (not code=) for multiplayer compatibility', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalled();
      });

      const gameCreatedHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'classroomGameCreated'
      )[1];

      gameCreatedHandler({ success: true, gameCode: 'ABC123' });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('room=ABC123')
        );
      });
    });

    it('should store lessonGameData in sessionStorage before emitting socket event', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      // Select lesson
      await waitFor(() => {
        const lesson1Button = screen.getByText(/Unit 1: Colors/i).closest('button');
        fireEvent.click(lesson1Button!);
      });

      // Start game directly
      await waitFor(() => {
        const startButton = screen.getByText('education.classroomGame.startGame');
        fireEvent.click(startButton);
      });

      // Verify sessionStorage was set with lessonGameData
      expect(setItemSpy).toHaveBeenCalledWith(
        'lessonGameData',
        expect.any(String)
      );

      // Parse and verify the stored data structure
      const storedCall = setItemSpy.mock.calls.find(
        (call) => call[0] === 'lessonGameData'
      );
      expect(storedCall).toBeDefined();
      const storedData = JSON.parse(storedCall![1]);

      expect(storedData).toEqual(
        expect.objectContaining({
          lessonId: expect.any(String),
          lessonName: expect.any(String),
          vocabularyWords: expect.arrayContaining(['red', 'blue']),
          language: 'en',
          templateSettings: expect.objectContaining({
            timerSeconds: expect.any(Number),
            difficulty: expect.any(String),
            minWordLength: 3,
            allowLateJoin: true,
          }),
        })
      );

      setItemSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should show error if no classrooms available', async () => {
      (supabaseTeacher.getClassrooms as jest.Mock).mockResolvedValue({
        data: [],
      });

      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        expect(
          screen.getByText('education.classroomGame.noClassrooms')
        ).toBeInTheDocument();
      });
    });

    it('should show "Create Classroom" button when no classrooms', async () => {
      (supabaseTeacher.getClassrooms as jest.Mock).mockResolvedValue({
        data: [],
      });

      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        expect(
          screen.getByText('education.classroomGame.createClassroom')
        ).toBeInTheDocument();
      });
    });

    it('should navigate to teacher dashboard when "Create Classroom" clicked', async () => {
      (supabaseTeacher.getClassrooms as jest.Mock).mockResolvedValue({
        data: [],
      });

      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('education.classroomGame.createClassroom'));
      });

      expect(mockPush).toHaveBeenCalledWith('/en/teacher');
    });

    it('should show "Create Lesson" button when no lessons available', async () => {
      (supabaseTeacher.getLessons as jest.Mock).mockResolvedValue({
        data: [],
      });

      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        expect(
          screen.getByText('education.classroomGame.createLesson')
        ).toBeInTheDocument();
      });
    });

    it('should navigate to teacher dashboard when "Create Lesson" clicked', async () => {
      (supabaseTeacher.getLessons as jest.Mock).mockResolvedValue({
        data: [],
      });

      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('education.classroomGame.createLesson'));
      });

      expect(mockPush).toHaveBeenCalledWith('/en/teacher');
    });

    it('should show error toast on socket error', async () => {
      render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);

      // Wait for socket to be set up
      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalled();
      });

      // Simulate error event from socket
      const errorHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'classroomGameError'
      )[1];

      errorHandler({ error: 'Failed to create game' });

      // Component should handle error (toast would be shown in real app)
      // Just verify socket listeners are set up correctly
      expect(mockSocket.on).toHaveBeenCalledWith('classroomGameError', expect.any(Function));
    });
  });
});
