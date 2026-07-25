'use client';

export interface DirectionsTutorialOverlayProps {
  enabled?: boolean;
  onShown?: () => void;
}

/**
 * Tutorial removed per user request — "more confusing than helping".
 * Players jump straight into gameplay and learn organically.
 * Contextual non-blocking overlays (useContextualGuidance) handle combo/earthquake/fire/swipe tips.
 */
export function DirectionsTutorialOverlay(_props: DirectionsTutorialOverlayProps = { enabled: true }) {
  return null;
}
