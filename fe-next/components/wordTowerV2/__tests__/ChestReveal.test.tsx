import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ChestRoll } from '@/lib/wordTowerV2/estate';
import { ChestReveal } from '../rewards/ChestReveal';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

/** Beats advance on their own timers, one React commit at a time. */
const playOut = (times = 5) => {
  for (let i = 0; i < times; i += 1) act(() => vi.advanceTimersByTime(1600));
};

const chest = (over: Partial<ChestRoll> = {}): ChestRoll => ({ tier: 'common', coins: 40, shields: 0, bricks: 0, blueprints: 0, ...over });

const reveal = (props: Partial<React.ComponentProps<typeof ChestReveal>> = {}) => (
  <ChestReveal t={t} coins={200} chest={chest()} tease={null} onDone={() => {}} reducedMotion {...props} />
);

describe('ChestReveal', () => {
  it('given a fresh reveal, when rendered, then the chest is shut and asks for a tap', () => {
    render(reveal());
    expect(screen.getByText('wordTowerV2.chest.tap')).toBeTruthy();
    expect(screen.queryByText(/^\+240$/)).toBeNull();
  });

  it('given a tap, when the beats play out, then the coins land and the run can continue', () => {
    vi.useFakeTimers();
    render(reveal());
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.tap'));
    playOut();
    expect(screen.getByText('+240')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.chest.continue')).toBeTruthy();
  });

  it('given an epic chest, when it finishes, then every item has its own card', () => {
    vi.useFakeTimers();
    render(reveal({ chest: chest({ tier: 'epic', coins: 300, shields: 1, blueprints: 1 }), coins: 100 }));
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.tap'));
    playOut();
    expect(screen.getByText('wordTowerV2.chest.item.blueprint:1')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.chest.item.shield:1')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.chest.tier.epic')).toBeTruthy();
  });

  it('given a second tap mid-reveal, when it lands, then the whole haul shows at once', () => {
    vi.useFakeTimers();
    render(reveal({ chest: chest({ tier: 'rare', coins: 120, bricks: 1 }), coins: 80 }));
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.tap'));
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.skip'));
    expect(screen.getByText('+200')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.chest.item.brick:1')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.chest.continue')).toBeTruthy();
  });

  it('given a guest, when the reveal ends, then keeping the haul is one tap away', () => {
    vi.useFakeTimers();
    const onSignIn = vi.fn();
    render(reveal({ guest: true, onSignIn }));
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.tap'));
    playOut();
    fireEvent.click(screen.getByText('wordTowerV2.chest.guest'));
    expect(onSignIn).toHaveBeenCalledOnce();
  });

  it('given a near miss, when the reveal ends, then it names what the next run needs', () => {
    vi.useFakeTimers();
    render(reveal({ tease: { kind: 'perfects', n: 2, tier: 'epic' } }));
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.tap'));
    playOut();
    expect(screen.getByText('wordTowerV2.chest.tease.perfects:2,wordTowerV2.chest.tier.epic')).toBeTruthy();
  });

  it('given the continue button, when pressed, then the run hands over to the results', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(reveal({ onDone }));
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.tap'));
    playOut();
    fireEvent.click(screen.getByText('wordTowerV2.chest.continue'));
    expect(onDone).toHaveBeenCalledOnce();
  });
});
