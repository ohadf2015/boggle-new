'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useEduReducedMotion } from './useEduReducedMotion';

/**
 * Endless ambient loops (a bob, a pulse, a shine) as Web Animations on
 * compositor-only properties. A framer `repeat: Infinity` loop runs on the main
 * thread every frame; a dozen of them on the hub left a slow laptop no idle
 * time, so idle-deferred work piled up and landed on the next celebration.
 */

export interface LoopSpec {
  /** Evenly spaced unless a keyframe sets `offset`. */
  keyframes: Keyframe[];
  /** One cycle, ms. */
  duration: number;
  /** Held on the last keyframe at the end of every cycle, ms. */
  repeatDelay?: number;
  /** Before the first cycle only, ms. */
  delay?: number;
  /** Per segment, like framer's `ease`. */
  easing?: string;
}

const COMPOSITED = new Set(['transform', 'translate', 'rotate', 'scale', 'opacity', 'offset', 'easing', 'composite']);

export function loopEffect(spec: LoopSpec): { frames: Keyframe[]; opts: KeyframeAnimationOptions } {
  const { keyframes, duration, repeatDelay = 0, delay = 0, easing = 'ease-in-out' } = spec;
  for (const kf of keyframes) {
    const bad = Object.keys(kf).find((k) => !COMPOSITED.has(k));
    if (bad) throw new Error(`compositor loop cannot animate "${bad}": it would repaint or reflow every frame`);
  }
  const total = duration + repeatDelay;
  const share = duration / total;
  const last = keyframes.length - 1;
  const frames: Keyframe[] = keyframes.map((kf, i) => ({
    ...kf,
    offset: (kf.offset ?? (last === 0 ? 0 : i / last)) * share,
    easing,
  }));
  if (repeatDelay > 0) frames.push({ ...frames[last], offset: 1 });
  return { frames, opts: { duration: total, delay, iterations: Infinity, easing: 'linear', fill: 'backwards' } };
}

/** Callback ref that runs `spec` on the element; null (or reduced motion) runs nothing. */
export function useCompositorLoop<T extends Element>(spec: LoopSpec | LoopSpec[] | null): (el: T | null) => void {
  const reduced = useEduReducedMotion();
  const specs = reduced || !spec ? [] : Array.isArray(spec) ? spec : [spec];
  const key = JSON.stringify(specs);
  const state = useRef<{ el: HTMLElement | null; key: string; running: string; anims: Animation[] }>({ el: null, key, running: '', anims: [] });
  state.current.key = key;

  // No setState from the ref: a parent that remounts the element must not re-render itself.
  const sync = useCallback(() => {
    const s = state.current;
    const want = s.el ? s.key : '';
    if (s.running === want) return;
    s.anims.forEach((a) => a.cancel());
    s.anims = [];
    s.running = want;
    if (!s.el || typeof s.el.animate !== 'function') return;
    s.anims = (JSON.parse(want) as LoopSpec[]).map((one) => {
      const { frames, opts } = loopEffect(one);
      return s.el!.animate(frames, opts);
    });
  }, []);

  useEffect(sync, [key, sync]);
  useEffect(() => () => {
    state.current.el = null;
    sync();
  }, [sync]);

  return useCallback((el: T | null) => {
    state.current.el = el as unknown as HTMLElement | null;
    sync();
  }, [sync]);
}
