import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/Avatar', () => ({ default: ({ userId }: { userId?: string }) => <div data-testid="classmate-face">{userId}</div> }));

import { ClassroomWaitingStage } from '../ClassroomWaitingStage';

const base = {
  username: 'Maya',
  avatar: <div data-testid="my-face" />,
  onEditAvatar: vi.fn(),
  nameSlot: <h2>Maya</h2>,
  classmates: [{ username: 'Leo' }, { username: 'Noa' }],
  onExit: vi.fn(),
  t: (key: string) => key,
  readySlot: <button type="button">READY</button>,
  emoteSlot: <div data-testid="emote-tray" />,
  quickPickSlot: <div data-testid="quick-pick" />,
};

describe('ClassroomWaitingStage on a 390px phone', () => {
  it('Given emotes, Then they sit with the avatar, never in the READY dock they used to overlap', () => {
    render(<ClassroomWaitingStage {...base} />);
    const dock = screen.getByTestId('waiting-dock');
    expect(within(dock).queryByTestId('emote-tray')).toBeNull();
    expect(within(screen.getByTestId('waiting-spotlight')).getByTestId('emote-tray')).toBeInTheDocument();
  });

  it('clips the spotlight so a tall avatar can never paint over READY', () => {
    render(<ClassroomWaitingStage {...base} />);
    expect(screen.getByTestId('waiting-spotlight').className).toContain('overflow-hidden');
  });

  it('offers one-tap looks right under the avatar', () => {
    render(<ClassroomWaitingStage {...base} />);
    expect(within(screen.getByTestId('waiting-spotlight')).getByTestId('quick-pick')).toBeInTheDocument();
  });

  it('Given the student is ready, Then their face wears a READY sticker', () => {
    const { rerender } = render(<ClassroomWaitingStage {...base} />);
    expect(screen.queryByTestId('waiting-ready-sticker')).toBeNull();
    rerender(<ClassroomWaitingStage {...base} isReady />);
    expect(screen.getByTestId('waiting-ready-sticker')).toHaveTextContent(/ready/i);
  });

  it('puts the waiting line inside the crowd card, one panel instead of two', () => {
    render(<ClassroomWaitingStage {...base} />);
    expect(within(screen.getByTestId('waiting-crowd')).getByTestId('waiting-for-teacher-line')).toBeInTheDocument();
  });
});
