'use client';

import Header from './Header';
import { useTvFullscreenListener } from '@/hooks/useTvFullscreenListener';
import { useNavigation } from '@/contexts/NavigationContext';

interface AutoHideHeaderProps {
  className?: string;
  /** Callback when header visibility changes */
  onVisibilityChange?: (isVisible: boolean) => void;
}

/**
 * AutoHideHeader - Header wrapper component
 *
 * Hides the header during:
 * - TV fullscreen mode (broadcast)
 * - Active gameplay (game pages have their own in-game controls)
 * In landscape mode it uses static positioning (handled by the Header component's landscape:static class).
 */
export function AutoHideHeader({ className, onVisibilityChange }: AutoHideHeaderProps) {
  const isTvFullscreen = useTvFullscreenListener();
  const { isInGame } = useNavigation();

  // Hide header in fullscreen mode or during active gameplay
  if (isTvFullscreen || isInGame) {
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
