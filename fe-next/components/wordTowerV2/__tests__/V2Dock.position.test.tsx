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
  it('Given a phone layout, When the dock renders, Then it is one short solid panel clear of the home indicator and the Android gesture bar', () => {
    const dock = renderDock(false);
    // env() is 0 inside the Android app's WebView; the real inset is the Capacitor var.
    expect(dock.className).toContain(
      'pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem),calc(var(--cap-safe-area-bottom,0px)+0.5rem))]',
    );
    expect(dock.className).toContain('bg-neo-navy');
    expect(dock.querySelector('[data-wt2-letter-row]')).not.toBeNull();
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
