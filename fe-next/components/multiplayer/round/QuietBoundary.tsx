'use client';

import { Component, type ReactNode } from 'react';

/**
 * Renders nothing if a decorative child throws (e.g. the HUD mute outside a
 * MusicProvider in an embed/test). The round must never die for a mute icon.
 */
export class QuietBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    /* decorative child — intentionally silent */
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
