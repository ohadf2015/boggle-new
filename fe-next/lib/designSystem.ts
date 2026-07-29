/**
 * Design System Utilities
 *
 * Centralized color and design token helpers for the LexiClash Neo-Brutalist design system.
 * All functions reference CSS variables defined in globals.css for consistency.
 *
 * @see /app/globals.css - CSS variable definitions
 * @see /tailwind.config.js - Tailwind utilities
 * @see /docs/design-tokens.md - Complete token documentation
 */

// ============================================================================
// Types
// ============================================================================

export type OAuthProvider = 'google' | 'discord' | 'apple';
export type OAuthState = 'default' | 'hover' | 'dark';

export type SharePlatform = 'whatsapp' | 'facebook' | 'twitter' | 'linkedin' | 'telegram';

export type AvatarCharacter =
  | 'broccoli-bob' | 'drippy-drop' | 'sunny-steve' | 'cloudy-carl'
  | 'octo-otto' | 'pizza-pete' | 'prickly-pat' | 'melon-molly'
  | 'avo-alex' | 'frosty-frank' | 'flaky-fred' | 'eggy-ed'
  | 'slimy-sam' | 'starry-stella' | 'shroom-shelly' | 'donut-danny'
  | 'jelly-jen';

export type RankPosition = 1 | 2 | 3;

export type StatType = 'positive' | 'negative' | 'neutral';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'success';

export type BadgeVariant = 'info' | 'warning' | 'error' | 'success';

// ============================================================================
// OAuth Brand Colors
// ============================================================================

/**
 * Get brand color for OAuth buttons
 *
 * @param provider - OAuth provider (google, discord, apple)
 * @param state - Button state (default, hover, dark)
 * @returns Tailwind color class
 *
 * @example
 * ```tsx
 * <button className={`bg-${getOAuthBrandColor('google', 'default')}`}>
 *   Sign in with Google
 * </button>
 * ```
 */
export function getOAuthBrandColor(provider: OAuthProvider, state: OAuthState = 'default'): string {
  const colorMap: Record<OAuthProvider, Record<OAuthState, string>> = {
    google: {
      default: 'brand-google',
      hover: 'brand-google-hover',
      dark: 'brand-google-dark',
    },
    discord: {
      default: 'brand-discord',
      hover: 'brand-discord-hover',
      dark: 'brand-discord-dark',
    },
    apple: {
      default: 'brand-apple',
      hover: 'brand-apple-hover',
      dark: 'brand-apple-light', // Note: "light" is used for dark mode contrast
    },
  };

  return colorMap[provider][state];
}

/**
 * Get CSS variable reference for OAuth brand colors (for inline styles)
 *
 * @param provider - OAuth provider
 * @param state - Button state
 * @returns CSS variable string
 *
 * @example
 * ```tsx
 * <div style={{ backgroundColor: getOAuthBrandColorVar('google') }}>
 * ```
 */
export function getOAuthBrandColorVar(provider: OAuthProvider, state: OAuthState = 'default'): string {
  return `var(--brand-${provider}${state !== 'default' ? `-${state}` : ''})`;
}

// ============================================================================
// Social Share Brand Colors
// ============================================================================

/**
 * Get brand color for social share buttons
 *
 * @param platform - Social platform (whatsapp, facebook, twitter, linkedin)
 * @returns Tailwind color class
 *
 * @example
 * ```tsx
 * <button className={`bg-${getShareBrandColor('whatsapp')}`}>
 *   Share on WhatsApp
 * </button>
 * ```
 */
export function getShareBrandColor(platform: SharePlatform): string {
  const colorMap: Record<SharePlatform, string> = {
    whatsapp: 'brand-whatsapp',
    facebook: 'brand-facebook',
    twitter: 'brand-twitter',
    linkedin: 'brand-linkedin',
    telegram: 'brand-telegram',
  };

  return colorMap[platform];
}

/**
 * Get CSS variable reference for share brand colors (for inline styles)
 */
export function getShareBrandColorVar(platform: SharePlatform): string {
  return `var(--brand-${platform})`;
}

// ============================================================================
// Avatar Colors
// ============================================================================

/**
 * Get Tailwind background class for avatar character
 *
 * @param character - Avatar character name
 * @returns Tailwind bg class
 *
 * @example
 * ```tsx
 * <div className={getAvatarColor('broccoli-bob')}>🥦</div>
 * // Outputs: 'bg-avatar-10'
 * ```
 */
export function getAvatarColor(character: AvatarCharacter): string {
  const characterMap: Record<AvatarCharacter, string> = {
    'broccoli-bob': 'bg-avatar-10',
    'drippy-drop': 'bg-avatar-2',
    'sunny-steve': 'bg-avatar-9',
    'cloudy-carl': 'bg-avatar-8',
    'octo-otto': 'bg-avatar-7',
    'pizza-pete': 'bg-avatar-1',
    'prickly-pat': 'bg-avatar-12',
    'melon-molly': 'bg-avatar-11',
    'avo-alex': 'bg-avatar-5',
    'frosty-frank': 'bg-avatar-3',
    'flaky-fred': 'bg-avatar-5',
    'eggy-ed': 'bg-avatar-6',
    'slimy-sam': 'bg-avatar-12',
    'starry-stella': 'bg-avatar-13',
    'shroom-shelly': 'bg-avatar-15',
    'donut-danny': 'bg-avatar-13',
    'jelly-jen': 'bg-avatar-7',
  };

  return characterMap[character] || 'bg-avatar-1'; // Default fallback
}

/**
 * Get CSS variable reference for avatar colors (for inline styles)
 *
 * @param character - Avatar character name
 * @returns CSS variable string
 *
 * @example
 * ```tsx
 * <div style={{ backgroundColor: getAvatarColorVar('broccoli-bob') }}>🥦</div>
 * ```
 */
export function getAvatarColorVar(character: AvatarCharacter): string {
  const characterMap: Record<AvatarCharacter, string> = {
    'broccoli-bob': 'var(--avatar-10)',
    'drippy-drop': 'var(--avatar-2)',
    'sunny-steve': 'var(--avatar-9)',
    'cloudy-carl': 'var(--avatar-8)',
    'octo-otto': 'var(--avatar-7)',
    'pizza-pete': 'var(--avatar-1)',
    'prickly-pat': 'var(--avatar-12)',
    'melon-molly': 'var(--avatar-11)',
    'avo-alex': 'var(--avatar-5)',
    'frosty-frank': 'var(--avatar-3)',
    'flaky-fred': 'var(--avatar-5)',
    'eggy-ed': 'var(--avatar-6)',
    'slimy-sam': 'var(--avatar-12)',
    'starry-stella': 'var(--avatar-13)',
    'shroom-shelly': 'var(--avatar-15)',
    'donut-danny': 'var(--avatar-13)',
    'jelly-jen': 'var(--avatar-7)',
  };

  return characterMap[character] || 'var(--avatar-1)'; // Default fallback
}

/**
 * Get hex color value for avatar character
 *
 * Use this for contexts requiring hex colors (socket communication, database storage)
 * where CSS variables cannot be resolved.
 *
 * @param character - Avatar character name
 * @returns Hex color string (e.g., '#52B788')
 *
 * @example
 * ```typescript
 * getAvatarColorHex('broccoli-bob') // '#52B788'
 * ```
 */
export function getAvatarColorHex(character: AvatarCharacter): string {
  const characterMap: Record<AvatarCharacter, string> = {
    'broccoli-bob': '#52B788',
    'drippy-drop': '#4ECDC4',
    'sunny-steve': '#F8B739',
    'cloudy-carl': '#85C1E2',
    'octo-otto': '#BB8FCE',
    'pizza-pete': '#FF6B6B',
    'prickly-pat': '#6BCF7F',
    'melon-molly': '#FF8FAB',
    'avo-alex': '#98D8C8',
    'frosty-frank': '#45B7D1',
    'flaky-fred': '#98D8C8',
    'eggy-ed': '#F7DC6F',
    'slimy-sam': '#6BCF7F',
    'starry-stella': '#FFB347',
    'shroom-shelly': '#FF6F61',
    'donut-danny': '#FFB347',
    'jelly-jen': '#BB8FCE',
  };

  return characterMap[character] || '#FF6B6B'; // Default fallback
}

// ============================================================================
// Rank Gradients
// ============================================================================

/**
 * Get gradient background class for rank position (1st/2nd/3rd place)
 *
 * @param rank - Rank position (1, 2, or 3)
 * @returns Tailwind gradient class
 *
 * @example
 * ```tsx
 * <div className={getRankGradient(1)}>🥇 First Place</div>
 * // Outputs: 'bg-gradient-rank-first'
 * ```
 */
export function getRankGradient(rank: RankPosition): string {
  const gradientMap: Record<RankPosition, string> = {
    1: 'bg-gradient-rank-first',
    2: 'bg-gradient-rank-second',
    3: 'bg-gradient-rank-third',
  };

  return gradientMap[rank] || 'bg-gradient-rank-third'; // Default to 3rd
}

// ============================================================================
// Stat Gradients
// ============================================================================

/**
 * Get gradient background class for performance stats
 *
 * @param type - Stat type (positive, negative, neutral)
 * @returns Tailwind gradient class
 *
 * @example
 * ```tsx
 * <div className={getStatGradient('positive')}>↑ +15%</div>
 * // Outputs: 'bg-gradient-stat-positive'
 * ```
 */
export function getStatGradient(type: StatType): string {
  const gradientMap: Record<StatType, string> = {
    positive: 'bg-gradient-stat-positive',
    negative: 'bg-gradient-stat-negative',
    neutral: 'bg-gradient-stat-neutral',
  };

  return gradientMap[type];
}

// ============================================================================
// Semantic Button Utilities
// ============================================================================

/**
 * Get semantic button utility class
 *
 * @param variant - Button variant (primary, secondary, destructive, success)
 * @returns Tailwind utility class
 *
 * @example
 * ```tsx
 * <button className={getButtonTokenClass('primary')}>
 *   Create Game
 * </button>
 * // Outputs: 'btn-token-primary'
 * ```
 */
export function getButtonTokenClass(variant: ButtonVariant): string {
  return `btn-token-${variant}`;
}

// ============================================================================
// Semantic Badge Utilities
// ============================================================================

/**
 * Get semantic badge utility class
 *
 * @param variant - Badge variant (info, warning, error, success)
 * @returns Tailwind utility class
 *
 * @example
 * ```tsx
 * <span className={getBadgeTokenClass('info')}>New</span>
 * // Outputs: 'badge-token-info'
 * ```
 */
export function getBadgeTokenClass(variant: BadgeVariant): string {
  return `badge-token-${variant}`;
}

// ============================================================================
// Color Validation & Migration
// ============================================================================

/**
 * Check if a color value is hardcoded (hex or RGB)
 *
 * Used for identifying colors that should be migrated to design tokens.
 *
 * @param colorValue - Color string to check
 * @returns True if hardcoded, false if using CSS variable or Tailwind class
 *
 * @example
 * ```typescript
 * isHardcodedColor('#FFE135')           // true
 * isHardcodedColor('rgb(255, 225, 53)') // true
 * isHardcodedColor('var(--neo-yellow)') // false
 * isHardcodedColor('bg-neo-yellow')     // false
 * ```
 */
export function isHardcodedColor(colorValue: string): boolean {
  if (!colorValue) return false;

  // Check for hex colors (#FFE135 or #FFF)
  const hexPattern = /^#([0-9A-Fa-f]{3}){1,2}$/;
  if (hexPattern.test(colorValue.trim())) return true;

  // Check for RGB/RGBA colors
  const rgbPattern = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/;
  if (rgbPattern.test(colorValue.trim())) return true;

  // Check for HSL/HSLA colors
  const hslPattern = /^hsla?\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(,\s*[\d.]+)?\s*\)$/;
  if (hslPattern.test(colorValue.trim())) return true;

  return false;
}

/**
 * Suggest design token for hardcoded color value
 *
 * Maps common hardcoded colors to their corresponding design tokens.
 * Used for automated migration suggestions.
 *
 * @param colorValue - Hardcoded color value (hex, RGB, etc.)
 * @returns Suggested design token name or null if no match
 *
 * @example
 * ```typescript
 * suggestDesignToken('#FFE135')  // 'neo-yellow'
 * suggestDesignToken('#4285F4')  // 'brand-google'
 * suggestDesignToken('#25D366')  // 'brand-whatsapp'
 * suggestDesignToken('#unknown') // null
 * ```
 */
export function suggestDesignToken(colorValue: string): string | null {
  if (!colorValue) return null;

  // Normalize color value (uppercase, remove spaces)
  const normalized = colorValue.toUpperCase().replace(/\s/g, '');

  // Neo-Brutalist palette mapping
  const colorMap: Record<string, string> = {
    // Primary Neo colors
    '#FFE135': 'neo-yellow',
    '#FFD000': 'neo-yellow-hover',
    '#FF1493': 'neo-pink',
    '#FF69B4': 'neo-pink-light',
    '#00FFFF': 'neo-cyan',
    '#4DD9D9': 'neo-cyan-muted',
    '#FF3366': 'neo-red',
    '#BFFF00': 'neo-lime',

    // Structural colors
    '#1A1A2E': 'neo-navy',
    '#16213E': 'neo-navy-light',
    '#FFFEF0': 'neo-cream',
    '#2D2D44': 'neo-gray',

    // Deprecated (still mapped for migration)
    '#FF6B35': 'neo-orange (DEPRECATED - use neo-red)',
    '#9333EA': 'neo-purple (DEPRECATED - use neo-pink)',

    // Brand colors - OAuth
    '#4285F4': 'brand-google',
    '#3367D6': 'brand-google-hover',
    '#5865F2': 'brand-discord',
    '#4752C4': 'brand-discord-hover',
    '#000000': 'brand-apple',

    // Brand colors - Social
    '#25D366': 'brand-whatsapp',
    '#1EBE5D': 'brand-whatsapp-hover',
    '#1877F2': 'brand-facebook',
    '#1DA1F2': 'brand-twitter',
    '#0A66C2': 'brand-linkedin',
  };

  // Check direct hex match
  if (colorMap[normalized]) {
    return colorMap[normalized];
  }

  // Convert RGB to hex and check
  const rgbMatch = colorValue.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    const hexFromRgb = '#' + [r, g, b]
      .map(c => parseInt(c).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    if (colorMap[hexFromRgb]) {
      return colorMap[hexFromRgb];
    }
  }

  // No match found
  return null;
}

// ============================================================================
// Exports
// ============================================================================

export const designSystem = {
  // OAuth
  getOAuthBrandColor,
  getOAuthBrandColorVar,

  // Social Share
  getShareBrandColor,
  getShareBrandColorVar,

  // Avatars
  getAvatarColor,
  getAvatarColorVar,
  getAvatarColorHex,

  // Gradients
  getRankGradient,
  getStatGradient,

  // Semantic Utilities
  getButtonTokenClass,
  getBadgeTokenClass,

  // Validation & Migration
  isHardcodedColor,
  suggestDesignToken,
} as const;

export default designSystem;
