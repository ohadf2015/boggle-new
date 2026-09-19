import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BoardHazards from '../BoardHazards';
import { initCombat, type CombatState } from '@/lib/adventure/play/combat';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k }),
}));

function Host({ combat, dispatch, playing = true }: { combat: CombatState | null; dispatch: (e: unknown) => void; playing?: boolean }) {
  return (
    <div style={{ position: 'relative' }}>
      <div>
        {[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => <div key={`${r}${c}`} data-row={r} data-col={c}>x</div>))}
      </div>
      <BoardHazards world={2} combat={combat} dispatchCombat={dispatch} playing={playing} />
    </div>
  );
}

const base = () => initCombat({ enemyId: 'elite-w2', world: 2, enemyHp: 100, hp: 5, maxHp: 5, relics: [], size: 4, seed: 's' });

describe('BoardHazards', () => {
  it('given a frozen and a cursed tile, when tapped, then each dispatches tapTile for its key', () => {
    const dispatch = vi.fn();
    const combat = { ...base(), tiles: [{ kind: 'freeze' as const, key: '1-2', until: 4000 }, { kind: 'curse' as const, key: '3-0', until: 6000 }] };
    render(<Host combat={combat} dispatch={dispatch} />);
    fireEvent.pointerDown(screen.getByLabelText('adventurePlay.combat.thawTile'));
    fireEvent.pointerDown(screen.getByLabelText('adventurePlay.combat.cleanseTile'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'tapTile', key: '1-2' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'tapTile', key: '3-0' });
  });

  it('given incoming projectiles, when one is tapped, then it is swiped away by id', () => {
    const dispatch = vi.fn();
    const combat = { ...base(), projectiles: [{ id: 7, damage: 1, landsAt: 1800 }, { id: 8, damage: 1, landsAt: 2150 }] };
    render(<Host combat={combat} dispatch={dispatch} />);
    const shots = screen.getAllByLabelText('adventurePlay.combat.deflect');
    expect(shots).toHaveLength(2);
    fireEvent.pointerDown(shots[1]);
    expect(dispatch).toHaveBeenCalledWith({ type: 'swipeProjectile', id: 8 });
  });

  it('given the level is not playing, when a projectile is tapped, then nothing is dispatched', () => {
    const dispatch = vi.fn();
    const combat = { ...base(), projectiles: [{ id: 1, damage: 1, landsAt: 1800 }] };
    render(<Host combat={combat} dispatch={dispatch} playing={false} />);
    fireEvent.pointerDown(screen.getByLabelText('adventurePlay.combat.deflect'));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('given a scramble, when the board is blind, then every tile is hidden behind a ?', () => {
    const combat = { ...base(), now: 100, blindUntil: 2600 };
    render(<Host combat={combat} dispatch={vi.fn()} />);
    expect(screen.getAllByText('?')).toHaveLength(16);
  });

  it('given no fight, when rendered, then the layer is empty and never blocks the board', () => {
    const { container } = render(<Host combat={null} dispatch={vi.fn()} />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
