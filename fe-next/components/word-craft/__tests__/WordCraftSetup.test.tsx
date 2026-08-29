import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WordCraftSetup } from '../WordCraftSetup';
import { DEFAULT_SETUP } from '@/lib/word-craft/setupPrefs';

const t = (k: string) => k; // key-echo test translator

const FRIEND_INITIAL = { ...DEFAULT_SETUP, opponent: 'friend' as const };

function getRadio(name: RegExp) {
  return screen.getByRole('radio', { name });
}

function queryGroup(name: RegExp) {
  return screen.queryByRole('radiogroup', { name });
}

describe('WordCraftSetup', () => {
  it('renders opponent cards, difficulty control, twist picker, start CTA', () => {
    render(<WordCraftSetup initial={FRIEND_INITIAL} onStart={vi.fn()} t={t} />);
    expect(getRadio(/setup\.opponent\.bot/)).toBeTruthy();
    expect(getRadio(/setup\.opponent\.hotseat/)).toBeTruthy();
    expect(queryGroup(/setup\.difficulty\.label/)).toBeTruthy();
    expect(queryGroup(/setup\.twist\.label/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /setup\.start/ })).toBeTruthy();
  });

  it('starts with the assembled choice', () => {
    const onStart = vi.fn();
    render(<WordCraftSetup initial={FRIEND_INITIAL} onStart={onStart} t={t} />);
    fireEvent.click(getRadio(/difficulty\.hard/));
    fireEvent.click(getRadio(/modifier\.land_grab/));
    fireEvent.click(screen.getByRole('button', { name: /setup\.start/ }));
    expect(onStart).toHaveBeenCalledWith({ opponent: 'friend', difficulty: 'hard', modifier: 'land_grab' });
  });

  it('Solo vs Rival shortcut: selecting bot defaults difficulty to easy and hides advanced options', () => {
    const onStart = vi.fn();
    render(
      <WordCraftSetup
        initial={{ opponent: 'friend', difficulty: 'hard', modifier: 'land_grab' }}
        onStart={onStart}
        t={t}
      />,
    );
    fireEvent.click(getRadio(/setup\.opponent\.bot/));
    expect(queryGroup(/setup\.difficulty\.label/)).toBeNull();
    expect(queryGroup(/setup\.twist\.label/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /setup\.start/ }));
    expect(onStart).toHaveBeenCalledWith({ opponent: 'bot', difficulty: 'easy', modifier: 'land_grab' });
  });

  it('hides the difficulty control when hotseat is selected (no bot to tune)', () => {
    render(<WordCraftSetup initial={DEFAULT_SETUP} onStart={vi.fn()} t={t} />);
    fireEvent.click(getRadio(/setup\.opponent\.hotseat/));
    expect(queryGroup(/setup\.difficulty\.label/)).toBeNull();
  });

  it('offers a remote Challenge-a-Friend opponent and passes it through START', () => {
    const onStart = vi.fn();
    render(<WordCraftSetup initial={DEFAULT_SETUP} onStart={onStart} t={t} />);
    fireEvent.click(getRadio(/setup\.opponent\.friend/));
    // Friend games still run vs the bot (async duel) — full tuning surface is visible.
    expect(queryGroup(/setup\.difficulty\.label/)).toBeTruthy();
    expect(queryGroup(/setup\.twist\.label/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /setup\.start/ }));
    expect(onStart).toHaveBeenCalledWith({ ...DEFAULT_SETUP, opponent: 'friend' });
  });

  it('surprise twist is the default and start passes it through', () => {
    const onStart = vi.fn();
    render(<WordCraftSetup initial={DEFAULT_SETUP} onStart={onStart} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: /setup\.start/ }));
    expect(onStart).toHaveBeenCalledWith(DEFAULT_SETUP);
  });

  it('opponent radiogroup: ArrowRight/ArrowDown advance selection, ArrowLeft/ArrowUp go back', () => {
    const onStart = vi.fn();
    render(<WordCraftSetup initial={DEFAULT_SETUP} onStart={onStart} t={t} />);
    const opponentGroup = screen.getByRole('radiogroup', { name: /setup\.opponent\.label/ });
    const botCard = getRadio(/setup\.opponent\.bot/);
    const hotseatCard = getRadio(/setup\.opponent\.hotseat/);
    const friendCard = getRadio(/setup\.opponent\.friend/);

    // Start with bot selected
    expect(botCard).toHaveAttribute('aria-checked', 'true');

    // ArrowRight should move to hotseat
    fireEvent.keyDown(opponentGroup, { key: 'ArrowRight' });
    expect(hotseatCard).toHaveAttribute('aria-checked', 'true');

    // ArrowRight again should move to friend
    fireEvent.keyDown(opponentGroup, { key: 'ArrowRight' });
    expect(friendCard).toHaveAttribute('aria-checked', 'true');

    // ArrowLeft should move back to hotseat
    fireEvent.keyDown(opponentGroup, { key: 'ArrowLeft' });
    expect(hotseatCard).toHaveAttribute('aria-checked', 'true');

    // ArrowDown should move to friend (wrap forward)
    fireEvent.keyDown(opponentGroup, { key: 'ArrowDown' });
    expect(friendCard).toHaveAttribute('aria-checked', 'true');

    // ArrowUp should move back to hotseat (wrap backward)
    fireEvent.keyDown(opponentGroup, { key: 'ArrowUp' });
    expect(hotseatCard).toHaveAttribute('aria-checked', 'true');
  });

  it('difficulty radiogroup supports arrow key navigation', () => {
    render(<WordCraftSetup initial={FRIEND_INITIAL} onStart={vi.fn()} t={t} />);
    const difficultyGroup = screen.getByRole('radiogroup', { name: /setup\.difficulty\.label/ });
    const easyButton = getRadio(/difficulty\.easy/);
    const mediumButton = getRadio(/difficulty\.medium/);
    const hardButton = getRadio(/difficulty\.hard/);

    // Start with easy selected (default)
    expect(easyButton).toHaveAttribute('aria-checked', 'true');

    // ArrowRight moves to medium
    fireEvent.keyDown(difficultyGroup, { key: 'ArrowRight' });
    expect(mediumButton).toHaveAttribute('aria-checked', 'true');

    // ArrowLeft moves back to easy
    fireEvent.keyDown(difficultyGroup, { key: 'ArrowLeft' });
    expect(easyButton).toHaveAttribute('aria-checked', 'true');
  });

  it('twist radiogroup supports arrow key navigation', () => {
    render(<WordCraftSetup initial={FRIEND_INITIAL} onStart={vi.fn()} t={t} />);
    const twistGroup = screen.getByRole('radiogroup', { name: /setup\.twist\.label/ });
    const surpriseButton = screen.getAllByRole('radio').find((r) => r.getAttribute('aria-label')?.includes('surprise'));

    // Start with surprise selected (default)
    expect(surpriseButton).toHaveAttribute('aria-checked', 'true');

    // ArrowRight should move to next modifier
    fireEvent.keyDown(twistGroup, { key: 'ArrowRight' });
    const nextButton = screen.getAllByRole('radio').find((r) => r !== surpriseButton && r.getAttribute('aria-checked') === 'true');
    expect(nextButton).toBeTruthy();
  });
});
