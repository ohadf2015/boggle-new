/**
 * The bottom mode row is a carousel at every width: the selected card is
 * scrolled to the middle (not left pinned at the far edge), and chevrons on
 * either side make the sideways scroll obvious on a desktop with no swipe.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassroomModeCardRow } from '../ClassroomModeCatalogue';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}|${JSON.stringify(params)}` : key;

const rect = (left: number, width: number) =>
  ({ left, width, right: left + width, top: 0, bottom: 100, height: 100, x: left, y: 0, toJSON: () => ({}) }) as DOMRect;

let scrollBy: ReturnType<typeof vi.fn>;
const original = { scrollBy: HTMLElement.prototype.scrollBy, gbcr: HTMLElement.prototype.getBoundingClientRect };

beforeEach(() => {
  scrollBy = vi.fn();
  HTMLElement.prototype.scrollBy = scrollBy as unknown as typeof HTMLElement.prototype.scrollBy;
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    if (this.dataset.testid === 'mode-row-scroller') return rect(0, 1000);
    if (this.dataset.testid === 'mode-tile-blast') return rect(800, 150);
    return rect(0, 150);
  };
});

afterEach(() => {
  HTMLElement.prototype.scrollBy = original.scrollBy;
  HTMLElement.prototype.getBoundingClientRect = original.gbcr;
});

describe('<ClassroomModeCardRow> carousel', () => {
  it('Given a selected card off-centre, When the row mounts, Then it scrolls that card to the middle', () => {
    render(<ClassroomModeCardRow selected="blast" onPick={vi.fn()} t={t} />);
    // card centre 875 − scroller centre 500 = 375
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 375 }));
  });

  it('Given a phone or tablet, When the row renders, Then it scrolls sideways and snaps cards to the centre', () => {
    render(<ClassroomModeCardRow selected="blast" onPick={vi.fn()} t={t} />);
    expect(screen.getByTestId('mode-row-scroller').className).toContain('overflow-x-auto');
    expect(screen.getByTestId('mode-tile-blast').className).toContain('snap-center');
  });

  it('Given a desktop, When the row renders, Then every card fits the panel: no scroll, no half-row padding, no clipped edges', () => {
    // Regression: half-row inline padding forced the desktop row to overflow,
    // so at most 4 of 7 cards showed, both edge cards were clipped and the
    // selected card could scroll out of view.
    render(<ClassroomModeCardRow selected="blast" onPick={vi.fn()} t={t} />);
    const scroller = screen.getByTestId('mode-row-scroller');
    expect(scroller.className).toContain('lg:overflow-visible');
    expect(scroller.className).toContain('lg:px-0');
    expect(scroller.className).not.toMatch(/lg:px-\[calc/);
    expect(screen.getByTestId('mode-tile-blast').className).toContain('lg:w-auto');
    for (const group of screen.getAllByTestId(/^mode-group-/)) {
      expect(group.className).toContain('lg:basis-[var(--group-basis)]');
    }
  });

  it('Given a desktop, When the row fits, Then the chevrons stand down instead of covering the edge cards', () => {
    render(<ClassroomModeCardRow selected="blast" onPick={vi.fn()} t={t} />);
    expect(screen.getByTestId('mode-row-prev').className).toContain('lg:hidden');
    expect(screen.getByTestId('mode-row-next').className).toContain('lg:hidden');
  });

  it('Given the chevrons, When the teacher clicks next then previous, Then the row scrolls forward and back', () => {
    render(<ClassroomModeCardRow selected="blast" onPick={vi.fn()} t={t} />);
    scrollBy.mockClear();
    fireEvent.click(screen.getByTestId('mode-row-next'));
    fireEvent.click(screen.getByTestId('mode-row-prev'));
    const [next, prev] = scrollBy.mock.calls.map((c) => (c[0] as ScrollToOptions).left ?? 0);
    expect(next).toBeGreaterThan(0);
    expect(prev).toBeLessThan(0);
    expect(screen.getByTestId('mode-row-next')).toHaveAccessibleName('eg2Modes.scrollNext');
    expect(screen.getByTestId('mode-row-prev')).toHaveAccessibleName('eg2Modes.scrollPrev');
  });

  it('Given an RTL page, When the teacher clicks next, Then the row scrolls toward the left', () => {
    render(<div dir="rtl"><ClassroomModeCardRow selected="blast" onPick={vi.fn()} t={t} dir="rtl" /></div>);
    scrollBy.mockClear();
    fireEvent.click(screen.getByTestId('mode-row-next'));
    expect((scrollBy.mock.calls[0][0] as ScrollToOptions).left).toBeLessThan(0);
    expect(screen.getByTestId('mode-row-scroller').closest('[dir]')).toHaveAttribute('dir', 'rtl');
  });
});

describe('<ClassroomModeCardRow> under the projector zoom', () => {
  it('Given the stage is CSS-zoomed 1.3×, When centring, Then it scrolls in unzoomed pixels', () => {
    const offsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.dataset.testid === 'mode-row-scroller' ? 1000 / 1.3 : 0;
      },
    });
    try {
      render(<ClassroomModeCardRow selected="blast" onPick={vi.fn()} t={t} />);
      // 375 zoomed px ÷ 1.3
      expect((scrollBy.mock.calls[0][0] as ScrollToOptions).left).toBeCloseTo(375 / 1.3, 5);
    } finally {
      if (offsetWidth) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsetWidth);
    }
  });
});
