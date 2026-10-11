import { createRef } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { V2Dock } from '../V2Dock';

function renderDock(wide: boolean) {
  const dockRef = createRef<HTMLDivElement>();
  render(
    <V2Dock
      t={(k) => k}
      dockRef={dockRef}
      wide={wide}
      dir="ltr"
      swinging={false}
      composing={false}
      rejected={null}
      dictError={false}
      scrambles={3}
      wheel={['A', 'B', 'C', 'D', 'E', 'F']}
      selected={[]}
      word=""
      valid={false}
      intensity={0}
      accentHex="#c4f000"
      reducedMotion
      canPutBack={false}
      onScramble={vi.fn()}
      onSelectTile={vi.fn()}
      onDeselectTile={vi.fn()}
      onSubmit={vi.fn()}
      onDrop={vi.fn()}
      onPutBack={vi.fn()}
      onBackspace={vi.fn()}
    />,
  );
  return dockRef.current!;
}

describe('V2Dock wheel position', () => {
  it('Given a phone layout, When the dock renders, Then the wheel sits lifted off the bottom edge', () => {
    const dock = renderDock(false);
    expect(dock.className).toContain('pb-[max(2.25rem,calc(env(safe-area-inset-bottom)+1.25rem))]');
    expect(dock.className).not.toContain('pb-[max(0.75rem');
  });

  it('Given a wide layout, When the dock renders, Then the side-panel wheel sits above center', () => {
    const dock = renderDock(true);
    expect(dock.className).toContain('pb-24');
  });
});
