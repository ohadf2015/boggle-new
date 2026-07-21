import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { WordTowerHud, type WordTowerHudProps } from './WordTowerHud';

// Rewarded ad (clue gate) — mocked; the real hook needs AdMobProvider (global
// in prod via essential-providers, absent in unit tests).
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({ showAd: vi.fn(), isAdAvailable: false, status: 'idle' as const, rewardAmount: 0, preload: vi.fn() }),
}));

// jsdom lacks ResizeObserver (the deck-height effect needs it).
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const baseProps = (over: Partial<WordTowerHudProps> = {}): WordTowerHudProps => ({
  anchorLetter: '',
  tray: ['C', 'A', 'T', 'S'],
  selected: [],
  word: '',
  heightM: 12,
  combo: 1,
  scramblesLeft: 3,
  possibleWords: null,
  clueWord: null,
  lastError: null,
  errorKey: 0,
  lastResult: null,
  resultKey: 0,
  onSelectTile: () => {},
  onBackspace: () => {},
  onClear: () => {},
  onSubmit: () => {},
  onScramble: () => {},
  t: (k: string) => k,
  dir: 'ltr',
  ...over,
});

describe('WordTowerHud deck', () => {
  it('renders the backspace tool; scramble stays hidden until the player is stuck', () => {
    render(<WordTowerHud {...baseProps()} />);
    expect(screen.getByLabelText('wordTower.hud.backspace')).toBeTruthy();
    expect(screen.queryByLabelText('wordTower.hud.scramble')).toBeNull();
  });

  it('shows the scramble tool once the wheel has zero buildable words', () => {
    render(<WordTowerHud {...baseProps({ possibleWords: 0 })} />);
    expect(screen.getByLabelText('wordTower.hud.scramble')).toBeTruthy();
  });

  it('keeps the BUILD action OUT of the bottom deck while no word is spelled', () => {
    // The redundant bottom BUILD button was removed — building now lives in the
    // wheel centre, which only surfaces a build control once a word is ready.
    render(<WordTowerHud {...baseProps({ word: '', selected: [] })} />);
    expect(screen.queryByLabelText('wordTower.hud.build')).toBeNull();
  });

  it('surfaces the BUILD control (in the wheel centre) once a 3+ letter word is spelled', () => {
    const onSubmit = vi.fn();
    render(<WordTowerHud {...baseProps({ word: 'CAT', selected: [0, 1, 2], onSubmit })} />);
    const build = screen.getByLabelText('wordTower.hud.build');
    expect(build).toBeTruthy();
    fireEvent.click(build);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows the error line on a rejected word', () => {
    render(<WordTowerHud {...baseProps({ lastError: 'not_in_dictionary', errorKey: 1 })} />);
    expect(screen.getByText('wordTower.error.not_in_dictionary')).toBeTruthy();
  });

  describe('wheel centering', () => {
    // Regression: under RTL the wheel drifted to the right screen edge because it
    // lived in a `flex-1` region flanked by only ONE always-present tool (the
    // trailing backspace). A single flanking tool offsets the wheel; RTL flips
    // that offset to the visual right. The builder row must reserve a SYMMETRIC
    // tool slot on each side so the wheel stays screen-centered in LTR and RTL.
    it('reserves a symmetric tool slot on BOTH sides even when only one tool is visible', () => {
      render(<WordTowerHud {...baseProps()} />);
      // Both flanking slots are always in flow, regardless of `isStuck`.
      expect(screen.getByTestId('wt-tool-slot-start')).toBeTruthy();
      expect(screen.getByTestId('wt-tool-slot-end')).toBeTruthy();
    });

    it('lays out the wheel between the two tool slots via a symmetric grid', () => {
      render(<WordTowerHud {...baseProps()} />);
      const row = screen.getByTestId('wt-builder-row');
      // Grid with equal fixed side columns → the centre (wheel) column is always
      // screen-centered, independent of writing direction (`mx-auto` alone can't
      // guarantee this when a single flanking tool eats space on one side).
      expect(row.className).toContain('grid');
      expect(row.className).toContain('grid-cols-[3.5rem_1fr_3.5rem]');
      // Child order: [start slot, wheel, end slot].
      const start = screen.getByTestId('wt-tool-slot-start');
      const end = screen.getByTestId('wt-tool-slot-end');
      const wheel = screen.getByRole('group');
      expect(row.contains(start)).toBe(true);
      expect(row.contains(end)).toBe(true);
      expect(row.contains(wheel)).toBe(true);
      // The wheel column sits after the start slot and before the end slot.
      const kids = Array.from(row.children);
      const startIdx = kids.findIndex((c) => c.contains(start));
      const endIdx = kids.findIndex((c) => c.contains(end));
      const wheelIdx = kids.findIndex((c) => c.contains(wheel));
      expect(startIdx).toBeLessThan(wheelIdx);
      expect(wheelIdx).toBeLessThan(endIdx);
    });

    it('drops the scramble tool into the START slot when the player is stuck', () => {
      render(<WordTowerHud {...baseProps({ possibleWords: 0 })} />);
      const start = screen.getByTestId('wt-tool-slot-start');
      const scramble = screen.getByLabelText('wordTower.hud.scramble');
      expect(start.contains(scramble)).toBe(true);
    });
  });

  describe('bottom-banner clearance', () => {
    // Regression: the bottom letter nodes + glow ring of the wheel were clipped
    // by a native AdMob banner. Native banners COMPOSITE ABOVE the WebView, so
    // DOM safe-area padding alone can't clear them — the deck must reserve the
    // `--admob-banner-height` band so its whole contents (the wheel included)
    // sit above the banner. The var self-zeros on web / when no banner shows, so
    // this is a no-op there.
    it('reserves the ad-banner band in the control deck bottom padding', () => {
      render(<WordTowerHud {...baseProps()} />);
      const deck = screen.getByTestId('wt-control-deck');
      expect(deck.className).toContain('--admob-banner-height');
      // Still keeps the home-indicator safe area + comfortable tap gap.
      expect(deck.className).toContain('env(safe-area-inset-bottom)');
    });

    it('keeps the banner reservation whether the deck is expanded or collapsed', () => {
      const { rerender } = render(<WordTowerHud {...baseProps()} />);
      expect(screen.getByTestId('wt-control-deck').className).toContain('--admob-banner-height');
      // Collapse the drawer and re-assert (the padding differs per state).
      fireEvent.click(screen.getByLabelText('wordTower.hud.collapse'));
      rerender(<WordTowerHud {...baseProps()} />);
      expect(screen.getByTestId('wt-control-deck').className).toContain('--admob-banner-height');
    });
  });

  describe('responsive wheel sizing', () => {
    // On short/landscape viewports the fixed 230px wheel + deck chrome + banner
    // ate the whole bottom of the screen. The wheel must scale DOWN with viewport
    // height (aspect-square → a narrower cap also shortens it) so it never crowds
    // the upper HUD or the lower ad band. Uses the project's height variants.
    it('caps the wheel smaller as the viewport gets shorter', () => {
      render(<WordTowerHud {...baseProps()} />);
      const wheel = screen.getByRole('group');
      expect(wheel.className).toContain('max-w-[230px]');       // full size, tall screens
      expect(wheel.className).toContain('medium-short:max-w-'); // shrinks ≤850px tall
      expect(wheel.className).toContain('short:max-w-');        // shrinks further ≤600px tall
    });
  });
});
