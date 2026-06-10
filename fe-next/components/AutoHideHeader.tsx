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

  // CrazyGames: portal provides its own chrome — remove header AND spacer (empty band fix e4a3ef8a)
  if (isOnCrazyGamesPlatform) {
    if (onVisibilityChange) onVisibilityChange(false);
    return null;
  }

  // TV fullscreen or active gameplay: hide the visible header but keep the spacer div.
  // Header uses fixed+spacer pattern — removing both causes CLS 0.29 on /en/multiplayer
  // as the spacer-height slot collapses and content shifts up by 60–124px.
  if (isTvFullscreen || isInGame) {
    if (onVisibilityChange) onVisibilityChange(false);
    return (
      <div
        aria-hidden="true"
        className="h-header pb-1 lg:pb-2 short:pb-0 medium-short:pb-0.5 min-h-[60px] sm:min-h-[70px] md:min-h-[114px] lg:min-h-[124px] short:min-h-[44px] medium-short:min-h-[52px] md:short:min-h-[48px] lg:short:min-h-[52px] desktop-short:lg:min-h-[56px] desktop-medium-short:lg:min-h-[80px]"
      />
    );
  }

  if (onVisibilityChange) onVisibilityChange(true);
  return <Header className={className} />;
}

export default AutoHideHeader;
