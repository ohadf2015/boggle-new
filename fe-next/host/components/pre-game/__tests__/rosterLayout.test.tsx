import { describe, it, expect } from 'vitest';
import React, { useRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { deskWall, useHiddenBelow } from '../rosterLayout';

describe('deskWall — the ≥720px host/guest roster', () => {
  it('8 or fewer keep the 4-column grid', () => {
    const wall = deskWall(8);
    expect(wall.dense).toBe(false);
    expect(wall.grid).toMatch(/min-\[720px\]:grid-cols-4/);
  });

  it('every size caps its height to what the mode picker leaves, and scrolls inside it', () => {
    for (const seated of [3, 8, 15, 27]) {
      expect(deskWall(seated).grid).toMatch(/min-\[720px\]:max-h-\[max\(10rem,calc\(100dvh-/);
      expect(deskWall(seated).grid).toMatch(/min-\[720px\]:overflow-y-auto/);
    }
  });

  it('a bigger room fills the width with smaller seats and scrolls inside a capped height', () => {
    for (const seated of [9, 15, 27]) {
      const wall = deskWall(seated);
      expect(wall.dense).toBe(true);
      expect(wall.grid).toMatch(/min-\[720px\]:grid-cols-\[repeat\(auto-fill/);
      expect(wall.grid).toMatch(/min-\[720px\]:max-h-/);
      expect(wall.grid).toMatch(/min-\[720px\]:overflow-y-auto/);
      expect(wall.grid).not.toMatch(/grid-cols-4/);
    }
  });
});

describe('useHiddenBelow — the capped grid counts the seats below its fold', () => {
  function Probe({ onValue }: { onValue: (v: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    onValue(useHiddenBelow(ref, 3));
    return (
      <div ref={ref} data-testid="box">
        {['a', 'b', 'c'].map((id) => <div key={id} data-player={id} />)}
      </div>
    );
  }

  function layOut(foldBottom: number, seatTops: number[]) {
    const box = screen.getByTestId('box');
    box.getBoundingClientRect = () => ({ top: 0, bottom: foldBottom, height: foldBottom } as DOMRect);
    box.querySelectorAll('[data-player]').forEach((seat, i) => {
      (seat as HTMLElement).getBoundingClientRect = () => ({ top: seatTops[i], bottom: seatTops[i] + 80, height: 80 } as DOMRect);
    });
    act(() => { fireEvent.scroll(box); });
  }

  it('counts seats whose centre is past the fold, and none once they are scrolled into view', () => {
    let last = -1;
    render(<Probe onValue={(v) => { last = v; }} />);
    layOut(130, [0, 100, 200]);
    expect(last).toBe(2);
    layOut(130, [-90, 0, 90]);
    expect(last).toBe(0);
  });
});
