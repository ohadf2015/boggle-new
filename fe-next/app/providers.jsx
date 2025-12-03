'use client';

import { useEffect } from 'react';
import { ThemeProvider } from '@/utils/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { MusicProvider } from '@/contexts/MusicContext';
import { SoundEffectsProvider } from '@/contexts/SoundEffectsContext';
import { AchievementQueueProvider } from '@/components/achievements';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { initUtmCapture } from '@/utils/utmCapture';

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
    });
};

export function Providers({ children, lang }) {
    // Note: UTM capture now happens at module load (above) for earlier execution
    // The useEffect below is kept as a safety fallback in case module-level execution fails

    // Defer LogRocket initialization for slow connections
    // Load after 3 seconds or on first user interaction, whichever comes first
    useEffect(() => {
        const timeoutId = setTimeout(initLogRocket, 3000);

        const events = ['click', 'touchstart', 'keydown'];
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
                        <MusicProvider>
                            <SoundEffectsProvider>
                                <AchievementQueueProvider>
                                    <AuthProvider>
                                        {children}
                                    </AuthProvider>
                                </AchievementQueueProvider>
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
            </>
        </ErrorBoundary>
    );
}
