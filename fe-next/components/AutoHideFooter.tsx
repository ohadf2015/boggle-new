'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';
import { useTvFullscreenListener } from '@/hooks/useTvFullscreenListener';
import { useNavigation } from '@/contexts/NavigationContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface AutoHideFooterProps {
  className?: string;
}

/**
 * AutoHideFooter - Footer wrapper component
 *
 * The footer is hidden during:
 * - TV fullscreen mode
 * - Active gameplay (isInGame from NavigationContext)
 * - Game-specific routes (singleplayer, multiplayer, daily, adventure)
 */
export function AutoHideFooter({ className }: AutoHideFooterProps) {
  // Listen for TV fullscreen mode to hide the footer
  const isTvFullscreen = useTvFullscreenListener();
  const { isInGame } = useNavigation();
  const { language } = useLanguage();
  const pathname = usePathname();

  // Check if on a game route or education route where footer should be hidden
  const cleanPath = pathname.replace(`/${language}`, '');
  const isGameRoute = ['/singleplayer', '/multiplayer', '/daily', '/adventure', '/education', '/student', '/teacher'].some(
    path => cleanPath.startsWith(path)
  );

  // Hide footer during gameplay or on game routes
  if (isTvFullscreen || isInGame || isGameRoute) {
    return null;
  }

  return <Footer className={className} />;
}

export default AutoHideFooter;
