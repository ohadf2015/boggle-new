'use client';

/**
 * Minimal provider stack for locale-root landing (`/en`, `/he`, …).
 *
 * EssentialProviders pulls Auth/Music/CrazyGames/AdMob/PostHog/LogRocket and
 * ~2.7MB of first-paint JS. Lighthouse /en only needs theme + i18n + a query
 * client (LandingView's useEvents). Auth/music hooks already no-op outside
 * their providers (useAuth default, useCrazyGames noop; useMusic is patched
 * to match). Navigating off landing mounts EssentialProviders once.
 */

import { ReactNode } from 'react';
import { ThemeProvider } from '@/utils/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { RadixDirectionProvider } from '@/components/providers/RadixDirectionProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { NavigationProvider } from '@/contexts/NavigationContext';
import type { TranslationData } from '@/translations/loadTranslation';
import type { Language } from '@/shared/types/game';

interface LandingSlimProvidersProps {
  children: ReactNode;
  lang: Language;
  initialTranslations?: TranslationData;
}

export function LandingSlimProviders({
  children,
  lang,
  initialTranslations,
}: LandingSlimProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <LanguageProvider initialLanguage={lang} initialTranslations={initialTranslations}>
            <RadixDirectionProvider>
              <NavigationProvider>{children}</NavigationProvider>
            </RadixDirectionProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
