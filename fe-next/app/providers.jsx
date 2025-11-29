'use client';

import { ThemeProvider } from '@/utils/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { MusicProvider } from '@/contexts/MusicContext';
import { SoundEffectsProvider } from '@/contexts/SoundEffectsContext';
import { AchievementQueueProvider } from '@/components/achievements';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import LogRocket from 'logrocket';

if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    LogRocket.init('ioiov9/lexiclash');
}

export function Providers({ children, lang }) {
    return (
        <ErrorBoundary>
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
                toastOptions={{
                    duration: 2000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                }}
            />
        </ErrorBoundary>
    );
}
