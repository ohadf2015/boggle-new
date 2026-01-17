'use client';

import Header from './Header';
import { useTvFullscreenListener } from '@/hooks/useTvFullscreenListener';

interface AutoHideHeaderProps {
  className?: string;
  /** Callback when header visibility changes */
  onVisibilityChange?: (isVisible: boolean) => void;
}

/**
 * AutoHideHeader - Header wrapper component
 *
 * The header is always visible except in fullscreen mode (TV broadcast).
 * In landscape mode it uses static positioning (handled by the Header component's landscape:static class).
 */
export function AutoHideHeader({ className, onVisibilityChange }: AutoHideHeaderProps) {
  // Listen for TV fullscreen mode to hide the header
  const isTvFullscreen = useTvFullscreenListener();

  // Hide header in fullscreen mode
  if (isTvFullscreen) {
    if (onVisibilityChange) {
      onVisibilityChange(false);
    }
    return null;
  }

  // Notify parent that header is visible
  if (onVisibilityChange) {
    onVisibilityChange(true);
  }

  return <Header className={className} />;
}

export default AutoHideHeader;
