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
      // NativeAppProvider calls SplashScreen.hide() as soon as React mounts
      // the first frame, so the splash disappears the instant the UI is ready.
      // The 5s auto-hide is a safety net: if the WebView fails to bootstrap,
      // users still see *something* (the error.html fallback) instead of an
      // infinite splash. Previously this was 2s, which hid the splash before
      // the remote WebView had finished the /→/{locale} redirect on slow
      // connections, leaving a black screen.
      launchShowDuration: 5000,
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
      // NOTE: this `appId` block is documentation only — the @capacitor-community/admob
      // plugin reads the runtime App ID from AndroidManifest.xml (`com.google.android.gms.ads.APPLICATION_ID`)
      // and from iOS Info.plist (`GADApplicationIdentifier`), NOT from this config.
      // Keep these values in sync with android/app/build.gradle (`ADMOB_APP_ID`)
      // and the iOS Info.plist so future devs know which IDs are actually live.
      // Previously the Android value here was `~3347511713`, which is a Google sample-publisher
      // suffix — an obvious copy/paste error that caused confusion when ads stopped serving.
      appId: {
        ios: process.env.ADMOB_APP_ID_IOS ?? 'ca-app-pub-1896836706464880~1458002511',
        android: process.env.ADMOB_APP_ID_ANDROID ?? 'ca-app-pub-1896836706464880~7614847892',
      },
      // Only enable AdMob test mode when explicitly opted-in via env var.
      // Auto-enabling from NODE_ENV caused every non-production build (including
      // any build where NODE_ENV is unset) to serve Google test ads.
      initializeForTesting: process.env.ADMOB_TEST_MODE === 'true',
    },
    SocialLogin: {
      // Disable Facebook & Twitter — we only use Google (+ Apple on iOS).
      // Plugin's capacitor:sync:before hook reads this to write
      // android/gradle.properties (`socialLogin.facebook.include=false`)
      // and the iOS podspec (comments out FBSDK pods).
      // Without this, the FB SDK is on classpath and its
      // FacebookInitProvider ContentProvider auto-inits before
      // Application.onCreate, crashing the app because no
      // facebook_app_id meta-data exists in AndroidManifest.
      providers: {
        google: true,        // implementation
        apple: true,         // implementation (iOS-only — plugin no-ops on Android)
        facebook: false,     // compileOnly → stub source set, no SDK
        twitter: false,      // compileOnly
      },
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
    webContentsDebuggingEnabled: true, // TEMP: allow chrome://inspect on internal-track builds to diagnose the home empty-section; revert to `isDev` after.
    backgroundColor: '#1a1a2e',
    loggingBehavior: isDev ? 'debug' : 'none',
    // CRITICAL: Do NOT add useLegacyBridge or use CapacitorHttp
  },

  loggingBehavior: isDev ? 'debug' : 'none',
};

export default config;
