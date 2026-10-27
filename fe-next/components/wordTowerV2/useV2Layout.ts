'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useHideNavigation } from '@/contexts/NavigationContext';

/**
 * The play screen's measured frame: wide (side-panel) mode, the HUD's real
 * bottom edge and the dock's real top edge, all read by the camera.
 */
export function useV2Layout() {
  /*
   * Desktop/TV: the wheel moves to a SIDE panel and the canvas becomes the play
   * column, so the camera can spend the height on floors instead of sky (see
   * camera.ts `dockSide`). Gated on aspect as well as width: a tall 1024px
   * window keeps the phone framing, which is the one that is pinned by tests.
   */
  const [wide, setWide] = useState(false);
  const wideRef = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px) and (min-aspect-ratio: 6/5)');
    const apply = () => {
      wideRef.current = mq.matches;
      setWide(mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const dockRef = useRef<HTMLDivElement | null>(null);
  const dockPxRef = useRef(260);

  // The top bar's REAL bottom edge, for the camera (camera.ts `hudPx`). It
  // wraps to a second row and sits under the notch, so the fixed 96px the
  // camera assumed let the hanging slab slide under it. Callback ref: the bar
  // unmounts for the results / district and must be re-observed when it returns.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hudPxRef = useRef(0);
  const [barEl, setBarEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!barEl || !root) return;
    const measure = () => {
      hudPxRef.current = Math.round(barEl.getBoundingClientRect().bottom - root.getBoundingClientRect().top + 16);
      root.style.setProperty('--wt2-hud', `${hudPxRef.current}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(barEl);
    return () => ro.disconnect();
  }, [barEl]);
  const getHudPx = useCallback(() => hudPxRef.current, []);

  // The canvas frames the ground at the dock's real top edge. A SIDE dock
  // covers nothing at the bottom, so it contributes 0 — measuring its
  // full-height panel there would collapse the whole play area.
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const measure = () => {
      dockPxRef.current = wideRef.current ? 0 : el.getBoundingClientRect().height;
      // CSS var, not state: the first-floor hint sits above the dock without a re-render.
      el.parentElement?.style.setProperty('--wt2-dock', `${dockPxRef.current}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wide]);
  const getDockPx = useCallback(() => dockPxRef.current, []);

  const [debug, setDebug] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebug(params.has('debug'));
  }, []);

  // Gameplay owns the whole screen — the global bottom nav covered the dock.
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  // ONE source for the play column's box: the reward layer's impact FX is
  // positioned in canvas px, so its container must share this exact rect (on
  // RTL desktop the two differ by the whole side panel).
  const canvasClass = wide ? 'absolute bottom-0 start-0 top-0 end-[22rem] xl:end-[26rem]' : 'absolute inset-0';

  return { wide, rootRef, setBarEl, getHudPx, dockRef, getDockPx, debug, canvasClass };
}
