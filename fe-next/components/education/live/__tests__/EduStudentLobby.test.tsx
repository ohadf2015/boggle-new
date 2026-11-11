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

  it('given the wait, when the lobby shows, then the warm-up is the full-width hero and never hides on a short box', () => {
    render(<EduStudentLobby {...base} />);
    const warm = screen.getByTestId('waiting-warmup');
    expect(warm).toHaveAttribute('data-variant', 'hero');
    expect(warm.parentElement!.className).not.toMatch(/:hidden/);
    expect(screen.getByTestId('warmup-combo-hero')).toBeInTheDocument();
  });

  it('given classmates arrive, then each one pops in on the wall with their name and I am not listed twice', () => {
    render(<EduStudentLobby {...base} />);
    expect(screen.getAllByTestId('edu-student-mate')).toHaveLength(2);
    expect(screen.getByTestId('mate-avatar-Noa')).toBeInTheDocument();
    expect(screen.getAllByTestId('edu-student-mate')[0]).toHaveTextContent('Noa');
    expect(screen.queryByTestId('mate-avatar-Maya')).toBeNull();
  });

  it('given a small class so far, then empty seats only finish the current row, so the wall stays as small as its content', () => {
    render(<EduStudentLobby {...base} />);
    expect(screen.getAllByTestId('edu-student-seat')).toHaveLength(2);
    expect(screen.getByTestId('edu-student-crowd').className).not.toMatch(/\bflex-1\b/);
  });

  it('given a full row of classmates, then no empty seats are added', () => {
    render(<EduStudentLobby {...base} classmates={['Maya', 'A', 'B', 'C', 'D'].map((username) => ({ username }))} />);
    expect(screen.queryByTestId('edu-student-seat')).toBeNull();
  });

  it('given an avatar that has not loaded, then each classmate circle still shows their initial', () => {
    render(<EduStudentLobby {...base} />);
    expect(screen.getAllByTestId('edu-student-mate-initial').map((n) => n.textContent)).toEqual(['N', 'I']);
  });

  it('given a big class, then the wall shows eleven faces and folds the rest into +N', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ username: `S${i}` }));
    render(<EduStudentLobby {...base} classmates={many} />);
    expect(screen.getAllByTestId('edu-student-mate')).toHaveLength(11);
    expect(screen.getByTestId('edu-student-mates-more')).toHaveTextContent('+4');
    expect(screen.queryByTestId('edu-student-seat')).toBeNull();
  });

  it('given a classmate walks in while I wait, then the wall announces them and only their face is marked new', () => {
    const { rerender } = render(<EduStudentLobby {...base} />);
    expect(screen.queryByTestId('edu-student-arrival')).toBeNull();
    rerender(<EduStudentLobby {...base} classmates={[...base.classmates, { username: 'Dana' }]} />);
    expect(screen.getByTestId('edu-student-arrival')).toHaveTextContent('eduLiveRoom.student.joined:{"name":"Dana"}');
    const fresh = screen.getAllByTestId('edu-student-mate').filter((li) => li.getAttribute('data-new') === 'true');
    expect(fresh).toHaveLength(1);
    expect(fresh[0]).toHaveTextContent('Dana');
  });

  it('given a daily chest, then it sits on its own beside my name, never on top of my face', () => {
    Object.assign(auth, { isAuthenticated: true, user: { id: 'u1' }, profile: { total_xp: 0 } });
    render(<EduStudentLobby {...base} />);
    const chest = screen.getByTestId('daily-chest');
    const face = screen.getByTestId('edu-student-edit-avatar').parentElement!;
    expect(face).not.toContainElement(chest);
    expect(screen.getByTestId('edu-student-chest-slot')).toContainElement(chest);
  });

  it('given I am first in, then the crowd says classmates will pop in here', () => {
    render(<EduStudentLobby {...base} classmates={[{ username: 'Maya' }]} />);
    expect(screen.getByTestId('edu-student-crowd')).toHaveTextContent('academy.waiting.firstIn');
  });

  it('given I pressed ready, then a READY sticker lands on my face', () => {
    render(<EduStudentLobby {...base} isReady />);
    expect(screen.getByTestId('edu-student-ready-sticker')).toHaveTextContent('eduStudent.lobby.readySticker');
  });

  it('given a still-loading session, then no level or chest shows (nothing a later auth answer could flip)', () => {
    auth.loading = true;
    render(<EduStudentLobby {...base} />);
    expect(screen.queryByTestId('edu-student-hud')).toBeNull();
  });

  it('given a guest on an anonymous account, then their saved level, day streak and daily chest show', () => {
    Object.assign(auth, { loading: false, isAuthenticated: true, user: { id: 'anon', is_anonymous: true }, profile: { total_xp: 400 } });
    render(<EduStudentLobby {...base} />);
    expect(screen.getByTestId('edu-student-hud-level')).not.toHaveTextContent('academy.student.level:{"level":1}');
    expect(screen.getByTestId('streak-indicator')).toHaveTextContent('4');
    expect(screen.getByTestId('daily-chest')).toHaveAttribute('data-user', 'anon');
  });

  it('given a guest with no account at all, then they see the starting level instead of nothing', () => {
    Object.assign(auth, { loading: false, isAuthenticated: false, user: null, profile: null });
    render(<EduStudentLobby {...base} />);
    expect(screen.getByTestId('edu-student-hud-level')).toHaveTextContent('academy.student.level:{"level":1}');
    expect(screen.queryByTestId('daily-chest')).toBeNull();
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
