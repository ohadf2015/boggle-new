/**
 * Two things a teacher was quietly lied to about at setup time.
 *
 * 1. A ten-word lesson arrived at the host screen as nine. `canIntegrate` is a
 *    BOARD-EMBEDDING predicate (3-12 letters) and it was being used as lesson
 *    membership, so "photosynthesis" vanished between the editor and the game
 *    with no error anywhere. Measured live 2026-09-07 on "Ecology Vocabulary
 *    Audit": editor 10, setup screen 9.
 *
 * 2. Classic mode cannot carry a vocabulary lesson. Measured live on the same
 *    lesson: the server embedded 1 of 9 words (`placedVocabulary === ["ENZYME"]`
 *    on a 6x6 board — a straight run caps at six letters). So when a lesson is
 *    attached the default has to be the mode that actually drills the words.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClassroomGameLobby } from '../ClassroomGameLobby';
import * as supabaseTeacher from '@/lib/supabase/education';
import { io } from 'socket.io-client';

// `t` interpolates in production, and the word count is a `{count}` param — a
// key-only mock would make the count assertion below vacuous.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'teacher-123', email: 'teacher@test.com' },
    profile: { display_name: 'Test Teacher' },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('socket.io-client');
vi.mock('@/lib/supabase/education');

const mockSocket = { emit: vi.fn(), on: vi.fn(), disconnect: vi.fn() };
(io as jest.Mock).mockReturnValue(mockSocket);

/** The real shape of the audited lesson: one word longer than the board rule allows. */
const ecologyLesson = {
  id: 'lesson-eco',
  name: 'Ecology Vocabulary Audit',
  words: [
    { word: 'photosynthesis', canIntegrate: false }, // 14 letters — board says no, the lesson says yes
    { word: 'mitochondria', canIntegrate: true },
    { word: 'osmosis', canIntegrate: true },
  ],
};

const mockClassrooms = [{ id: 'class-1', name: 'Class A', member_count: 24 }];

async function openLessonAndStart() {
  render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);
  await waitFor(() => {
    fireEvent.click(screen.getByText(/Ecology Vocabulary Audit/i).closest('button')!);
  });
  await waitFor(() => {
    fireEvent.click(screen.getByText('education.classroomGame.createRoom'));
  });
  const call = mockSocket.emit.mock.calls.find((c) => c[0] === 'createClassroomGame');
  expect(call).toBeDefined();
  return call![1] as {
    vocabularyWords: string[];
    settings: { gameMode: string };
  };
}

describe('ClassroomGameLobby — the lesson the teacher actually assigned', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabaseTeacher.getLessons as jest.Mock).mockResolvedValue({ data: [ecologyLesson] });
    (supabaseTeacher.getClassrooms as jest.Mock).mockResolvedValue({ data: mockClassrooms });
  });

  it('sends every word in the lesson, including one no board can hold', async () => {
    const payload = await openLessonAndStart();
    expect(payload.vocabularyWords).toEqual(
      expect.arrayContaining(['photosynthesis', 'mitochondria', 'osmosis'])
    );
    expect(payload.vocabularyWords).toHaveLength(3);
  });

  it('shows the teacher the lesson count, not the embeddable count', async () => {
    render(<ClassroomGameLobby initialLessonId="" onBack={vi.fn()} />);
    await waitFor(() => {
      fireEvent.click(screen.getByText(/Ecology Vocabulary Audit/i).closest('button')!);
    });
    // 3 words in the lesson. Reporting 2 is the "10 words became 9" bug.
    await waitFor(() => {
      expect(
        screen.getByText('education.classroomGame.words|{"count":3}')
      ).toBeInTheDocument();
    });
  });

  it('defaults to the vocab quiz once a lesson is attached', async () => {
    const payload = await openLessonAndStart();
    expect(payload.settings.gameMode).toBe('vocab-quiz');
  });
});
