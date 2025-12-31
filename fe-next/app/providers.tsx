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
import { SocketProvider } from '@/utils/SocketContext';
import { GameStateProvider } from '@/contexts/GameStateContext';
import { SocketEventBusProvider } from '@/contexts/SocketEventBusContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { initUtmCapture } from '@/utils/utmCapture';
import { composeProviders } from '@/utils/composeProviders';
import { linkLogRocketSession } from '@/utils/sentry';
import { initSessionTracking } from '@/utils/sessionTracking';
import WinnerOnboardingWrapper from './components/WinnerOnboardingWrapper';

import type { Language } from '@/shared/types/game';

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

// Game-related providers (Achievements + Auth + Announcer + Accessibility)
const GameProviders = composeProviders([
    [GameAnnouncerProvider as React.ComponentType<{ children: ReactNode }>, {}],
    [AchievementQueueProvider as React.ComponentType<{ children: ReactNode }>, {}],
    [AuthProvider as React.ComponentType<{ children: ReactNode }>, {}],
    [AccessibilityProvider as React.ComponentType<{ children: ReactNode }>, {}],
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
                        <SocketProvider>
                            <GameStateProvider>
                                <SocketEventBusProvider>
                                    <AudioProviders>
                                        <GameProviders>
                                            {children}
                                        </GameProviders>
                                    </AudioProviders>
                                </SocketEventBusProvider>
                            </GameStateProvider>
                        </SocketProvider>
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
                <WinnerOnboardingWrapper />
            </>
        </ErrorBoundary>
    );
}
