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

describe('RunHud goal rendering', () => {
  it('when goal is provided, the goal text is in the hud slot', () => {
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
        goal="Test goal"
        playing={true}
        relics={relics}
      />
    );

    // Get the outer hud slot container
    const hudSlot = container.querySelector('[data-adv-slot="hud"]');
    expect(hudSlot).toBeInTheDocument();

    // The goal text should be INSIDE the hud slot (not a sibling)
    const goalText = Array.from(hudSlot!.querySelectorAll('*')).find(
      (el) => el.textContent?.includes('Test goal')
    );
    expect(goalText).toBeTruthy();
  });

  it('when goal is null, no goal text is rendered', () => {
    const potions: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };
    const relics: RelicId[] = ['sharp-quill'] as RelicId[];

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

    // There should be no element with goal text
    expect(screen.queryByText(/Score.*in.*s/)).not.toBeInTheDocument();
  });
});
