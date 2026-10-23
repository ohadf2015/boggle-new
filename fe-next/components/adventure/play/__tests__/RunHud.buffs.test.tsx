import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/NavigationContext', () => ({ useRegisterHeaderAudioControl: () => {} }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({}) }));
vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => ({ allMuted: false, toggle: () => {}, label: 'm', title: 'm' }) }));

import RunHud from '../RunHud';

const base = {
  hp: 5, maxHp: 5, combat: null, dispatchCombat: () => {}, potionsLeft: { heal: 0, time: 0, cleanse: 0, insight: 0 },
  onPotion: () => {}, goal: null, playing: true,
};

describe('RunHud standing buffs', () => {
  it('shows the time bonus and gold multiplier the run has built up', () => {
    render(<RunHud {...base} relics={['hourglass', 'gold-tooth']} />);
    const row = screen.getByTestId('run-hud-buffs');
    expect(row.textContent).toContain('+10s');
    expect(row.textContent).toContain('×1.5');
  });
  it('renders nothing extra without those relics', () => {
    render(<RunHud {...base} relics={['sharp-quill']} />);
    expect(screen.queryByTestId('run-hud-buffs')).toBeNull();
  });
});
