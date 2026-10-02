import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { getSeededAvatarConfig } from '@/shared/types/customAvatar';

vi.mock('@/components/Avatar', () => ({
  default: ({ customAvatar }: { customAvatar?: { bgColor?: string } }) => <span data-testid="pick-face">{customAvatar?.bgColor}</span>,
}));

import { AvatarQuickPick, QUICK_PICK_COUNT } from '../AvatarQuickPick';

const t = (key: string) => key;

describe('AvatarQuickPick', () => {
  it('Given a seed, When it renders, Then it offers a row of ready-made looks plus shuffle and build', () => {
    render(<AvatarQuickPick seed={10} onPick={vi.fn()} onOpenBuilder={vi.fn()} t={t} />);
    expect(screen.getAllByTestId('avatar-quick-option')).toHaveLength(QUICK_PICK_COUNT);
    expect(screen.getByTestId('avatar-quick-shuffle')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-quick-build')).toBeInTheDocument();
  });

  it('When a look is tapped, Then that exact config is handed to the save path and the tile is marked picked', () => {
    const onPick = vi.fn();
    render(<AvatarQuickPick seed={10} onPick={onPick} onOpenBuilder={vi.fn()} t={t} />);
    const second = screen.getAllByTestId('avatar-quick-option')[1];
    fireEvent.click(second);
    expect(onPick).toHaveBeenCalledWith(getSeededAvatarConfig(11));
    expect(second).toHaveAttribute('aria-pressed', 'true');
  });

  it('When shuffle is tapped, Then a fresh set of looks is dealt', () => {
    render(<AvatarQuickPick seed={10} onPick={vi.fn()} onOpenBuilder={vi.fn()} t={t} />);
    const before = screen.getAllByTestId('avatar-quick-option').map((el) => el.getAttribute('data-seed'));
    fireEvent.click(screen.getByTestId('avatar-quick-shuffle'));
    const after = screen.getAllByTestId('avatar-quick-option').map((el) => el.getAttribute('data-seed'));
    expect(after).not.toEqual(before);
  });

  it('When build is tapped, Then the full avatar builder opens', () => {
    const onOpenBuilder = vi.fn();
    render(<AvatarQuickPick seed={10} onPick={vi.fn()} onOpenBuilder={onOpenBuilder} t={t} />);
    fireEvent.click(screen.getByTestId('avatar-quick-build'));
    expect(onOpenBuilder).toHaveBeenCalled();
  });

  it('labels every control in words, never a raw key', () => {
    render(<AvatarQuickPick seed={10} onPick={vi.fn()} onOpenBuilder={vi.fn()} t={t} />);
    expect(screen.getByTestId('avatar-quick-shuffle')).toHaveAttribute('aria-label', 'eduStudent.lobby.shuffleLooks');
    expect(screen.getByTestId('avatar-quick-build')).toHaveAttribute('aria-label', 'eduStudent.lobby.buildLook');
  });
});
