import { createRef, type ComponentProps } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const wheelRenders = vi.hoisted(() => ({ count: 0 }));

vi.mock('@/hooks/useWheelDragSpell', async (orig) => {
  const real = await orig<typeof import('@/hooks/useWheelDragSpell')>();
  return {
    ...real,
    useWheelDragSpell: (...a: Parameters<typeof real.useWheelDragSpell>) => {
      wheelRenders.count += 1;
      return real.useWheelDragSpell(...a);
    },
  };
});

import { V2Dock } from '../V2Dock';

type DockProps = ComponentProps<typeof V2Dock>;

const t = (k: string) => k;
const dockRef = createRef<HTMLDivElement>();
const noop = () => {};
const wheel = ['a', 'b', 'c', 'd', 'e', 'f'];
const selected: number[] = [];

const base: DockProps = {
  t,
  dockRef,
  wide: false,
  dir: 'ltr',
  swinging: false,
  composing: true,
  rejected: null,
  dictError: false,
  scrambles: 3,
  wheel,
  selected,
  word: '',
  valid: false,
  intensity: 0.2,
  accentHex: '#c4f000',
  reducedMotion: true,
  canPutBack: false,
  onScramble: noop,
  onSelectTile: noop,
  onDeselectTile: noop,
  onSubmit: noop,
  onDrop: noop,
  onPutBack: noop,
  onBackspace: noop,
};

describe('V2Dock render stability', () => {
  beforeEach(() => {
    wheelRenders.count = 0;
  });

  it('Given unchanged props, When the parent re-renders (poll tick), Then the dock does not re-render', () => {
    const spyT = vi.fn(t);
    const { rerender } = render(<V2Dock {...base} t={spyT} />);
    const afterMount = spyT.mock.calls.length;
    rerender(<V2Dock {...base} t={spyT} />);
    rerender(<V2Dock {...base} t={spyT} />);
    expect(spyT.mock.calls.length).toBe(afterMount);
  });

  it('Given only the stability slot changes (risk tick), When the dock re-renders, Then the wheel does not', () => {
    const { rerender } = render(<V2Dock {...base} stabilitySlot={<i>1</i>} />);
    const afterMount = wheelRenders.count;
    rerender(<V2Dock {...base} stabilitySlot={<i>2</i>} />);
    rerender(<V2Dock {...base} stabilitySlot={<i>3</i>} />);
    expect(wheelRenders.count).toBe(afterMount);
  });

  it('Given the wheel letters change, When the dock re-renders, Then the wheel re-renders', () => {
    const { rerender } = render(<V2Dock {...base} />);
    const afterMount = wheelRenders.count;
    rerender(<V2Dock {...base} wheel={['x', 'y', 'z', 'q', 'w', 'e']} />);
    expect(wheelRenders.count).toBeGreaterThan(afterMount);
  });
});
