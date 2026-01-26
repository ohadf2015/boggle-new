'use client';

/**
 * Essential Providers - Loaded on ALL pages
 * Keep this MINIMAL to optimize landing page performance
 *
 * ONLY include providers that are needed on EVERY page
 */

import React, { useEffect, ReactNode } from 'react';
import { ThemeProvider } from '@/utils/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { MotionConfigProvider } from '@/components/motion/MotionConfigProvider';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { MusicProvider } from '@/contexts/MusicContext';
import { SoundEffectsProvider } from '@/contexts/SoundEffectsContext';
import { HapticsProvider } from '@/contexts/HapticsContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { initUtmCapture } from '@/utils/utmCapture';
import { initConsoleOverride } from '@/utils/consoleOverride';
import { linkLogRocketSession } from '@/utils/sentry';
import { initSessionTracking } from '@/utils/sessionTracking';

import type { Language } from '@/shared/types/game';

interface EssentialProvidersProps {
  children: ReactNode;
  lang: Language;
}

// Initialize UTM capture immediately on module load
let utmCaptureInitialized = false;
const initUtm = () => {
    if (utmCaptureInitialized) return;
    if (typeof window === 'undefined') return;

    utmCaptureInitialized = true;
    initUtmCapture();
};

if (typeof window !== 'undefined') {
    initUtm();
}

// Initialize console override immediately in production
let consoleOverrideInitialized = false;
const initConsole = () => {
    if (consoleOverrideInitialized) return;
    if (typeof window === 'undefined') return;

    consoleOverrideInitialized = true;
    initConsoleOverride();
};

if (typeof window !== 'undefined') {
    initConsole();
}

// Suppress benign ResizeObserver errors
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

// Lazy load LogRocket after user interaction
let logRocketInitialized = false;
const initLogRocket = () => {
    if (logRocketInitialized) return;
    if (typeof window === 'undefined' || window.location.hostname === 'localhost') return;

    logRocketInitialized = true;
    import('logrocket').then(({ default: LogRocket }) => {
        LogRocket.init('ioiov9/lexiclash');
        linkLogRocketSession();
    });
};

/**
 * EssentialProviders - Minimal provider stack for landing page
 * Loads ~50KB of essential JavaScript
 */
export function EssentialProviders({ children, lang }: EssentialProvidersProps) {
    // Initialize session tracking for analytics
    useEffect(() => {
        initSessionTracking();
    }, []);

    // Defer LogRocket initialization
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
            <ThemeProvider>
                <LanguageProvider initialLanguage={lang}>
                    <MusicProvider>
                        <SoundEffectsProvider>
                            <HapticsProvider>
                                <AccessibilityProvider>
                                    <MotionConfigProvider>
                                        <NavigationProvider>
                                            {children}
                                        </NavigationProvider>
                                    </MotionConfigProvider>
                                </AccessibilityProvider>
                            </HapticsProvider>
                        </SoundEffectsProvider>
                    </MusicProvider>
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
        </ErrorBoundary>
    );
}
