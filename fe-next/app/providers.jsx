'use client';

import { ThemeProvider } from '@/utils/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { MusicProvider } from '@/contexts/MusicContext';
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
                    <AuthProvider>
                        <LanguageProvider initialLanguage={lang}>
                            {children}
                        </LanguageProvider>
                    </AuthProvider>
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
