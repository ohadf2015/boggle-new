'use client';

import Header from './Header';
import { useTvFullscreenListener } from '@/hooks/useTvFullscreenListener';
import { useNavigation } from '@/contexts/NavigationContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

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
 * - CrazyGames embed: portal provides its own chrome and the in-app header has
 *   no menu/auth/dropdown to render anyway (e4a3ef8a, 65e790e7). Removing the
 *   header also drops its sibling spacer, fixing the visible empty band that
 *   the fixed-header + spacer pattern produced on CG.
 * In landscape mode it uses static positioning (handled by the Header component's landscape:static class).
 */
export function AutoHideHeader({ className, onVisibilityChange }: AutoHideHeaderProps) {
  const isTvFullscreen = useTvFullscreenListener();
  const { isInGame } = useNavigation();
  const { isOnCrazyGamesPlatform } = useCrazyGames();

  // Hide header in fullscreen mode, during active gameplay, or on CrazyGames
  if (isTvFullscreen || isInGame || isOnCrazyGamesPlatform) {
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
