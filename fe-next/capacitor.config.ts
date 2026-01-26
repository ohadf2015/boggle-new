import type { CapacitorConfig } from '@capacitor/cli';

// Development mode: Set CAPACITOR_DEV_URL env var to local IP (e.g., http://192.168.1.100:3000)
const isDev = process.env.NODE_ENV === 'development';
const devUrl = process.env.CAPACITOR_DEV_URL;

const config: CapacitorConfig = {
  appId: 'live.lexiclash.app',
  appName: 'LexiClash',
  webDir: 'public', // Minimal fallback assets only (not used with server.url)

  server: isDev && devUrl ? {
    // Development: Load from local dev server
    url: devUrl,
    cleartext: true, // Allow HTTP in dev
  } : {
    // Production: Load from hosted webapp
    url: 'https://www.lexiclash.live',
    cleartext: false, // HTTPS only in production
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e', // neo-navy from design system
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark', // Light text on dark background
      backgroundColor: '#1a1a2e',
    },
  },

  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'lexiclash', // Custom URL scheme for deep links
    allowsLinkPreview: false,
    scrollEnabled: true,
  },

  android: {
    allowMixedContent: false, // Don't allow HTTP in production WebView
    captureInput: true,
    webContentsDebuggingEnabled: isDev, // Debug only in development
    backgroundColor: '#1a1a2e',
    // CRITICAL: Do NOT add useLegacyBridge or use CapacitorHttp
  },
};

export default config;
