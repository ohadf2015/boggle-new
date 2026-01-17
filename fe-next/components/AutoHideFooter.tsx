'use client';

import Footer from './Footer';
import { useTvFullscreenListener } from '@/hooks/useTvFullscreenListener';

interface AutoHideFooterProps {
  className?: string;
}

/**
 * AutoHideFooter - Footer wrapper component
 *
 * The footer is visible except in fullscreen mode (TV broadcast).
 */
export function AutoHideFooter({ className }: AutoHideFooterProps) {
  // Listen for TV fullscreen mode to hide the footer
  const isTvFullscreen = useTvFullscreenListener();

  // Hide footer in fullscreen mode
  if (isTvFullscreen) {
    return null;
  }

  return <Footer className={className} />;
}

export default AutoHideFooter;
