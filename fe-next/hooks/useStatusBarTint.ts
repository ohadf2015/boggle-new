'use client';

/**
 * Per-route status bar icon tint for Capacitor Android (and iOS).
 *
 * The bars themselves are transparent (edge-to-edge: see MainActivity
 * EdgeToEdge.enable) so each route's own brand-colored bg shows through. What
 * this hook tunes is the bar *icon* contrast: each game mode owns a brand color
 * family, and we flip the bar icons light/dark based on that color's luminance
 * so they stay legible against whatever the route paints behind them — the kind
 * of micro-detail that signals a native-grade build.
 *
 * We deliberately do NOT set a bar background color: that maps to the
 * deprecated-in-Android-15 Window.setStatusBarColor and is redundant under
 * edge-to-edge.
 *
 * No-op on web. Plugin loaded dynamically to avoid Turbopack static-import
 * issues at module evaluation time.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isNative } from '../utils/platform';
import logger from '../utils/logger';

const NAVY = '#1a1a2e';
const LIME = '#BFFF00';
const PINK = '#FF1493';
const CYAN = '#00FFFF';
const PURPLE = '#8B5CF6';
const YELLOW = '#FFE135';
const ORANGE = '#FF6B35';

interface RouteTint {
  pattern: RegExp;
  color: string;
}

const ROUTE_TINTS: RouteTint[] = [
  { pattern: /\/multiplayer(\/|$)/, color: PINK },
  { pattern: /\/singleplayer(\/|$)/, color: CYAN },
  { pattern: /\/connections(\/|$)/, color: PURPLE },
  { pattern: /\/brain(\/|$)/, color: PURPLE },
  { pattern: /\/daily(\/|$)/, color: YELLOW },
  { pattern: /\/adventure(\/|$)/, color: ORANGE },
  { pattern: /\/blast(\/|$)/, color: PINK },
  { pattern: /\/(create|custom)(\/|$)/, color: LIME },
];

function colorForRoute(pathname: string | null): string {
  if (!pathname) return NAVY;
  for (const { pattern, color } of ROUTE_TINTS) {
    if (pattern.test(pathname)) return color;
  }
  return NAVY;
}

/** Pick light/dark text for the bar based on perceived luminance of bg color. */
function isLightColor(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Rec. 709 luma
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 160;
}

export function useStatusBarTint(): void {
  const pathname = usePathname();

  useEffect(() => {
    if (!isNative()) return;
    const color = colorForRoute(pathname);
    const useDarkText = isLightColor(color);

    import('@capacitor/status-bar')
      .then(({ StatusBar, Style }) => {
        // No setBackgroundColor: edge-to-edge (MainActivity EdgeToEdge.enable) keeps the
        // bar transparent so the route's own bg shows through. setBackgroundColor maps to
        // the deprecated-in-Android-15 Window.setStatusBarColor — flagged by Play Console.
        // Only the icon contrast is adapted per route, via the modern setStyle path.
        StatusBar.setStyle({ style: useDarkText ? Style.Light : Style.Dark }).catch(() => {});
      })
      .catch((err) => {
        logger.warn('[useStatusBarTint] failed to set status bar:', err);
      });
  }, [pathname]);
}
