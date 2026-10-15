import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
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

describe('EduStudentLobby', () => {
  it("given a seated student, when the phone lobby shows, then it says you're in and to watch the board", () => {
    render(<EduStudentLobby {...base} />);
    expect(screen.getByTestId('edu-student-lobby')).toHaveTextContent('eduLiveRoom.student.youreIn');
    expect(screen.getByTestId('edu-student-watch')).toHaveTextContent('eduLiveRoom.student.watchBoard');
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
});
