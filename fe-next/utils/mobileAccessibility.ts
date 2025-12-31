/**
 * Mobile Accessibility Utilities
 * Helpers for ensuring mobile-friendly UX patterns
 */

/**
 * Minimum touch target size (44x44 pixels)
 * Based on Apple's Human Interface Guidelines and WCAG 2.1 Level AAA
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Recommended touch target size (48x48 pixels)
 * Based on Material Design guidelines
 */
export const RECOMMENDED_TOUCH_TARGET_SIZE = 48;

/**
 * Tailwind class for minimum touch target
 * Ensures 44x44px minimum touch area
 */
export const TOUCH_TARGET_MIN = 'min-w-[44px] min-h-[44px]';

/**
 * Tailwind class for recommended touch target
 * Ensures 48x48px recommended touch area
 */
export const TOUCH_TARGET_RECOMMENDED = 'min-w-[48px] min-h-[48px]';

/**
 * Tailwind class for touch target with padding
 * Adds padding to create larger tap area without changing visual size
 */
export const TOUCH_TARGET_PADDING = 'p-3'; // 12px padding = 24px total added space

/**
 * Check if device is likely a mobile/touch device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  );
}

/**
 * Check if device has hover capability (desktop/laptop)
 */
export function hasHoverCapability(): boolean {
  if (typeof window === 'undefined') return true;

  return window.matchMedia('(hover: hover)').matches;
}

/**
 * Get safe area insets for devices with notches
 * Returns CSS env() values for safe area insets
 */
export function getSafeAreaInsets() {
  return {
    top: 'env(safe-area-inset-top)',
    right: 'env(safe-area-inset-right)',
    bottom: 'env(safe-area-inset-bottom)',
    left: 'env(safe-area-inset-left)',
  };
}

/**
 * Tailwind classes for safe area padding
 * Ensures content doesn't overlap with notch or home indicator
 */
export const SAFE_AREA_PADDING = {
  top: 'pt-[env(safe-area-inset-top)]',
  right: 'pr-[env(safe-area-inset-right)]',
  bottom: 'pb-[env(safe-area-inset-bottom)]',
  left: 'pl-[env(safe-area-inset-left)]',
  all: 'p-[env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]',
};

/**
 * Prevent zoom on input focus (iOS Safari)
 * Add this to input elements to prevent auto-zoom
 */
export const PREVENT_INPUT_ZOOM = {
  style: { fontSize: '16px' }, // iOS doesn't zoom if font-size is 16px or larger
};

/**
 * Prevent pull-to-refresh interference
 * Add to body or scrollable containers
 */
export const PREVENT_OVERSCROLL = 'overscroll-none';

/**
 * Mobile-optimized button styles
 * Combines touch target size with spacing
 */
export const MOBILE_BUTTON_STYLES =
  'min-h-[44px] px-4 py-3 active:scale-95 transition-transform';

/**
 * Mobile-optimized icon button styles
 * Square touch target for icon-only buttons
 */
export const MOBILE_ICON_BUTTON_STYLES =
  'min-w-[44px] min-h-[44px] p-2 active:scale-95 transition-transform';
