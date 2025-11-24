'use client';

import { ThemeProvider } from '@/utils/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';

export function Providers({ children, lang }) {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <LanguageProvider initialLanguage={lang}>
                    {children}
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
                </LanguageProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}
