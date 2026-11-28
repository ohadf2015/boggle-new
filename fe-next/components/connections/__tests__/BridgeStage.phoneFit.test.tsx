/**
 * 2026-11-28 report (Hebrew phone, daily pyramid): the riddle's second word was
 * cut off. The stage was shorter than the whole bridge, and the play area clips
 * what does not fit, so the bottom plate went first. Now the scenery (ropes,
 * river) gives up its height before anything the player reads. jsdom has no
 * layout, so these pin the flex classes that carry the behavior.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BridgeStage from '../BridgeStage';

const classesOf = (el: Element) => el.className.split(/\s+/);

describe('BridgeStage on a short phone', () => {
  it('Given a short stage, Then both plates and the deck keep their height and the scenery shrinks first', () => {
    render(
      <BridgeStage word1="ארוחת" word2="אור" isCorrect={false} isGaveUp={false} isRTL>
        <div>slots</div>
      </BridgeStage>,
    );
    const root = screen.getByTestId('bridge-stage');
    expect(classesOf(root)).toContain('min-h-0');
    const [top, bottom] = screen.getAllByTestId('bridge-plate');
    for (const plate of [top, bottom]) {
      // The plate's slide wrapper is the stage's flex item.
      const item = plate.parentElement!.parentElement!;
      expect(item.parentElement).toBe(root);
      expect(classesOf(item)).toContain('shrink-0');
    }
    expect(classesOf(screen.getByTestId('bridge-span'))).toContain('min-h-0');
    expect(classesOf(screen.getByTestId('bridge-deck'))).toContain('shrink-0');
    const ropes = screen.getAllByTestId('bridge-rope')[0].parentElement!;
    expect(classesOf(ropes)).toEqual(expect.arrayContaining(['min-h-0', 'overflow-hidden']));
    expect(classesOf(screen.getByTestId('bridge-river'))).toEqual(expect.arrayContaining(['min-h-0', 'overflow-hidden']));
  });
});
