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
const playOut = (times = 8) => {
  for (let i = 0; i < times; i += 1) act(() => vi.advanceTimersByTime(800));
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

  it('given motion is allowed, when the lid is tapped, then it rattles before it pops', () => {
    vi.useFakeTimers();
    const onBeat = vi.fn();
    render(reveal({ reducedMotion: false, onBeat, chest: chest({ tier: 'epic', coins: 300 }), coins: 100 }));
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.tap'));
    // The tap buys anticipation, not the haul: no coins on screen yet.
    expect(screen.queryByText(/^\+/)).toBeNull();
    expect(onBeat.mock.calls.map((c) => c[0]).map((b) => (b === 'open' ? 'open' : b.kind))).toEqual(['open', 'anticipation']);
    playOut();
    // (the count-up itself rides rAF, so the total is read after the skip)
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.skip'));
    expect(screen.getByText('+400')).toBeTruthy();
  });

  it('given reduced motion, when the lid is tapped, then the haul lands whole with no sequence', () => {
    render(reveal({ chest: chest({ tier: 'rare', coins: 120, bricks: 1 }), coins: 80 }));
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.tap'));
    // No timers advanced at all — the rattle and the pop ARE the motion.
    expect(screen.getByText('+200')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.chest.item.brick:1')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.chest.continue')).toBeTruthy();
  });

  it('given the fullest chest there is, when it plays out, then every card lands and the run can go on', () => {
    // The budget itself is pinned in rewards.test (revealTotalMs <= 2500); here
    // it only has to reach the end without stalling on a beat.
    vi.useFakeTimers();
    render(reveal({ reducedMotion: false, chest: chest({ tier: 'epic', coins: 300, shields: 1, bricks: 1, blueprints: 1 }), coins: 100 }));
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.tap'));
    playOut();
    expect(screen.getByText('wordTowerV2.chest.item.blueprint:1')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.chest.item.brick:1')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.chest.item.shield:1')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.chest.continue')).toBeTruthy();
  });

  it('given a tap mid-rattle, when it lands, then the total is THERE, not counted from zero again', () => {
    // The skip flips the coins beat on for the first time; a count-up that
    // ignored it would start from 0 and make skipping slower than waiting.
    vi.useFakeTimers();
    render(reveal({ reducedMotion: false, chest: chest({ tier: 'epic', coins: 420 }), coins: 260 }));
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.tap'));
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.skip'));
    expect(screen.getByText('+680')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.chest.continue')).toBeTruthy();
  });

  it('given reduced motion, when the lid is tapped, then the rarity is still SOUNDED', () => {
    const onBeat = vi.fn();
    render(reveal({ onBeat, chest: chest({ tier: 'epic', coins: 300 }) }));
    fireEvent.click(screen.getByLabelText('wordTowerV2.chest.tap'));
    const kinds = onBeat.mock.calls.map((c) => c[0]).map((b) => (b === 'open' ? 'open' : b.kind));
    expect(kinds).toEqual(['open', 'burst', 'coins']);
  });
});
