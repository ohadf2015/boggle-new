'use client';

import Header from './Header';

interface AutoHideHeaderProps {
  className?: string;
  /** Callback when header visibility changes */
  onVisibilityChange?: (isVisible: boolean) => void;
}

/**
 * AutoHideHeader - Header wrapper component
 *
 * The header is always visible. In landscape mode it uses static positioning
 * (handled by the Header component's landscape:static class).
 */
export function AutoHideHeader({ className, onVisibilityChange }: AutoHideHeaderProps) {
  // Always visible - notify parent
  if (onVisibilityChange) {
    onVisibilityChange(true);
  }

  return <Header className={className} />;
}

export default AutoHideHeader;
