/**
 * Centralized Configuration for Multi-Platform Support
 *
 * This module provides a single source of truth for API and Socket URLs,
 * handling the differences between Web (SSR) and Mobile (Static Export) builds.
 *
 * Environment Strategy:
 * - NEXT_PUBLIC_IS_MOBILE=true: Uses hardcoded production URLs for Capacitor mobile app
 * - NEXT_PUBLIC_IS_MOBILE=false/undefined: Uses relative paths or standard env vars for web
 */

// Production backend URL - used by mobile builds
// This should be your Railway production URL
const PRODUCTION_BACKEND_URL = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'https://lexiclash-production.up.railway.app';

// Detect if running in mobile/Capacitor context
export const isMobile = (): boolean => {
  // Check build-time flag
  if (process.env.NEXT_PUBLIC_IS_MOBILE === 'true') {
    return true;
  }

  // Runtime detection for Capacitor
  if (typeof window !== 'undefined') {
    // Check if running in Capacitor native shell
    const isCapacitor = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
    if (isCapacitor) return true;

    // Check for capacitor:// or ionic:// protocol
    if (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:') {
      return true;
    }
  }

  return false;
};

// Detect the current platform
export type Platform = 'web' | 'ios' | 'android';
export const getPlatform = (): Platform => {
  if (typeof window === 'undefined') return 'web';

  const capacitor = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  if (capacitor?.getPlatform) {
    const platform = capacitor.getPlatform();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
  }

  return 'web';
};

/**
 * Get the base URL for API requests
 *
 * - Mobile: Returns the full production backend URL
 * - Web: Returns empty string (relative paths work with SSR)
 */
export const getApiBaseUrl = (): string => {
  if (isMobile()) {
    return PRODUCTION_BACKEND_URL;
  }

  // Web: use environment variable or relative paths
  return process.env.NEXT_PUBLIC_API_URL || '';
};

/**
 * Get the WebSocket URL for Socket.IO connections
 *
 * - Mobile: Returns the full production WebSocket URL
 * - Web: Uses environment variable or derives from current location
 */
export const getSocketUrl = (): string => {
  if (isMobile()) {
    // Mobile always connects to production backend
    return PRODUCTION_BACKEND_URL;
  }

  // Web: check environment variable first
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  // Derive from current location in browser
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }

  // Fallback for SSR/development
  return 'http://localhost:3001';
};

/**
 * Construct a full API URL from a relative path
 *
 * @param path - The API path (e.g., '/api/leaderboard')
 * @returns Full URL for mobile, relative path for web
 */
export const apiUrl = (path: string): string => {
  const base = getApiBaseUrl();

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${base}${normalizedPath}`;
};

/**
 * Configuration object for easy access
 */
export const config = {
  // URLs
  apiBaseUrl: getApiBaseUrl(),
  socketUrl: getSocketUrl(),
  productionUrl: PRODUCTION_BACKEND_URL,

  // Platform detection
  isMobile: isMobile(),
  platform: typeof window !== 'undefined' ? getPlatform() : 'web',

  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Supabase (these are always the same regardless of platform)
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};

// Export as default for convenience
export default config;
