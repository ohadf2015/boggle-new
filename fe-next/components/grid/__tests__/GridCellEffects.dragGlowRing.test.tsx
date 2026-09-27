/**
 * GridCellEffects drag-time paint suppression.
 *
 * The component's own contract (see its render-mode comment) says the heavier
 * paint — secondary blur glow, glow-ring border-shadow, escalation bursts, WebGL
 * shader — is dropped during an active drag, keeping only the primary ripple for
 * instant feedback. Selected cells re-render on every letter added mid-drag, so a
 * blurred box-shadow ring per cell per step is real paint on the hottest path
 * (and redundant with the cell's own escalation glow). These tests lock the
 * glow ring to that drag-suppression contract.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GridCellEffects from '../GridCellEffects';
import { getSelectionEscalation } from '../selectionEscalation';
import type { ComboColors } from '../types';

// Mock framer-motion: render plain DOM, preserve className + style so we can
// assert which effect layers are present.
vi.mock('framer-motion', () => {
  const make = (Tag: string) => {
    const Motion = React.forwardRef(
      ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<Element>) => {
        const {
          animate, initial, exit, transition, whileHover, whileTap, variants,
          whileInView, viewport, layout, layoutId, drag, dragConstraints,
          onAnimationComplete, onAnimationStart, style, ...domProps
        } = props as Record<string, unknown>;
        return React.createElement(Tag, { ...domProps, style: typeof style === 'object' ? style : undefined, ref }, children as React.ReactNode);
      },
    );
    Motion.displayName = `motion.${Tag}`;
    return Motion;
  };
  return { m: new Proxy({}, { get: (_t, tag: string) => make(tag) }), AnimatePresence: ({ children }: React.PropsWithChildren) => children };
});

// WebGL shader overlay is irrelevant here and unsafe in jsdom — stub it out.
vi.mock('../VFXTileEffect', () => ({ default: () => null }));

const comboColors: ComboColors = {
  bg: 'bg-neo-pink', border: 'border-neo-black', shadow: '', text: null, flicker: false, isRainbow: false,
};

function renderEffects(isDragging: boolean) {
  // 3 letters → tier 1, so compoundTier >= 1 (the glow-ring trigger condition).
  const escalation = getSelectionEscalation(0, 3, 0);
  return render(
    <GridCellEffects
      isSelected
      isFirstSelected={false}
      comboLevel={0}
      comboColors={comboColors}
      effectiveRenderMode="full"
      reduceMotion={false}
      selectionIndex={1}
      escalation={escalation}
      isDragging={isDragging}
    />,
  );
}

describe('GridCellEffects glow ring drag suppression', () => {
  it('renders the glow ring (inset-[-6px]) when NOT dragging', () => {
    const { container } = renderEffects(false);
    expect(container.innerHTML).toContain('inset-[-6px]');
  });

  it('suppresses the glow ring during an active drag', () => {
    const { container } = renderEffects(true);
    expect(container.innerHTML).not.toContain('inset-[-6px]');
  });

  it('keeps the primary ripple during drag (instant feedback preserved)', () => {
    // The first absolute layer is the primary ripple — it must survive drag.
    const { container } = renderEffects(true);
    expect(container.querySelector('.absolute')).not.toBeNull();
  });
});

describe('GridCellEffects decorative layers are not pointer targets', () => {
  // Every effect layer is purely decorative. None must capture pointer events:
  // the primary ripple has no `exit`/loop, so after its ~0.5s tween it stays
  // mounted at the final keyframe (scale 3, opacity 0) for as long as the cell
  // is selected — a persistent invisible hit-target that autocapture records
  // (showed up as a textless rageclick element on the grid). It must mirror its
  // sibling layers, which all set `pointer-events-none`.
  it('gives the primary ripple (first .absolute layer) pointer-events-none', () => {
    const { container } = renderEffects(false);
    const ripple = container.querySelector('.absolute');
    expect(ripple).not.toBeNull();
    expect(ripple?.className).toContain('pointer-events-none');
  });

  it('marks every absolute effect layer pointer-events-none', () => {
    const { container } = renderEffects(false);
    const layers = container.querySelectorAll('.absolute');
    expect(layers.length).toBeGreaterThan(0);
    layers.forEach((layer) => {
      expect(layer.className).toContain('pointer-events-none');
    });
  });
});
