import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${Object.values(p).join(' ')}` : k), language: 'en' }),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (p: { src: string; alt: string }) => <img src={p.src} alt={p.alt} />,
}));

import FoeTarget from '../FoeTarget';
import { initCombat } from '@/lib/adventure/play/combat';

const base = () => initCombat({ enemyId: 'foe-w1', world: 1, enemyHp: 200, hp: 5, maxHp: 5, relics: [], size: 4, seed: 's' });

describe('FoeTarget — the rival visibly fights back', () => {
  it('Given a rival at rest, then there is a launch point for its shot and no wind-up badge', () => {
    const { container } = render(<FoeTarget world={1} score={0} stars={[100, 130, 160]} lastHit={null} combat={base()} />);
    expect(container.querySelector('[data-enemy-anchor]')).not.toBeNull();
    expect(screen.queryByTestId('foe-windup')).toBeNull();
  });

  it('Given a telegraphed attack, then the portrait winds up with a countdown and the attack frame', () => {
    const c = base();
    const combat = { ...c, now: 1000, telegraph: { attack: c.script.phases[0][0], startedAt: 0, endsAt: 3000 } };
    render(<FoeTarget world={1} score={0} stars={[100, 130, 160]} lastHit={null} combat={combat} />);
    expect(screen.getByTestId('foe-windup').textContent).toContain('2');
    expect((screen.getByRole('img', { name: /elite\.w1/ }) as HTMLImageElement).src).toContain('w1-attack');
  });

  it('Given a projectile in the air, then a deflect button sits on the rival card and dispatches the swipe', () => {
    const c = base();
    const dispatch = vi.fn();
    const combat = { ...c, projectiles: [{ id: 7, damage: 1, landsAt: 1800 }] };
    render(<FoeTarget world={1} score={0} stars={[100, 130, 160]} lastHit={null} combat={combat} dispatchCombat={dispatch} />);
    fireEvent.click(screen.getByText('adventurePlay.deflect'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'swipeProjectile', id: 7 });
  });
});
