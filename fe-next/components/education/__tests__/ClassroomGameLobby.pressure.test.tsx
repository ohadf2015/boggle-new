/**
 * The dials' path from the lobby to the server.
 *
 * `createClassroomGame` whitelists its settings keys (and is owned by another
 * change), so the dials ride a follow-up emit the moment the room exists —
 * the same shape as the in-lobby mode switch. A Pro teacher's calm setup that
 * never reached Redis would silently run the loud default in front of the
 * class (pitfall 4); a FREE teacher's payload must carry no dials at all,
 * because the dials are what Pro sells.
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ClassroomGameLobby } from '../ClassroomGameLobby';
import * as supabaseTeacher from '@/lib/supabase/education';
import { io } from 'socket.io-client';
import { DEFAULT_CLASSROOM_PRESSURE } from '@/shared/utils/classroomPressure';

const { mockToastError } = vi.hoisted(() => ({ mockToastError: vi.fn() }));
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: mockToastError, success: vi.fn() },
}));

// Stable identities: both are socket-effect deps, and a fresh arrow per render
// tears the socket down and rebuilds it on every state change.
const { stableT } = vi.hoisted(() => ({ stableT: (key: string) => key }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: stableT, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'teacher-123', email: 'teacher@test.com' },
    profile: { display_name: 'Test Teacher' },
  }),
}));
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));
const { stableRouter } = vi.hoisted(() => ({ stableRouter: { push: mockPush } }));
vi.mock('next/navigation', () => ({ useRouter: () => stableRouter }));
vi.mock('socket.io-client');
vi.mock('@/lib/supabase/education', () => ({
  getLessons: vi.fn(),
  getClassrooms: vi.fn(),
  createLesson: vi.fn(),
}));
vi.mock('@/utils/SocketContext', () => ({ getSocketURL: () => 'http://localhost:3001' }));
// The launch hook dynamic-imports this for the auth token; unmocked it hangs
// forever in jsdom and the socket never initializes (the lobby sits on the
// PageLoader).
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'jwt' } } }) },
  }),
}));

let mockHasPro = true;
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: mockHasPro, loading: false }),
}));

const listeners = new Map<string, (data: unknown) => void>();
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn((event: string, cb: (data: unknown) => void) => listeners.set(event, cb)),
  off: vi.fn(),
  disconnect: vi.fn(),
};
(io as jest.Mock).mockReturnValue(mockSocket);

function emitCall(event: string) {
  return mockSocket.emit.mock.calls.find((c) => c[0] === event);
}

const mockLessons = [
  { id: 'lesson-1', name: 'Unit 1', words: [{ word: 'red', canIntegrate: true }] },
];
const mockClassrooms = [{ id: 'class-1', name: 'Class A', member_count: 24 }];

async function renderAndLaunch() {
  render(<ClassroomGameLobby onBack={vi.fn()} />);
  await waitFor(() => expect(screen.getByTestId('lobby-setup-summary')).toBeInTheDocument());
  fireEvent.click(screen.getByTestId('lobby-setup-summary'));
  return screen;
}

describe('ClassroomGameLobby — pressure dials wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    mockHasPro = true;
    (supabaseTeacher.getLessons as jest.Mock).mockResolvedValue({ data: mockLessons });
    (supabaseTeacher.getClassrooms as jest.Mock).mockResolvedValue({ data: mockClassrooms });
  });

  it('renders the dials inside the setup sheet', async () => {
    await renderAndLaunch();
    expect(screen.getByTestId('pressure-dials')).toBeInTheDocument();
  });

  it('puts the dials above the round fine-tuning — the Pro entry is visible on first expand', async () => {
    // At 1440×900 the PRESSURE title + lock chip rendered below the setup
    // sheet's internal scroll window; a monetization entry nobody sees is not
    // one. The dials lead the sheet body.
    await renderAndLaunch();
    const dials = screen.getByTestId('pressure-dials');
    // The quiz default renders its focus picker where board modes render the
    // round settings — either way, the dials must lead the fine-tuning.
    const fineTuning = screen.getByRole('radiogroup', { name: 'vocabQuiz.setup.focusTitle' });
    expect(
      dials.compareDocumentPosition(fineTuning) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('emits the dials to the room once it exists — Pro teacher, calm setup', async () => {
    await renderAndLaunch();

    fireEvent.click(screen.getByRole('radio', { name: 'teacher.classroom.pressure.leaderboard.hidden' }));
    fireEvent.click(screen.getByRole('radio', { name: 'teacher.classroom.pressure.timer.off' }));

    fireEvent.click(screen.getByTestId('lobby-go-live'));
    await waitFor(() =>
      expect(mockSocket.emit).toHaveBeenCalledWith('createClassroomGame', expect.anything())
    );
    const created = emitCall('createClassroomGame')![1] as { gameCode: string };

    // The dials ride a follow-up emit AFTER the room exists — never inside
    // the whitelisted create payload.
    expect(mockSocket.emit).not.toHaveBeenCalledWith(
      'updateClassroomGamePressure',
      expect.anything()
    );
    listeners.get('classroomGameCreated')?.({ success: true, gameCode: created.gameCode });

    await waitFor(() =>
      expect(mockSocket.emit).toHaveBeenCalledWith('updateClassroomGamePressure', {
        gameCode: created.gameCode,
        pressure: { ...DEFAULT_CLASSROOM_PRESSURE, leaderboard: 'hidden', timer: 'off' },
      })
    );
  });

  it('screams when the pressure write is never acked — never a silent loud round', async () => {
    // The create→update two-step has a drop window: if the server's
    // classroomGamePressureChanged ack never lands, the room runs the loud
    // default while the teacher believes they launched calm (pitfalls 1+4).
    vi.useFakeTimers();
    try {
      await renderAndLaunch();
      fireEvent.click(screen.getByRole('radio', { name: 'teacher.classroom.pressure.timer.off' }));
      fireEvent.click(screen.getByTestId('lobby-go-live'));
      await waitFor(() =>
        expect(mockSocket.emit).toHaveBeenCalledWith('createClassroomGame', expect.anything())
      );
      const created = emitCall('createClassroomGame')![1] as { gameCode: string };
      listeners.get('classroomGameCreated')?.({ success: true, gameCode: created.gameCode });
      await waitFor(() =>
        expect(mockSocket.emit).toHaveBeenCalledWith('updateClassroomGamePressure', expect.anything())
      );

      await act(async () => {
        vi.advanceTimersByTime(6_000);
      });
      expect(mockToastError).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('stays quiet when the server acks the pressure write', async () => {
    vi.useFakeTimers();
    try {
      await renderAndLaunch();
      fireEvent.click(screen.getByTestId('lobby-go-live'));
      await waitFor(() =>
        expect(mockSocket.emit).toHaveBeenCalledWith('createClassroomGame', expect.anything())
      );
      const created = emitCall('createClassroomGame')![1] as { gameCode: string };
      listeners.get('classroomGameCreated')?.({ success: true, gameCode: created.gameCode });
      await waitFor(() =>
        expect(mockSocket.emit).toHaveBeenCalledWith('updateClassroomGamePressure', expect.anything())
      );
      listeners.get('classroomGamePressureChanged')?.({ gameCode: created.gameCode });

      await act(async () => {
        vi.advanceTimersByTime(6_000);
      });
      expect(mockToastError).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('routes a refused pressure write to pressureFailed ONCE — never startFailed, never the watchdog echo', async () => {
    // The server refused the dials (room exists, playable — the calm setup
    // just did not apply). Toasting startFailed is the wrong message, and the
    // watchdog firing five seconds later doubles it: two toasts, one refusal.
    vi.useFakeTimers();
    try {
      await renderAndLaunch();
      fireEvent.click(screen.getByRole('radio', { name: 'teacher.classroom.pressure.timer.off' }));
      fireEvent.click(screen.getByTestId('lobby-go-live'));
      await waitFor(() =>
        expect(mockSocket.emit).toHaveBeenCalledWith('createClassroomGame', expect.anything())
      );
      const created = emitCall('createClassroomGame')![1] as { gameCode: string };
      listeners.get('classroomGameCreated')?.({ success: true, gameCode: created.gameCode });
      await waitFor(() =>
        expect(mockSocket.emit).toHaveBeenCalledWith('updateClassroomGamePressure', expect.anything())
      );

      listeners.get('classroomGameError')?.({ error: 'education.classroomGame.pressureFailed' });
      expect(mockToastError).toHaveBeenCalledWith('education.classroomGame.pressureFailed');
      expect(mockToastError).not.toHaveBeenCalledWith('education.classroomGame.startFailed');

      // The watchdog is disarmed by the refusal: silence from here on.
      mockToastError.mockClear();
      await act(async () => {
        vi.advanceTimersByTime(6_000);
      });
      expect(mockToastError).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('still toasts startFailed for a real start refusal', async () => {
    await renderAndLaunch();
    fireEvent.click(screen.getByTestId('lobby-go-live'));
    await waitFor(() =>
      expect(mockSocket.emit).toHaveBeenCalledWith('createClassroomGame', expect.anything())
    );
    listeners.get('classroomGameError')?.({ error: 'Invalid payload: lessonIds' });
    expect(mockToastError).toHaveBeenCalledWith('education.classroomGame.startFailed');
  });

  it('sends no dials for a free teacher — the loud default is the free tier', async () => {
    mockHasPro = false;
    await renderAndLaunch();

    fireEvent.click(screen.getByTestId('lobby-go-live'));
    await waitFor(() =>
      expect(mockSocket.emit).toHaveBeenCalledWith('createClassroomGame', expect.anything())
    );
    const created = emitCall('createClassroomGame')![1] as {
      gameCode: string;
      settings: Record<string, unknown>;
    };
    expect(created.settings).not.toHaveProperty('pressure');

    listeners.get('classroomGameCreated')?.({ success: true, gameCode: created.gameCode });
    await waitFor(() => expect(screen.getByTestId('classroom-lobby-code')).toBeInTheDocument());
    expect(mockSocket.emit).not.toHaveBeenCalledWith(
      'updateClassroomGamePressure',
      expect.anything()
    );
  });
});
