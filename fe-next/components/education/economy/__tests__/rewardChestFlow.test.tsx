import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${Object.values(params).join(',')}` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));
const haptic = vi.fn();
vi.mock('@/utils/haptics', () => ({ hapticGameWin: () => haptic() }));
const chestSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playChestOpenSound: chestSound, playCoinCascadeSound: vi.fn() }),
}));
vi.mock('@/components/avatar/AvatarRenderer', async () => {
  const React = await import('react');
  return { default: () => React.createElement('div', { 'data-testid': 'chest-avatar' }) };
});
const motion = { reduced: false };
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => motion.reduced };
});

import RewardChest from '../RewardChest';
import { isOverlayQuietZoneActive } from '@/lib/overlayQuietZone';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

const reveal = { gameCode: 'ABC', roundId: 'r1', rarity: 'rare' as const, xp: 25, itemId: 'eyes:starEye', roundCash: 18, rank: 3, size: 20 };
const renderChest = (over: Partial<typeof reveal> = {}, onClose = vi.fn()) =>
  render(<RewardChest reveal={{ ...reveal, ...over }} wearing={DEFAULT_AVATAR_CONFIG} onClose={onClose} />);

beforeEach(() => {
  vi.useFakeTimers();
  motion.reduced = false;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  haptic.mockReset();
  chestSound.mockReset();
});

describe('RewardChest open flow (motion on)', () => {
  it('Given a sealed chest, Then it asks to be tapped and shows no reward yet', () => {
    renderChest();
    expect(screen.getByText('economy.chest.tapToOpen')).toBeTruthy();
    expect(screen.queryByTestId('chest-reveal')).toBeNull();
    expect(chestSound).not.toHaveBeenCalled();
  });

  it('Given a sealed chest, When tapped and left alone, Then it shakes, bursts with one sound and haptic, and reveals', () => {
    renderChest();
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.getByTestId('chest-stage').getAttribute('data-phase')).toBe('shaking');
    act(() => vi.advanceTimersByTime(700));
    expect(screen.getByTestId('chest-stage').getAttribute('data-phase')).toBe('bursting');
    expect(chestSound).toHaveBeenCalledTimes(1);
    expect(haptic).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId('chest-reveal')).toBeTruthy();
    expect(chestSound).toHaveBeenCalledTimes(1);
    expect(haptic).toHaveBeenCalledTimes(1);
  });

  it('Given the chest is shaking, When the student taps anywhere, Then it skips to the reveal and still cues once', () => {
    renderChest();
    fireEvent.click(screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.getByTestId('chest-reveal')).toBeTruthy();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByTestId('chest-stage').getAttribute('data-phase')).toBe('revealed');
    expect(chestSound).toHaveBeenCalledTimes(1);
    expect(haptic).toHaveBeenCalledTimes(1);
  });

  it('Given the chest is shaking, When the student taps the chest itself, Then that tap skips too', () => {
    renderChest();
    const chest = screen.getByRole('button', { name: 'economy.chest.open' });
    fireEvent.click(chest);
    fireEvent.click(chest);
    expect(screen.getByTestId('chest-reveal')).toBeTruthy();
  });

  it('Given the reveal after a full burst, Then coins fly into the cash card', () => {
    renderChest();
    fireEvent.click(screen.getByRole('dialog'));
    act(() => vi.advanceTimersByTime(700));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getAllByTestId('coin-flight-token').length).toBeGreaterThan(0);
  });

  it('Given the student skipped, Then no coins fly over the reveal', () => {
    renderChest();
    fireEvent.click(screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByTestId('coin-flight-token')).toBeNull();
  });
});

describe('RewardChest covers nothing and is covered by nothing', () => {
  it('Given the chest is open, Then it claims the overlay quiet zone so no prompt (cookies, style picker) sits on it', () => {
    renderChest();
    expect(isOverlayQuietZoneActive()).toBe(true);
  });
});

describe('RewardChest reveal', () => {
  beforeEach(() => {
    motion.reduced = true;
  });

  it('Given reduced motion, Then the reveal shows at once with the rarity headline, and cues once', () => {
    renderChest({ rarity: 'epic' });
    expect(screen.getByTestId('chest-reveal')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'economy.chest.headline.epic' })).toBeTruthy();
    expect(screen.queryByTestId('coin-flight-token')).toBeNull();
    expect(chestSound).toHaveBeenCalledTimes(1);
  });

  it('Given the reveal, Then cash, XP and the item are three reward cards, cash is where coins land', () => {
    const { container } = renderChest();
    const cards = screen.getByRole('list', { name: 'economy.chest.chip.label' }).querySelectorAll('li');
    expect(cards).toHaveLength(3);
    expect(cards[0].textContent).toContain('+18');
    expect(cards[1].textContent).toContain('+25');
    expect(cards[2].textContent).toContain('revealUnlock.parts.starEye');
    expect(container.querySelector('[data-reward-landing="cash"]')).toBe(cards[0]);
  });

  it('Given no cash this round, Then the cash card is left out rather than showing +0', () => {
    renderChest({ roundCash: 0 });
    const cards = screen.getByRole('list', { name: 'economy.chest.chip.label' }).querySelectorAll('li');
    expect(cards).toHaveLength(2);
  });

  it('Given the reveal, When Collect is pressed, Then the chest closes', () => {
    const onClose = vi.fn();
    renderChest({}, onClose);
    fireEvent.click(screen.getByRole('button', { name: 'economy.chest.continue' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
