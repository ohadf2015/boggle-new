import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor Configuration for LexiClash Mobile App
 *
 * This configuration enables the mobile build to work as a static export
 * that connects to the live Railway backend for data and sockets.
 */
const config: CapacitorConfig = {
  appId: 'com.lexiclash.app',
  appName: 'LexiClash',
  webDir: 'out', // Next.js static export directory

  // Server configuration
  server: {
    // For production, the static files are bundled in the app
    // API calls and WebSocket connections go to the production backend
    // configured via NEXT_PUBLIC_PRODUCTION_URL environment variable

    // Enable cleartext traffic for local development (disable in production)
    cleartext: process.env.NODE_ENV !== 'production',

    // Allow navigation to external URLs (needed for OAuth)
    allowNavigation: [
      'accounts.google.com',
      'discord.com',
      '*.supabase.co',
    ],
  },

  // iOS-specific configuration
  ios: {
    // Content inset behavior for safe areas
    contentInset: 'automatic',
    // Allow mixed content (needed for some OAuth flows)
    allowsLinkPreview: true,
    // Scroll behavior
    scrollEnabled: true,
    // Preferred status bar style
    preferredContentMode: 'mobile',
  },

  // Android-specific configuration
  android: {
    // Allow mixed content
    allowMixedContent: true,
    // Capture all links within the app
    captureInput: true,
    // Use a WebView that supports modern features
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
  },

  // Plugin configurations
  plugins: {
    // Splash screen configuration
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#111827', // Dark background matching the app
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    // Status bar configuration
    StatusBar: {
      style: 'dark', // Dark content on light background
      backgroundColor: '#111827',
    },

    // Keyboard configuration
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },

    // App lifecycle
    App: {
      // Handle deep links if needed in the future
    },

    // Haptic feedback for game interactions
    Haptics: {},
  },
};

export default config;
