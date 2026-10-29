import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const auth = {
  loading: false,
  isAuthenticated: false,
  user: null as null | { id: string; is_anonymous?: boolean },
  profile: null as null | { total_xp?: number },
};
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/useWinStreak', () => ({ useWinStreak: () => ({ currentStreak: 4 }) }));
vi.mock('@/components/student/academy/DailyChest', () => ({
  DailyChest: ({ userId }: { userId: string }) => <span data-testid="daily-chest" data-user={userId} />,
}));
vi.mock('@/components/education/StreakBonusIndicator', () => ({
  default: ({ currentStreak }: { currentStreak: number }) => <span data-testid="streak-indicator">{currentStreak}</span>,
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playTileSelectSound: vi.fn(), playStreakMilestoneSound: vi.fn() }) }));
vi.mock('@/components/Avatar', () => ({ default: ({ userId }: { userId: string }) => <span data-testid={`mate-avatar-${userId}`} /> }));

import EduStudentLobby from '@/components/education/live/EduStudentLobby';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

const base = {
  username: 'Maya',
  avatar: <span data-testid="my-avatar" />,
  onEditAvatar: vi.fn(),
  nameSlot: <span data-testid="name-slot">Maya</span>,
  readySlot: <button type="button" data-testid="ready-slot">ready</button>,
  emoteSlot: <span data-testid="emote-slot" />,
  quickPickSlot: <span data-testid="quick-pick" />,
  instructionsSlot: <span data-testid="how-to" />,
  classmates: [{ username: 'Maya' }, { username: 'Noa' }, { username: 'Ido' }],
  onExit: vi.fn(),
  t,
};

function allClasses(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[class]')).map((el) => el.getAttribute('class') ?? '');
}

describe('EduStudentLobby', () => {
  beforeEach(() => {
    Object.assign(auth, { loading: false, isAuthenticated: false, user: null, profile: null });
  });

  it("given a seated student, when the phone lobby shows, then it says you're in and that the teacher starts the game", () => {
    render(<EduStudentLobby {...base} />);
    expect(screen.getByTestId('edu-student-lobby')).toHaveTextContent('eduLiveRoom.student.youreIn');
    expect(screen.getByTestId('edu-student-crowd')).toHaveTextContent('eduLiveRoom.student.watchBoard');
    expect(screen.getByTestId('name-slot')).toBeInTheDocument();
  });

  it('given classmates in the room, when counted, then the whole class (with me) is shown', () => {
    render(<EduStudentLobby {...base} />);
    expect(screen.getByTestId('edu-student-count')).toHaveTextContent('eduLiveRoom.student.inClass:{"count":3}');
  });

  it('given the shared slots, when rendered, then ready, emotes, looks and how-to all mount', () => {
    render(<EduStudentLobby {...base} />);
    for (const id of ['ready-slot', 'emote-slot', 'quick-pick', 'how-to', 'my-avatar']) expect(screen.getByTestId(id)).toBeInTheDocument();
  });

  it('given the student taps their face or leave, then the avatar builder or exit runs', () => {
    render(<EduStudentLobby {...base} />);
    fireEvent.click(screen.getByTestId('edu-student-edit-avatar'));
    fireEvent.click(screen.getByTestId('edu-student-leave'));
    expect(base.onEditAvatar).toHaveBeenCalledTimes(1);
    expect(base.onExit).toHaveBeenCalledTimes(1);
  });

  it('given the wait, when the lobby shows, then the tap-your-letter warm-up is there to play, hidden only by the lobby box height', () => {
    render(<EduStudentLobby {...base} />);
    const warm = screen.getByTestId('waiting-warmup');
    const slot = warm.parentElement!;
    expect(slot.className).toMatch(/\[@container\(max-height:\d+px\)\]:hidden/);
    expect(screen.getByTestId('edu-student-lobby').querySelector('main')!.className).toContain('[container-type:size]');
  });

  it('given classmates arrive, then each one pops in as a face chip and I am not listed twice', () => {
    render(<EduStudentLobby {...base} />);
    expect(screen.getAllByTestId('edu-student-mate')).toHaveLength(2);
    expect(screen.getByTestId('mate-avatar-Noa')).toBeInTheDocument();
    expect(screen.queryByTestId('mate-avatar-Maya')).toBeNull();
  });

  it('given a big class, then the faces stop at eight and the rest fold into +N', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ username: `S${i}` }));
    render(<EduStudentLobby {...base} classmates={many} />);
    expect(screen.getAllByTestId('edu-student-mate')).toHaveLength(8);
    expect(screen.getByTestId('edu-student-mates-more')).toHaveTextContent('+4');
  });

  it('given I am first in, then the crowd says classmates will pop in here', () => {
    render(<EduStudentLobby {...base} classmates={[{ username: 'Maya' }]} />);
    expect(screen.getByTestId('edu-student-crowd')).toHaveTextContent('academy.waiting.firstIn');
  });

  it('given I pressed ready, then a READY sticker lands on my face', () => {
    render(<EduStudentLobby {...base} isReady />);
    expect(screen.getByTestId('edu-student-ready-sticker')).toHaveTextContent('eduStudent.lobby.readySticker');
  });

  it('given a guest or a still-loading session, then no level or chest shows (nothing a later auth answer could flip)', () => {
    auth.loading = true;
    const { rerender } = render(<EduStudentLobby {...base} />);
    expect(screen.queryByTestId('edu-student-hud')).toBeNull();
    Object.assign(auth, { loading: false, isAuthenticated: true, user: { id: 'anon', is_anonymous: true } });
    rerender(<EduStudentLobby {...base} />);
    expect(screen.queryByTestId('edu-student-hud')).toBeNull();
  });

  it('given a signed-in student, then my level, day streak and daily chest sit in the lobby', () => {
    Object.assign(auth, { isAuthenticated: true, user: { id: 'u1' }, profile: { total_xp: 0 } });
    render(<EduStudentLobby {...base} />);
    expect(screen.getByTestId('edu-student-hud-level')).toHaveTextContent('academy.student.level:{"level":1}');
    expect(screen.getByTestId('streak-indicator')).toHaveTextContent('4');
    expect(screen.getByTestId('daily-chest')).toHaveAttribute('data-user', 'u1');
  });

  it('given the neo palette rule, then no class carries a raw hex colour', () => {
    const { container } = render(<EduStudentLobby {...base} isReady />);
    expect(allClasses(container).filter((c) => /#[0-9a-fA-F]{3,6}\b/.test(c))).toEqual([]);
  });
});
