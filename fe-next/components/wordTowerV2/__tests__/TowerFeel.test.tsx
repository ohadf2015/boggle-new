import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const emitMascotEvent = vi.fn();
const trigger = vi.fn(() => Promise.resolve());
let reduced = false;

vi.mock('@/lib/blast/mascotBus', () => ({ emitMascotEvent: (e: unknown) => emitMascotEvent(e) }));
vi.mock('@/utils/haptics', () => ({ haptics: { trigger: (p: unknown) => trigger(p) } }));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [reduced] }));
vi.mock('@/components/mascot/GameMascotReactions', () => ({
  GameMascotReactions: ({ mode }: { mode: string }) => <div data-testid="mascot" data-mode={mode} />,
}));

import { TowerFeel } from '../TowerFeel';
import type { RunState } from '@/lib/wordTowerV2/run';

const run = (floors: number, combo = 0) => ({ floors, combo }) as RunState;
const props = { risk: 0, over: false, collapsed: false, lastWord: 'CAT', hidden: false };

describe('TowerFeel', () => {
  beforeEach(() => {
    emitMascotEvent.mockClear();
    trigger.mockClear();
    reduced = false;
  });

  it('mounts the shared mascot for word-tower and tells it about each landed word', () => {
    const { rerender, getByTestId } = render(<TowerFeel {...props} run={run(0)} />);
    expect(getByTestId('mascot').dataset.mode).toBe('word-tower');
    expect(emitMascotEvent).not.toHaveBeenCalled();
    rerender(<TowerFeel {...props} run={run(1)} lastWord="HOUSE" />);
    expect(emitMascotEvent).toHaveBeenCalledWith({ kind: 'word-submitted', wordLength: 5, gemLetterUsed: false });
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('keeps the mascot reacting but the phone still under reduce effects', () => {
    reduced = true;
    const { rerender } = render(<TowerFeel {...props} run={run(0)} />);
    rerender(<TowerFeel {...props} run={run(1)} />);
    expect(emitMascotEvent).toHaveBeenCalled();
    expect(trigger).not.toHaveBeenCalled();
  });

  it('steps out while another screen owns the view', () => {
    const { queryByTestId } = render(<TowerFeel {...props} run={run(3)} hidden />);
    expect(queryByTestId('mascot')).toBeNull();
  });
});
