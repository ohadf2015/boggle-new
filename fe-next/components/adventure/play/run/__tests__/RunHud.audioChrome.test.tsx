import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { PotionId } from '@/lib/adventure/play/relics';

/**
 * Adventure sets isInGame during a run (AdventureView), so the global mute FAB
 * appears. RunHud occupies that same top band. Contract: the HUD registers an
 * in-header mute so the FAB stands down, and the HUD itself is the mute.
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

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${Object.values(p).join(' ')}` : k),
    language: 'en',
  }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({}) }));

import RunHud from '../../RunHud';

const noPotions: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };

describe('RunHud — audio chrome (FAB stands down)', () => {
  it('registers an in-header audio control so the global mute FAB stands down', () => {
    render(
      <RunHud
        hp={3}
        maxHp={5}
        gold={0}
        combat={null}
        dispatchCombat={() => {}}
        potionsLeft={noPotions}
        onPotion={() => true}
        goal={null}
        playing
      />,
    );
    expect(registerHeaderAudioControl).toHaveBeenCalled();
  });

  it('renders an in-HUD mute control (adventure is not mute-less in a run)', () => {
    render(
      <RunHud
        hp={3}
        maxHp={5}
        gold={0}
        combat={null}
        dispatchCombat={() => {}}
        potionsLeft={noPotions}
        onPotion={() => true}
        goal={null}
        playing
      />,
    );
    expect(screen.getByTestId('run-hud-mute')).toHaveAttribute('aria-label', 'Mute');
  });
});
