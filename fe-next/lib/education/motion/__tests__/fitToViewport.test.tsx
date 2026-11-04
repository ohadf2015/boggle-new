import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { EDU_FIT_SCREEN, fitScale, useFitToViewport } from '../fitToViewport';

describe('fitScale', () => {
  it('leaves content that already fits at full size', () => {
    expect(fitScale({ content: 600, available: 844 })).toBe(1);
    expect(fitScale({ content: 844, available: 844 })).toBe(1);
  });

  it('shrinks taller content so it fits exactly', () => {
    expect(fitScale({ content: 1000, available: 800 })).toBe(0.8);
  });

  it('never shrinks below the readable floor', () => {
    expect(fitScale({ content: 3000, available: 600 })).toBe(0.75);
    expect(fitScale({ content: 3000, available: 600, min: 0.5 })).toBe(0.5);
  });

  it('treats an unmeasured box (jsdom zeros) as fitting', () => {
    expect(fitScale({ content: 0, available: 0 })).toBe(1);
    expect(fitScale({ content: 500, available: 0 })).toBe(1);
  });
});

describe('EDU_FIT_SCREEN', () => {
  it('pins a screen to the dynamic viewport and clips instead of scrolling', () => {
    expect(EDU_FIT_SCREEN).toContain('h-[100dvh]');
    expect(EDU_FIT_SCREEN).toContain('overflow-hidden');
  });
});

function Probe({ content, onScale }: { content: number; onScale: (s: number) => void }) {
  const { ref, scale, style } = useFitToViewport<HTMLDivElement>();
  onScale(scale);
  return (
    <div data-testid="frame" style={{ height: 800 }} ref={(el) => {
      if (el) Object.defineProperty(el, 'clientHeight', { configurable: true, value: 800 });
    }}>
      <div
        ref={(el) => {
          if (el) el.getBoundingClientRect = () => ({ height: content * scale } as DOMRect);
          ref.current = el;
        }}
        style={style}
      />
    </div>
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('useFitToViewport', () => {
  it('scales content that overflows its frame with zoom, so layout and hit-boxes follow', () => {
    const seen: number[] = [];
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    render(<Probe content={1000} onScale={(s) => seen.push(s)} />);
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(seen[seen.length - 1]).toBe(0.8);
  });

  it('keeps content that fits at scale 1 with no style', () => {
    const seen: number[] = [];
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    render(<Probe content={500} onScale={(s) => seen.push(s)} />);
    expect(seen[seen.length - 1]).toBe(1);
  });
});
