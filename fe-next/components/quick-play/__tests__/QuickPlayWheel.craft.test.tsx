/**
 * Quick Play wheel — craft guards for the picker overhaul.
 *
 * Each assertion here pins a defect that was live on the shipped screen:
 *  - four raster sticker icons with no shared metaphor (now authored SVG)
 *  - the wheel root painting an opaque navy rectangle over the hub atmosphere
 *  - `quick-node-zap` / `quick-knob-pulse` defined TWICE: once in globals.css
 *    and again in a <style> tag inside QuickPlayStrikeFx. That tag mounts only
 *    during a strike, so the weaker duplicate won at exactly the moment the
 *    beat mattered, and the payoff was a brightness flicker
 *  - nothing on screen telling a first-time player what a mode actually is
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickPlayWheel } from '../QuickPlayWheel';
import { QUICK_MODES } from '../types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/utils/haptics/HapticsManager', () => ({
  default: { selection: vi.fn(), tap: vi.fn(), success: vi.fn() },
  haptics: { selection: vi.fn(), tap: vi.fn(), success: vi.fn() },
}));

const GLOBALS = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');

describe('QuickPlayWheel — craft guards', () => {
  const onSelect = vi.fn();
  beforeEach(() => vi.clearAllMocks());

  const renderWheel = (props: Partial<Parameters<typeof QuickPlayWheel>[0]> = {}) =>
    render(<QuickPlayWheel selection="random" onSelect={onSelect} {...props} />);

  it('draws every mode icon as authored SVG — no raster <img>', () => {
    const { container } = renderWheel();
    expect(container.querySelector('img')).toBeNull();
    for (const mode of QUICK_MODES) {
      const face = screen.getByTestId(`quick-wheel-node-face-${mode}`);
      expect(face.querySelector('svg')).not.toBeNull();
    }
  });

  it('does not paint an opaque background over the hub atmosphere', () => {
    const { container } = renderWheel();
    const root = container.querySelector('[data-testid="quick-play-wheel"]')!;
    expect(root.className).not.toMatch(/\bbg-neo-navy\b/);
  });

  // Tailwind v4's scanner emits nothing for a class it cannot resolve, so an
  // undefined custom animation class is a SILENT no-op. Assert the CSS exists.
  it.each(['quick-node-zap', 'quick-knob-pulse', 'quick-node-float', 'quick-wheel-breathe'])(
    '%s is actually defined in globals.css',
    (cls) => {
      expect(GLOBALS).toContain(`@utility ${cls}`);
      expect(GLOBALS).toContain(`@keyframes ${cls}`);
    }
  );

  // The duplicate lived in a component <style> tag that only mounts during a
  // strike, so it was invisible to a CSS-only grep AND it won the cascade at
  // exactly the moment the animation mattered. One definition, in globals.
  it.each(['quick-node-zap', 'quick-knob-pulse'])(
    '%s is defined exactly once across the codebase',
    (cls) => {
      const strikeFx = readFileSync(
        join(process.cwd(), 'components/quick-play/QuickPlayStrikeFx.tsx'),
        'utf8'
      );
      expect(strikeFx).not.toMatch(new RegExp(`\\.${cls}\\s*\\{[^}]*animation:`));
      expect(strikeFx).not.toContain(`@keyframes ${cls}-kf`);
    }
  );

  it('never runs the old half-second ambient strobe', () => {
    const { container } = renderWheel();
    const ambient = container.querySelector('[data-testid="quick-wheel-ambient"]')!;
    expect(ambient.className).not.toMatch(/animate-pulse/);
  });

  it('tells the player what the highlighted mode actually is', () => {
    renderWheel({ selection: 'classic' });
    expect(screen.getByTestId('quick-mode-blurb').textContent).toContain(
      'quickPlay.solo.blurb.classic'
    );
  });

  it('swaps the blurb to the mode under the knob while dragging', () => {
    renderWheel({ selection: 'classic' });
    const knob = screen.getByTestId('quick-wheel-knob');
    fireEvent.pointerDown(knob, { clientX: 0, clientY: 0, pointerId: 1 });
    // drag up == wheel-rush (0deg)
    fireEvent.pointerMove(knob, { clientX: 0, clientY: -120, pointerId: 1 });
    expect(screen.getByTestId('quick-mode-blurb').textContent).toContain(
      'quickPlay.solo.blurb.wheel-rush'
    );
  });
});
