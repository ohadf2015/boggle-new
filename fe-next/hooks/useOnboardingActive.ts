'use client';

import { useSyncExternalStore } from 'react';

/**
 * Reactive read of the `html.onboarding-active` flag — the single source of truth
 * (set by OnboardingFlow for the FTUE overlay's lifetime) that keeps the first run
 * ad-free.
 *
 * WHY a class + observer instead of a context: the flag must be read by BOTH the
 * native banner coordinator (BannerCoordinatorMount, which already observes
 * `<html>` classes outside React) and the web AdSense loader (AdSenseLoader, a
 * React component). A DOM class observed via `useSyncExternalStore` gives both
 * consumers one source of truth without threading a provider through the tree, and
 * stays correct even though the overlay lives in a different subtree than the
 * loader (which is mounted up in the locale layout).
 *
 * SSR-safe: the server snapshot is always `false` (no overlay during SSR), so the
 * loader's own client-only gating drives the first real value after hydration.
 */
const ONBOARDING_CLASS = 'onboarding-active';

function subscribe(onChange: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains(ONBOARDING_CLASS);
}

function getServerSnapshot(): boolean {
  return false;
}

export function useOnboardingActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
