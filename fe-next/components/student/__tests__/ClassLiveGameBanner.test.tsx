import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const k = vi.hoisted(() => ({
  classroomId: 'c1' as string | null,
  activeGame: null as null | Record<string, unknown>,
  join: vi.fn(),
  capture: vi.fn(),
  socketFor: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 's1' }, profile: { display_name: 'Noa' } }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useStudentClassroom', () => ({ useStudentClassroom: () => ({ classroomId: k.classroomId }) }));
vi.mock('@/hooks/useActiveClassroomGame', () => ({
  useActiveClassroomGame: (id: string) => {
    k.socketFor(id);
    return { activeGame: k.activeGame, socket: {} };
  },
}));
vi.mock('../useClassroomGameJoin', () => ({ useClassroomGameJoin: () => ({ join: k.join, isJoining: false, joinError: null }) }));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: k.capture }));

import { ClassLiveGameBanner } from '../ClassLiveGameBanner';

const liveGame = { gameCode: 'ABC123', teacherName: 'T', lessonNames: [], classroomName: 'כיתה ג', roomOpen: true };

describe('ClassLiveGameBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    k.classroomId = 'c1';
    k.activeGame = null;
  });

  it('opens no class socket for a student without a class', () => {
    k.classroomId = null;
    const { container } = render(<ClassLiveGameBanner />);
    expect(container).toBeEmptyDOMElement();
    expect(k.socketFor).not.toHaveBeenCalled();
  });

  it('shows nothing while the class has no live game', () => {
    render(<ClassLiveGameBanner />);
    expect(screen.queryByTestId('class-live-banner')).toBeNull();
    expect(k.socketFor).toHaveBeenCalledWith('c1');
  });

  it('shows the class game and joins it with one tap', () => {
    k.activeGame = liveGame;
    render(<ClassLiveGameBanner />);
    expect(screen.getByTestId('class-live-banner')).toHaveTextContent('כיתה ג');
    expect(k.capture).toHaveBeenCalledWith('edu_student_live_banner_shown', expect.objectContaining({ game_code: 'ABC123' }));
    fireEvent.click(screen.getByTestId('class-live-banner-join'));
    expect(k.join).toHaveBeenCalledTimes(1);
    expect(k.capture).toHaveBeenCalledWith('edu_student_live_banner_join', expect.objectContaining({ game_code: 'ABC123' }));
  });

  it('never offers a rehearsal, a room not yet open, or a locked lobby', () => {
    for (const game of [
      { ...liveGame, rehearsal: true },
      { ...liveGame, roomOpen: false },
      { ...liveGame, settings: { lobbyLocked: true } },
    ]) {
      k.activeGame = game;
      const { unmount } = render(<ClassLiveGameBanner />);
      expect(screen.queryByTestId('class-live-banner')).toBeNull();
      unmount();
    }
  });

  it('"Stay here" hides it for that game only', () => {
    k.activeGame = liveGame;
    const { rerender } = render(<ClassLiveGameBanner />);
    fireEvent.click(screen.getByTestId('class-live-banner-stay'));
    expect(screen.queryByTestId('class-live-banner')).toBeNull();
    k.activeGame = { ...liveGame, gameCode: 'XYZ789' };
    rerender(<ClassLiveGameBanner />);
    expect(screen.getByTestId('class-live-banner')).toBeInTheDocument();
  });
});
