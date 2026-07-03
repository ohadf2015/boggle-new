import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WordCraftSetup } from '../WordCraftSetup';
import { DEFAULT_SETUP } from '@/lib/word-craft/setupPrefs';

const t = (k: string) => k; // key-echo test translator

describe('WordCraftSetup', () => {
  it('renders opponent cards, difficulty control, twist picker, start CTA', () => {
    render(<WordCraftSetup initial={DEFAULT_SETUP} onStart={vi.fn()} t={t} />);
    expect(screen.getByRole('radio', { name: /setup\.opponent\.bot/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /setup\.opponent\.hotseat/ })).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: /setup\.difficulty\.label/ })).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: /setup\.twist\.label/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /setup\.start/ })).toBeTruthy();
  });

  it('starts with the assembled choice', () => {
    const onStart = vi.fn();
    render(<WordCraftSetup initial={DEFAULT_SETUP} onStart={onStart} t={t} />);
    fireEvent.click(screen.getByRole('radio', { name: /difficulty\.hard/ }));
    fireEvent.click(screen.getByRole('radio', { name: /modifier\.land_grab/ }));
    fireEvent.click(screen.getByRole('button', { name: /setup\.start/ }));
    expect(onStart).toHaveBeenCalledWith({ opponent: 'bot', difficulty: 'hard', modifier: 'land_grab' });
  });

  it('hides the difficulty control when hotseat is selected (no bot to tune)', () => {
    render(<WordCraftSetup initial={DEFAULT_SETUP} onStart={vi.fn()} t={t} />);
    fireEvent.click(screen.getByRole('radio', { name: /setup\.opponent\.hotseat/ }));
    expect(screen.queryByRole('radiogroup', { name: /setup\.difficulty\.label/ })).toBeNull();
  });

  it('surprise twist is the default and start passes it through', () => {
    const onStart = vi.fn();
    render(<WordCraftSetup initial={DEFAULT_SETUP} onStart={onStart} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: /setup\.start/ }));
    expect(onStart).toHaveBeenCalledWith(DEFAULT_SETUP);
  });
});
