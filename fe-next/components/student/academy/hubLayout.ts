'use client';

/**
 * Which Academy layout a viewport gets — by aspect AND height, never width alone.
 *
 *   art    portrait map on a tall view, landscape map on a wide one.
 *   chrome 'rail'  a short landscape view (a phone on its side): slim HUD, the
 *                  hero and an icon dock share one bottom row, so the map keeps
 *                  the middle of a ~390px-tall screen.
 *          'wide'  a real desktop: side card (when it fits) · hero · dock.
 *          'stack' everything else (phones, tablets, 4:3): HUD on top, hero over dock.
 *   scale  the chrome and the islands grow on big screens (a 1440p TV is 4/3 of
 *          the 1080p design) and a little on tablets; never below 1.
 */

import { useLayoutEffect, useState } from 'react';

export type MapArt = 'portrait' | 'landscape';
export type HubChrome = 'stack' | 'rail' | 'wide';

export interface HubLayout {
  art: MapArt;
  chrome: HubChrome;
  scale: number;
  /** Wide chrome with room for the side card (class, streak, boss, chest). */
  sideCard: boolean;
}

/** Below this height a landscape view is a phone on its side. */
const RAIL_MAX_HEIGHT = 520;
/** The three-column desktop chrome needs this much width (at scale 1)... */
const WIDE_MIN_WIDTH = 1200;
const WIDE_MIN_HEIGHT = 600;
/** ...and this much for the side card beside the hero and the dock. */
const SIDE_CARD_MIN_WIDTH = 1500;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function pickHubLayout({ width, height }: { width: number; height: number }): HubLayout {
  const art: MapArt = width >= height ? 'landscape' : 'portrait';
  let chrome: HubChrome = 'stack';
  if (art === 'landscape' && height < RAIL_MAX_HEIGHT) chrome = 'rail';
  else if (art === 'landscape' && width >= WIDE_MIN_WIDTH && height >= WIDE_MIN_HEIGHT) chrome = 'wide';

  const scale =
    chrome === 'wide'
      ? clamp(Math.min(width / 1920, height / 1080), 1, 2)
      : chrome === 'stack'
        ? clamp(Math.min(width / 440, height / 900), 1, 1.5)
        : 1;
  const rounded = Math.round(scale * 1000) / 1000;
  return { art, chrome, scale: rounded, sideCard: chrome === 'wide' && width / rounded >= SIDE_CARD_MIN_WIDTH };
}

function readView() {
  if (typeof window === 'undefined') return { width: 390, height: 844 };
  return { width: window.innerWidth, height: window.innerHeight };
}

/** The live layout: read synchronously on first render (no flash), then on resize. */
export function useHubLayout(): HubLayout {
  const [layout, setLayout] = useState<HubLayout>(() => pickHubLayout(readView()));
  useLayoutEffect(() => {
    const update = () => {
      const next = pickHubLayout(readView());
      setLayout((prev) =>
        prev.art === next.art && prev.chrome === next.chrome && prev.scale === next.scale && prev.sideCard === next.sideCard ? prev : next,
      );
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return layout;
}
