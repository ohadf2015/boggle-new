'use client';

import React, { useEffect, ReactNode } from 'react';
import { ThemeProvider } from '@/utils/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { MusicProvider } from '@/contexts/MusicContext';
import { SoundEffectsProvider } from '@/contexts/SoundEffectsContext';
import { AchievementQueueProvider } from '@/components/achievements';
import { GameAnnouncerProvider } from '@/components/GameAnnouncer';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { CoinProvider } from '@/contexts/CoinContext';
import { MotionConfigProvider } from '@/components/motion/MotionConfigProvider';
import { CrazyGamesProvider } from '@/components/CrazyGamesSDK';
import { IMAVideoAdsProvider } from '@/components/ads/IMAVideoAdsProvider';
import { GoogleAdsProvider } from '@/components/ads/GoogleAdsProvider';
import { SocketProvider } from '@/utils/SocketContext';
import { GameStateProvider } from '@/contexts/GameStateContext';
import { SocketEventBusProvider } from '@/contexts/SocketEventBusContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { initUtmCapture } from '@/utils/utmCapture';
import { composeProviders } from '@/utils/composeProviders';
import { linkLogRocketSession } from '@/utils/sentry';
import { initSessionTracking } from '@/utils/sessionTracking';
import { initConsoleOverride } from '@/utils/consoleOverride';
import WinnerOnboardingWrapper from './components/WinnerOnboardingWrapper';

import type { Language } from '@/shared/types/game';

// Initialize React Scan for development performance monitoring
let reactScanInitialized = false;
const initReactScan = async () => {
    if (reactScanInitialized) return;
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV !== 'development') return;

    reactScanInitialized = true;
    const { scan } = await import('react-scan');
    scan({
        enabled: true,
        log: true, // Log render info to console
    });
};

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    initReactScan();
}

interface ProvidersProps {
  children: ReactNode;
  lang: Language;
}

// Initialize UTM capture immediately on module load
// This MUST happen before React hydration to capture UTM params before any navigation
let utmCaptureInitialized = false;
const initUtm = () => {
    if (utmCaptureInitialized) return;
    if (typeof window === 'undefined') return;

    utmCaptureInitialized = true;
    initUtmCapture();
};

// Call immediately at module level - this runs before any React component renders
// Critical for capturing UTM params from share links before they might be lost
if (typeof window !== 'undefined') {
    initUtm();
}

// Initialize console override immediately in production
// This captures all console.error and console.warn calls and sends them to Sentry
// while preventing them from appearing in the browser console
let consoleOverrideInitialized = false;
const initConsole = () => {
    if (consoleOverrideInitialized) return;
    if (typeof window === 'undefined') return;

    consoleOverrideInitialized = true;
    initConsoleOverride();
};

// Call immediately at module level - this runs before any React component renders
// Critical for capturing all console errors/warnings from the very start
if (typeof window !== 'undefined') {
    initConsole();
}

// Suppress benign ResizeObserver errors
// This error occurs when ResizeObserver can't deliver all notifications in a single frame
// It's a browser warning, not an actual bug - common in React apps with responsive layouts
// Already ignored in Sentry (sentry.client.config.ts) but still appears in browser console
let resizeObserverHandlerInitialized = false;
const initResizeObserverErrorHandler = () => {
    if (resizeObserverHandlerInitialized) return;
    if (typeof window === 'undefined') return;

    resizeObserverHandlerInitialized = true;
    window.addEventListener('error', (event) => {
        if (event.message?.includes('ResizeObserver loop')) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }
    });
};

if (typeof window !== 'undefined') {
    initResizeObserverErrorHandler();
}

// Lazy load LogRocket after user interaction to save ~100KB on initial load
let logRocketInitialized = false;
const initLogRocket = () => {
    if (logRocketInitialized) return;
    if (typeof window === 'undefined' || window.location.hostname === 'localhost') return;

    logRocketInitialized = true;
    import('logrocket').then(({ default: LogRocket }) => {
        LogRocket.init('ioiov9/lexiclash');
        // Link LogRocket session to Sentry for error replay correlation
        linkLogRocketSession();
    });
};

// Composed provider groups for cleaner organization
// Audio providers (Music + Sound Effects)
const AudioProviders = composeProviders([
    [MusicProvider as React.ComponentType<{ children: ReactNode }>, {}],
    [SoundEffectsProvider as React.ComponentType<{ children: ReactNode }>, {}],
]);

// Game-related providers (Achievements + Auth + Coins + Announcer + Accessibility + MotionConfig)
// Note: CoinProvider must come AFTER AuthProvider so it can access auth context
// Note: MotionConfigProvider must come AFTER AccessibilityProvider so it can consume shouldReduceMotion
const GameProviders = composeProviders([
    [GameAnnouncerProvider as React.ComponentType<{ children: ReactNode }>, {}],
    [AchievementQueueProvider as React.ComponentType<{ children: ReactNode }>, {}],
    [AuthProvider as React.ComponentType<{ children: ReactNode }>, {}],
    [CoinProvider as React.ComponentType<{ children: ReactNode }>, {}],
    [AccessibilityProvider as React.ComponentType<{ children: ReactNode }>, {}],
    [MotionConfigProvider as React.ComponentType<{ children: ReactNode }>, {}],
]);

export function Providers({ children, lang }: ProvidersProps) {
    // Note: UTM capture now happens at module load (above) for earlier execution
    // The useEffect below is kept as a safety fallback in case module-level execution fails

    // Initialize session tracking for analytics
    useEffect(() => {
        initSessionTracking();
    }, []);

    // Defer LogRocket initialization for slow connections
    // Load after 3 seconds or on first user interaction, whichever comes first
    useEffect(() => {
        const timeoutId = setTimeout(initLogRocket, 3000);

        const events = ['click', 'touchstart', 'keydown'] as const;
        const handleInteraction = () => {
            clearTimeout(timeoutId);
            initLogRocket();
            events.forEach(event => {
                window.removeEventListener(event, handleInteraction);
            });
        };

        events.forEach(event => {
            window.addEventListener(event, handleInteraction, { once: true, passive: true });
        });

        return () => {
            clearTimeout(timeoutId);
            events.forEach(event => {
                window.removeEventListener(event, handleInteraction);
            });
        };
    }, []);

    return (
        <ErrorBoundary>
            <>
                <ThemeProvider>
                    <LanguageProvider initialLanguage={lang}>
                        <CrazyGamesProvider>
                            <IMAVideoAdsProvider>
                                <GoogleAdsProvider>
                                    <SocketProvider>
                                <GameStateProvider>
                                    <SocketEventBusProvider>
                                        <AudioProviders>
                                            <GameProviders>
                                                <NavigationProvider>
                                                    {children}
                                                    <WinnerOnboardingWrapper />
                                                </NavigationProvider>
                                            </GameProviders>
                                        </AudioProviders>
                                    </SocketEventBusProvider>
                                </GameStateProvider>
                                </SocketProvider>
                                </GoogleAdsProvider>
                            </IMAVideoAdsProvider>
                        </CrazyGamesProvider>
                    </LanguageProvider>
                </ThemeProvider>
                <Toaster
                    position="top-center"
                    containerStyle={{
                        pointerEvents: 'none',
                    }}
                    toastOptions={{
                        duration: 2000,
                        style: {
                            background: '#363636',
                            color: '#fff',
                            pointerEvents: 'auto',
                        },
                    }}
                />
            </>
        </ErrorBoundary>
    );
}
