import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createRun } from '@/lib/wordTowerV2/run';

/**
 * The results close control used to sit at `end-14` so it would miss the
 * global mute FAB. The FAB re-probes at 2.5s and 5s, so insetting races those
 * timers and double-offsets if the probe later sees the X. The contract is:
 * register an in-header mute (FAB stands down) and park the X in the corner.
 */
const registerHeaderAudioControl = vi.fn(() => vi.fn());
vi.mock('@/contexts/NavigationContext', () => ({
  useRegisterHeaderAudioControl: (active = true) => {
    React.useEffect(() => {
      if (!active) return;
      return registerHeaderAudioControl();
    }, [active]);
  },
  useHideNavigation: () => () => {},
}));

vi.mock('@/hooks/useMasterMute', () => ({
  useMasterMute: () => ({
    allMuted: false,
    toggle: vi.fn(),
    label: 'Mute',
    title: 'Sound on',
  }),
}));

import { V2Results } from '../V2Results';

afterEach(() => {
  cleanup();
  registerHeaderAudioControl.mockClear();
});

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

function renderResults() {
  return render(
    <V2Results
      t={t}
      peakM={12}
      score={900}
      bestM={12}
      isBest
      run={createRun(1)}
      badges={[]}
      unlocked={new Set<string>()}
      onRestart={() => {}}
      onHome={() => {}}
      onClose={() => {}}
    />,
  );
}

describe('V2Results — audio chrome (FAB stands down)', () => {
  it('registers an in-header audio control so the global mute FAB stands down', () => {
    renderResults();
    expect(registerHeaderAudioControl).toHaveBeenCalled();
  });

  it('renders its own mute control (the FAB is gone while this card is up)', () => {
    renderResults();
    expect(screen.getByTestId('v2-results-mute')).toHaveAttribute('aria-label', 'Mute');
  });

  it('parks the close control in the corner (end-3), not inset past the FAB (end-14)', () => {
    renderResults();
    const close = screen.getByLabelText('wordTowerV2.results.close');
    expect(close.className).toContain('end-3');
    expect(close.className).not.toContain('end-14');
  });
});
