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

if (typeof window !== 'undefined') {
    LogRocket.init('ioiov9/lexiclash');
}

export function Providers({ children, lang }) {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <MusicProvider>
                    <SoundEffectsProvider>
                        <AchievementQueueProvider>
                            <AuthProvider>
                                <LanguageProvider initialLanguage={lang}>
                                    {children}
                                </LanguageProvider>
                            </AuthProvider>
                        </AchievementQueueProvider>
                    </SoundEffectsProvider>
                </MusicProvider>
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
