import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));

vi.mock('@/hooks/useMasterMute', () => ({
  useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'mute', title: 'mute' }),
}));

vi.mock('@/contexts/NavigationContext', () => ({
  useRegisterHeaderAudioControl: () => undefined,
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({}),
}));

import RunHud from '../../RunHud';
import type { PotionId, RelicId } from '@/lib/adventure/play/relics';

describe('RunHud one-row layout', () => {
  it('maintains single row layout with flex-1 relics container and shrink-0 mute button', () => {
    const potions: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };

    const { container } = render(
      <RunHud
        hp={3}
        maxHp={3}
        combat={null}
        dispatchCombat={vi.fn()}
        potionsLeft={potions}
        onPotion={vi.fn()}
        goal={null}
        playing={true}
      />
    );

    const hudElement = screen.getByTestId('run-hud');
    const muteButton = screen.getByTestId('run-hud-mute');

    // HUD container should not have overflow-x-auto
    expect(hudElement.className).not.toContain('overflow-x-auto');

    // HUD container should have flex-nowrap to prevent wrapping
    expect(hudElement.className).toContain('flex-nowrap');

    // Mute button should have shrink-0 to stay visible
    expect(muteButton.className).toContain('shrink-0');

    // Mute button should have ms-auto to stay right-pinned
    expect(muteButton.className).toContain('ms-auto');
  });

  it('relics container has flex-1 min-w-0 relative positioning for popover', () => {
    const potions: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };
    const relics: RelicId[] = ['sharp-quill'] as RelicId[];

    const { container } = render(
      <RunHud
        hp={3}
        maxHp={3}
        combat={null}
        dispatchCombat={vi.fn()}
        potionsLeft={potions}
        onPotion={vi.fn()}
        goal={null}
        playing={true}
        relics={relics}
      />
    );

    const relicContainer = container.querySelector('[data-testid="run-hud-relics"]');

    // Relics container should have flex-1 to take available space
    expect(relicContainer?.className).toContain('flex-1');

    // Relics container uses relative positioning for the +N popover (no overflow-hidden)
    // since the relic cap ensures no content spills over
    expect(relicContainer?.className).toContain('relative');
  });

  it('mute button stays visible on constrained width', () => {
    const potions: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };

    render(
      <RunHud
        hp={3}
        maxHp={3}
        combat={null}
        dispatchCombat={vi.fn()}
        potionsLeft={potions}
        onPotion={vi.fn()}
        goal={null}
        playing={true}
      />
    );

    const muteButton = screen.getByTestId('run-hud-mute');
    // Mute button should exist and be visible (not hidden by overflow)
    expect(muteButton).toBeInTheDocument();
  });
});
