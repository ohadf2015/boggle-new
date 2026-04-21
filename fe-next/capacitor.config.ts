import type { CapacitorConfig } from '@capacitor/cli';

// Development mode: Set CAPACITOR_DEV_URL env var to local IP (e.g., http://192.168.1.100:3000)
const isDev = process.env.NODE_ENV === 'development';
const devUrl = process.env.CAPACITOR_DEV_URL;

const config: CapacitorConfig = {
  appId: 'live.lexiclash.app',
  appName: 'LexiClash',
  webDir: 'capacitor-assets', // Minimal fallback — actual app loads from server.url

  server: isDev && devUrl ? {
    // Development: Load from local dev server
    url: devUrl,
    cleartext: true, // Allow HTTP in dev
  } : {
    // Production: Load from hosted webapp
    url: 'https://www.lexiclash.live',
    cleartext: false, // HTTPS only in production
    errorPath: 'error.html', // Offline/network fallback — prevents blank-screen "crash"
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
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#BFFF00', // neo-lime (primary brand color)
      sound: 'default',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    AdMob: {
      appId: {
        ios: process.env.ADMOB_APP_ID_IOS ?? 'ca-app-pub-3940256099942544~1458002511',
        android: process.env.ADMOB_APP_ID_ANDROID ?? 'ca-app-pub-3940256099942544~3347511713',
      },
      initializeForTesting: process.env.NODE_ENV !== 'production',
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
    webContentsDebuggingEnabled: isDev,
    backgroundColor: '#1a1a2e',
    loggingBehavior: isDev ? 'debug' : 'none',
    // CRITICAL: Do NOT add useLegacyBridge or use CapacitorHttp
  },

  loggingBehavior: isDev ? 'debug' : 'none',
};

export default config;
