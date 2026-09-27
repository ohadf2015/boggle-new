import { render, screen, fireEvent } from '@testing-library/react';

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

describe('RunHud relics cap at 4 visible', () => {
  it('shows exactly 4 relic chips when 4 relics owned', () => {
    const potions: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };
    const relics: RelicId[] = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune'] as RelicId[];

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
        relics={relics}
      />
    );

    // Should have 4 relic chips, no +N
    const relicButtons = screen.getAllByRole('button').filter(b => b.getAttribute('data-relic'));
    expect(relicButtons).toHaveLength(4);

    // Should NOT have a +N chip
    expect(screen.queryByTestId('run-hud-more-relics')).not.toBeInTheDocument();
  });

  it('shows 4 unmarked + 2 marked overflow relics + "+N" button when 6 relics owned', () => {
    const potions: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };
    const relics: RelicId[] = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune', 'twin-ink', 'echo-stone'] as RelicId[];

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

    // All 6 relic buttons should exist
    const allRelicButtons = screen.getAllByRole('button').filter(b => b.getAttribute('data-relic'));
    expect(allRelicButtons).toHaveLength(6);

    // First 4 should not have overflow marking
    const unmarkedChips = container.querySelectorAll('li:not([data-adv-overflow])');
    // This includes non-overflow relics + the mute button + potion buttons, so just check the relics
    const unmarkedRelics = Array.from(unmarkedChips).filter(li => li.querySelector('[data-relic]'));
    expect(unmarkedRelics).toHaveLength(4);

    // Last 2 should have data-adv-overflow marking
    const overflowChips = container.querySelectorAll('li[data-adv-overflow]');
    expect(overflowChips).toHaveLength(2);
    overflowChips.forEach(chip => {
      expect(chip).toHaveAttribute('data-adv-overflow', 'true');
    });

    // Should have a +N chip showing "+2"
    const moreChip = screen.getByTestId('run-hud-more-relics');
    expect(moreChip).toBeInTheDocument();
    expect(moreChip.textContent).toContain('+2');
  });

  it('relic rail has flex-nowrap and no flex-wrap or overflow-x-auto', () => {
    const potions: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };
    const relics: RelicId[] = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune', 'twin-ink', 'echo-stone'] as RelicId[];

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

    const hudElement = screen.getByTestId('run-hud');

    // HUD should have flex-nowrap
    expect(hudElement.className).toContain('flex-nowrap');

    // HUD should NOT have flex-wrap or overflow-x-auto
    expect(hudElement.className).not.toContain('flex-wrap');
    expect(hudElement.className).not.toContain('overflow-x-auto');
  });

  it('clicking +N button opens popover listing hidden relics', () => {
    const potions: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };
    const relics: RelicId[] = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune', 'twin-ink', 'echo-stone'] as RelicId[];

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
        relics={relics}
      />
    );

    const moreChip = screen.getByTestId('run-hud-more-relics');
    expect(moreChip).toBeInTheDocument();

    // Click to open popover
    fireEvent.click(moreChip);

    // Popover should show the hidden relics (mirror and shield would be in it)
    expect(screen.getByTestId('run-hud-relic-popover')).toBeInTheDocument();
  });
});
