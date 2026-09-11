/**
 * Selected-tile letter contrast.
 *
 * uisight 2026-09-10 on lexiclash.live: `span.relative.z-10` letter "C" was
 * #000000 on board navy #1a1a2e = 1.23:1 (flagged invisible). The glyph span
 * is transparent, so contrast tools — and the eye, when the lime tile fill
 * fails to paint — sample the navy board behind it.
 *
 * Contract: a selected cell always has an opaque light fill (#bfff00 lime)
 * unless a combo/escalation gradient already set `background`, and the letter
 * span itself carries an explicit navy (or cream on white-text combos) color.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GridCell from '../GridCell';
import { getComboColors } from '../index';
import { getSelectionEscalation } from '../selectionEscalation';

vi.mock('framer-motion', () => {
  const make = (Tag: string) => {
    const Motion = React.forwardRef(
      (
        { children, ...props }: React.PropsWithChildren<Record<string, unknown>>,
        ref: React.Ref<Element>,
      ) => {
        const {
          animate, initial, exit, transition, whileHover, whileTap, variants,
          whileInView, viewport, layout, layoutId, drag, dragConstraints,
          onAnimationComplete, onAnimationStart, style, ...domProps
        } = props as Record<string, unknown>;
        return React.createElement(
          Tag,
          { ...domProps, style: typeof style === 'object' ? style : undefined, ref },
          children as React.ReactNode,
        );
      },
    );
    Motion.displayName = `motion.${Tag}`;
    return Motion;
  };
  return {
    m: new Proxy({}, { get: (_t, tag: string) => make(tag) }),
    AnimatePresence: ({ children }: React.PropsWithChildren) => children,
  };
});

const combo0 = getComboColors(0);

function renderCell(overrides: Partial<React.ComponentProps<typeof GridCell>> = {}) {
  const escalation = getSelectionEscalation(0, 1, 0);
  return render(
    <GridCell
      cell="C"
      row={0}
      col={0}
      isSelected
      isFirstSelected
      isLastSelected
      isFading={false}
      isFocused={false}
      isAdjacentHint={false}
      isHighlighted={false}
      isGolden={false}
      isEliminated={false}
      isHovered={false}
      isFrozen={false}
      isCharged={false}
      isMeteor={false}
      isRush={false}
      highlightedOrder={undefined}
      selectionIdx={0}
      escalation={escalation}
      shakeOffset={{ x: 0, y: 0, rotate: 0, scale: 1, delay: 0 }}
      effectiveRenderMode="minimal"
      earthquakePhase="idle"
      getPhaseAnimation={{}}
      comboLevel={0}
      escalationCombo={0}
      comboColors={combo0}
      reduceMotion
      animateOnMount={false}
      interactive={false}
      isSelecting
      isDragging={false}
      isTypingMode={false}
      hintAnimationPhase={null}
      isHighTier={false}
      selectedCellsLength={1}
      onTouchStart={() => {}}
      onMouseDown={() => {}}
      onDoubleClick={() => {}}
      ariaLabel="C"
      {...overrides}
    />,
  );
}

describe('GridCell selected letter contrast', () => {
  it('paints an opaque lime fill on a selected tile when no combo gradient is set', () => {
    const { container } = renderCell();
    const tile = container.querySelector('[data-letter="C"]') as HTMLElement;
    expect(tile).not.toBeNull();
    expect(tile.style.backgroundColor).toBe('#bfff00');
  });

  it('gives the letter span an explicit navy color, not inherited black-on-transparent', () => {
    const { container } = renderCell();
    const letter = container.querySelector('span.relative.z-10') as HTMLElement;
    expect(letter).not.toBeNull();
    expect(letter.textContent).toBe('C');
    expect(letter.style.color).toBe('#1a1a2e');
  });

  it('uses cream letter color when comboColors asks for white text', () => {
    const { container } = renderCell({
      comboLevel: 3,
      comboColors: getComboColors(3),
    });
    const letter = container.querySelector('span.relative.z-10') as HTMLElement;
    expect(letter.style.color).toBe('#FFFEF0');
  });
});
