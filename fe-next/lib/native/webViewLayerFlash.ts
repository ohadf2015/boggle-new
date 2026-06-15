import { Capacitor } from '@capacitor/core';

/**
 * Whether a full-screen overlay should render STATICALLY (no entrance opacity/
 * transform tween) to avoid a white "flash".
 *
 * Animating a `fixed inset-0` element with framer-motion sets `will-change`,
 * which makes the renderer promote a fresh full-screen GPU compositor layer. On
 * the Android System WebView that layer's backing store paints one UNINITIALISED
 * (white) frame before the element's content composites onto it — a visible
 * full-screen flash. Entrance tweens (opacity 0→1 on mount) promote before any
 * content has painted, so simply dropping the `will-change` hint is not enough;
 * the only reliable cure is to NOT promote the layer at all — i.e. render the
 * overlay statically and let it paint in the normal document layer.
 *
 * The quirk is a MOBILE-RENDERER (Chromium/WebKit) behaviour, not a Capacitor
 * one — mobile Chrome/Safari flash identically — so we also opt small (mobile)
 * viewports into the static path. Desktop web keeps the animated juice. Callers
 * must be client-only (no SSR); the matchMedia/Capacitor reads are synchronous
 * and hydration-safe under `ssr:false`. Mirrors the gating in
 * `ResultsScrollEffects` and `MascotCelebrationVideo`.
 */
export function prefersStaticFullscreenOverlay(): boolean {
  if (typeof window === 'undefined') return false;
  const native = Capacitor.isNativePlatform();
  const mobileViewport = window.matchMedia('(max-width: 768px)').matches;
  return native || mobileViewport;
}
