import { vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * Behavior tests for the in-game effects toggle.
 *
 * Mute moved out of this control into the global InGameAudioButton FAB (mounted in
 * the locale layout, shown during all active gameplay) — so this component only
 * owns the effects toggle now, avoiding a double mute on the daily challenge.
 */

let effectsReduced = false;
const toggleEffects = vi.fn(() => {
  effectsReduced = !effectsReduced;
});

vi.mock('@/hooks/useReducedEffects', () => ({
  useReducedEffects: () => [effectsReduced, toggleEffects] as [boolean, () => void],
}));

// Import AFTER mocks so the component closes over them.
import { SurvivalAudioEffectsControls } from './SurvivalAudioEffectsControls';

const t = (key: string) => key;

function resetState() {
  effectsReduced = false;
  toggleEffects.mockClear();
}

const effectsButton = () => screen.getByRole('button', { name: /disableAnimations|effects\.enable/i });

describe('SurvivalAudioEffectsControls', () => {
  beforeEach(resetState);
  afterEach(cleanup);

  it('no longer renders a mute button (handled by the global FAB)', () => {
    render(<SurvivalAudioEffectsControls t={t} />);
    expect(screen.queryByRole('button', { name: /mute|unmute/i })).not.toBeInTheDocument();
  });

  describe('effects toggle', () => {
    it('toggles reduced-effects when clicked', () => {
      render(<SurvivalAudioEffectsControls t={t} />);
      fireEvent.click(effectsButton());

      expect(toggleEffects).toHaveBeenCalledTimes(1);
    });

    it('exposes effects state via aria-pressed (off by default → not pressed)', () => {
      render(<SurvivalAudioEffectsControls t={t} />);
      expect(effectsButton()).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
