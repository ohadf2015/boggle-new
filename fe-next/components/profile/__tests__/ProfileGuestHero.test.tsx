import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProfileGuestHero } from '../ProfileGuestHero';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/components/ui/Mascot', () => ({ Mascot: () => <div data-testid="mascot" /> }));

const base = { canSignIn: true, tilesTappable: false, onSignIn: vi.fn(), onLockedTileTap: vi.fn(), onPlay: vi.fn() };

describe('ProfileGuestHero', () => {
  it('Given a guest, Then SIGN IN is the one action and BACK TO BATTLE is gone', () => {
    render(<ProfileGuestHero {...base} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('auth.signIn');
    expect(buttons[0].className).toContain('data-[pressed=true]:translate-y-[4px]');
    expect(screen.queryByText('profile.backToGame')).not.toBeInTheDocument();
    expect(screen.getByTestId('mascot')).toBeInTheDocument();
  });

  it('Given sign-in is unavailable (CrazyGames), Then play is the one action, so the screen is never a dead end', () => {
    const onPlay = vi.fn();
    render(<ProfileGuestHero {...base} canSignIn={false} onPlay={onPlay} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(onPlay).toHaveBeenCalled();
  });

  it('Given the tappable-tiles arm, Then a locked tile opens sign-in', () => {
    const onLockedTileTap = vi.fn();
    render(<ProfileGuestHero {...base} tilesTappable onLockedTileTap={onLockedTileTap} />);
    fireEvent.click(screen.getByText('profile.wins'));
    expect(onLockedTileTap).toHaveBeenCalled();
  });
});
