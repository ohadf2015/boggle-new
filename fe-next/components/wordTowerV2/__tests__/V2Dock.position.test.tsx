import { createRef, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { V2Dock } from '../V2Dock';

function renderDock(wide: boolean, feedSlot?: ReactNode) {
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
      feedSlot={feedSlot}
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

  it('Given a wide layout with a feed, When the dock renders, Then the wheel tops the panel and the feed fills under it', () => {
    const dock = renderDock(true, <div data-testid="feed" />);
    expect(dock.className).toContain('justify-start');
    expect(dock.className).not.toContain('pb-24');
    const feed = dock.querySelector('[data-testid="feed"]')!;
    expect(feed.parentElement!.className).toContain('flex-1');
    expect(dock.lastElementChild).toBe(feed.parentElement);
  });

  it('Given a phone layout, When a feed is passed, Then the dock leaves it out', () => {
    const dock = renderDock(false, <div data-testid="feed" />);
    expect(dock.querySelector('[data-testid="feed"]')).toBeNull();
  });
});
