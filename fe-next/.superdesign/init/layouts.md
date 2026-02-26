# LexiClash Layouts

## Overview
Layout components for app structure, navigation, and game screens.
Neo-Brutalist dark-only design with RTL support, safe area handling, and responsive breakpoints.

---

## Root Layout
**Path:** `app/layout.tsx`

Pass-through layout that imports globals.css and sets base metadata.

```tsx
import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const isPreviewEnvironment = process.env.NEXT_PUBLIC_IS_PREVIEW === 'true' ||
    process.env.RAILWAY_ENVIRONMENT_NAME?.startsWith('pr-');

export const metadata: Metadata = {
    metadataBase: new URL('https://www.lexiclash.live'),
    title: {
        default: 'LexiClash - Real-Time Multiplayer Word Strategy Game',
        template: '%s | LexiClash',
    },
    description: 'Compete in real-time word battles against friends...',
    robots: isPreviewEnvironment ? { index: false, follow: false } : { index: true, follow: true },
    icons: { icon: '/icon-48.png', shortcut: '/favicon.ico', apple: '/apple-touch-icon.png' },
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
    return children;
}
```

---

## Locale Layout (Main Shell)
**Path:** `app/[locale]/layout.tsx` (767 lines)

The primary application shell. Handles locale routing, SEO, fonts, providers, and global navigation.

### Key Features
- 5 locales: en, he, sv, ja, es (RTL for Hebrew)
- Fredoka (display) + Rubik (body) fonts via next/font
- JSON-LD structured data (WebApplication, Organization, FAQ, HowTo, Event)
- ConditionalProviders wraps all children
- GlobalBottomNav (mobile) + AutoHideFooter (desktop)
- Skip-to-content accessibility link
- Toast container, PWA install prompt, version checker

### Static Params
```tsx
export function generateStaticParams() {
    return [
        { locale: 'en' },
        { locale: 'he' },
        { locale: 'sv' },
        { locale: 'ja' },
        { locale: 'es' },
    ];
}
```

### Structure
```tsx
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
    const { locale } = await params;
    const validLocale = (locale as Locale) || 'he';
    const dir = translations[validLocale]?.direction || 'rtl';

    return (
        <html lang={validLocale} dir={dir} className={`dark ${fredoka.variable} ${rubik.variable}`}>
            <head>
                <meta charSet="utf-8" />
                <link rel="preconnect" href="https://hdtmpkicuxvtmvrmtybx.supabase.co" />
                <link rel="preload" as="image" href="/mascot/main-nobg.gif" type="image/gif" fetchPriority="high" />
                {/* PNG icons, SVG favicon, Apple touch icons */}
                <link rel="manifest" href="/manifest.json" />
            </head>
            <body className="antialiased screen-fit">
                <a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>
                <GoogleAnalytics />
                <GoogleAdSense />
                <CrazyGamesScript />
                <WebVitalsReporter />
                <ServiceWorkerRegistration />
                <AnimationsLoader />
                <DeepLinkHandler />
                <NativeOAuthInitializer />
                <ConditionalProviders lang={validLocale}>
                    <VersionChecker />
                    <div className="flex-1 flex flex-col min-h-0 relative [overflow-x:clip]">
                        <main id="main-content" className="relative z-10 overflow-auto main-content-safe min-h-0 flex-1" tabIndex={-1}>
                            {children}
                        </main>
                        <AutoHideFooter className="hidden sm:block relative z-0 flex-shrink-0" />
                        <GlobalBottomNav />
                    </div>
                    <PWAInstallPrompt />
                    <EmailCaptureModal />
                    <NewYearCountdown />
                    <ToastContainer position="bottom-right" />
                </ConditionalProviders>
            </body>
        </html>
    );
}
```

---

## AutoHideHeader
**Path:** `components/AutoHideHeader.tsx`

Header wrapper that hides in TV fullscreen mode.

```tsx
'use client';

import Header from './Header';
import { useTvFullscreenListener } from '@/hooks/useTvFullscreenListener';

interface AutoHideHeaderProps {
  className?: string;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export function AutoHideHeader({ className, onVisibilityChange }: AutoHideHeaderProps) {
  const isTvFullscreen = useTvFullscreenListener();

  if (isTvFullscreen) {
    if (onVisibilityChange) onVisibilityChange(false);
    return null;
  }

  if (onVisibilityChange) onVisibilityChange(true);
  return <Header className={className} />;
}

export default AutoHideHeader;
```

---

## GlobalBottomNav
**Path:** `components/GlobalBottomNav.tsx` (283 lines)

Mobile-only bottom navigation bar with 4 tabs: Home, Play, Brain, Profile.

### Key Features
- Fixed bottom, z-[80], hidden on sm+ breakpoint
- Active state with color-coded highlights (yellow/orange/purple/cyan)
- Auto-hides during gameplay (via NavigationContext.isInGame)
- Hides on paths with own nav: /singleplayer, /daily, /adventure
- Auth gating: Brain and Profile tabs show AuthModal if unauthenticated
- Safe area support for iOS home indicator
- WCAG touch targets: min-w-[64px] min-h-[48px]

```tsx
'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Home, Swords, Brain, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useSafeArea } from '../hooks/useSafeArea';

const AuthModal = dynamic(() => import('./auth/AuthModal'), { ssr: false });

export const GlobalBottomNav = memo(function GlobalBottomNav() {
    const { t, language } = useLanguage();
    const { isInGame } = useNavigation();
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const safeArea = useSafeArea();
    const [showAuthModal, setShowAuthModal] = useState(false);

    const activeTab = useMemo(() => {
        const cleanPath = pathname.replace(`/${language}`, '');
        if (cleanPath === '' || cleanPath === '/') return 'home';
        if (cleanPath.startsWith('/multiplayer')) return 'play';
        if (cleanPath.startsWith('/brain')) return 'brain';
        if (cleanPath.startsWith('/profile')) return 'profile';
        return 'home';
    }, [pathname, language]);

    const shouldHideOnCurrentPath = useMemo(() => {
        const cleanPath = pathname.replace(`/${language}`, '');
        const pathsWithOwnNav = ['/singleplayer', '/daily', '/adventure'];
        return pathsWithOwnNav.some(path => cleanPath.startsWith(path));
    }, [pathname, language]);

    if (isInGame || shouldHideOnCurrentPath) return null;

    return (
        <nav
            className={cn(
                "fixed bottom-0 left-0 right-0 z-[80]",
                "bg-neo-navy border-t-3 border-neo-black",
                "shadow-[0_-4px_0_0_rgba(0,0,0,1)]",
                "sm:hidden",
            )}
            style={{ paddingBottom: safeArea.bottom > 0 ? `${safeArea.bottom}px` : undefined }}
            aria-label={t('nav.bottomNavigation') || 'Bottom navigation'}
        >
            <div className="flex items-center justify-around h-16">
                {/* Home Tab - neo-yellow active */}
                <button onClick={navigateToHome} className={cn(
                    "flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-4 py-2",
                    activeTab === 'home' ? "text-neo-yellow" : "text-neo-white/60"
                )}>
                    <Home className={cn("w-6 h-6 mb-1", activeTab === 'home' && "animate-neo-pop")} />
                    <span className="text-[10px] font-bold uppercase">{t('nav.home')}</span>
                    {activeTab === 'home' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-neo-yellow rounded-b-full" />}
                </button>

                {/* Play Tab - neo-orange active */}
                {/* Brain Tab - neo-purple active, auth-gated */}
                {/* Profile Tab - neo-cyan active, auth-gated */}
            </div>
            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </nav>
    );
});
```

---

## PageLayout
**Path:** `components/layout/PageLayout.tsx`

Unified page wrapper with auto-hide header, pull-to-refresh, max-width/padding options.

```tsx
'use client';

import React from 'react';
import AutoHideHeader from '@/components/AutoHideHeader';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useTheme } from '@/utils/ThemeContext';
import { usePullToRefresh, type PullToRefreshOptions } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  showHeader?: boolean;        // default: true
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full'; // default: '4xl'
  padding?: 'none' | 'sm' | 'md' | 'lg'; // default: 'md'
  pullThreshold?: number;      // default: 60
  forceDarkMode?: boolean;
  bottomNavAware?: boolean;    // default: true
  fullHeight?: boolean;        // default: false
}

const maxWidthClasses = {
  sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl',
  '2xl': 'max-w-2xl', '4xl': 'max-w-4xl', full: 'max-w-full',
};

const paddingClasses = {
  none: '', sm: 'px-2 py-4', md: 'px-4 py-6', lg: 'px-6 py-8',
};

export function PageLayout({
  children, onRefresh, showHeader = true, className,
  maxWidth = '4xl', padding = 'md', pullThreshold = 60,
  forceDarkMode, bottomNavAware = true, fullHeight = false,
}: PageLayoutProps) {
  const { theme } = useTheme();
  const isDarkMode = forceDarkMode ?? theme === 'dark';

  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh: onRefresh || (async () => {}),
    threshold: pullThreshold,
    enabled: !!onRefresh,
  });

  return (
    <div
      className={cn(
        'flex flex-col relative main-content-safe',
        fullHeight ? 'h-full overflow-hidden' : 'min-h-full',
        isDarkMode ? 'bg-neo-navy' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50',
        className
      )}
      {...(onRefresh ? pullToRefreshHandlers : {})}
    >
      {onRefresh && <PullToRefreshIndicator pullDistance={pullState.pullDistance} isRefreshing={pullState.isRefreshing} threshold={pullThreshold} />}
      {showHeader && <AutoHideHeader />}
      <div className={cn('flex-1 mx-auto w-full', fullHeight && 'min-h-0', bottomNavAware && 'page-content-safe pb-16 sm:pb-0', maxWidthClasses[maxWidth], paddingClasses[padding])}>
        {children}
      </div>
    </div>
  );
}
```

---

## SafeAreaLayout
**Path:** `components/layout/SafeAreaLayout.tsx`

Safe area layout handling header/footer spacing with CSS custom properties for iOS devices.

### Sub-components
- **ContentContainer** - Centers content with max-width and padding
- **ScrollableContent** - Scrollable area with touch optimization

```tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SafeAreaLayoutProps {
  children: React.ReactNode;
  className?: string;
  headerSpacing?: boolean;   // default: false
  footerSpacing?: boolean;   // default: true
  fullHeight?: boolean;
  minHeight?: boolean;       // default: true
  topPadding?: boolean;
  bottomPadding?: boolean;
}

export function SafeAreaLayout({
  children, className, headerSpacing = false, footerSpacing = true,
  fullHeight = false, minHeight = true, topPadding = false, bottomPadding = false,
}: SafeAreaLayoutProps) {
  return (
    <div className={cn(
      'relative w-full',
      fullHeight && 'h-full',
      minHeight && !fullHeight && 'min-h-full',
      headerSpacing && [
        'pt-[calc(var(--header-height-mobile)+8px)]',
        'sm:pt-[calc(var(--header-height-tablet)+12px)]',
        'lg:pt-0',
      ],
      footerSpacing && [
        'pb-[var(--mobile-bottom-safe)]',
        'sm:pb-[calc(var(--footer-height)+env(safe-area-inset-bottom,0px))]',
      ],
      topPadding && 'pt-4 sm:pt-6 lg:pt-8',
      bottomPadding && 'pb-4 sm:pb-6 lg:pb-8',
      className
    )}>
      {children}
    </div>
  );
}

export function ContentContainer({ children, className, maxWidth = '4xl', padding = 'md' }: ContentContainerProps) {
  return (
    <div className={cn('mx-auto w-full', maxWidthClasses[maxWidth], paddingClasses[padding], className)}>
      {children}
    </div>
  );
}

export function ScrollableContent({ children, className }: ScrollableContentProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto overscroll-contain', '-webkit-overflow-scrolling-touch', className)}>
      {children}
    </div>
  );
}
```

---

## MobileTabBar
**Path:** `components/layout/MobileTabBar.tsx`

In-page tab bar for switching content panels (used in results pages, etc.).

```tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface Tab {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

interface MobileTabBarProps {
  tabs: Tab[];
  activeTab: string | null;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function MobileTabBar({ tabs, activeTab, onTabChange, className }: MobileTabBarProps) {
  return (
    <nav className={cn('mobile-tab-bar md:hidden', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => { onTabChange(isActive ? '' : tab.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={cn(
              'flex flex-col items-center justify-center px-4 py-2 min-w-[64px]',
              'transition-all duration-100',
              isActive ? 'text-neo-lime scale-110' : 'text-neo-white/70 hover:text-neo-white'
            )}
          >
            <div className="relative">
              <span className="text-xl">{tab.icon}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-2 rtl:-right-auto rtl:-left-2 bg-neo-pink text-neo-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-neo-black"
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </motion.span>
              )}
            </div>
            <span className="text-xs font-bold uppercase tracking-wide mt-1">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

---

## GamePageWrapper
**Path:** `components/layout/GamePageWrapper.tsx`

Game view wrapper with Capacitor safe area CSS variables.

```tsx
'use client';

import React from 'react';
import { cn } from '../../lib/utils';

interface GamePageWrapperProps {
  children: React.ReactNode;
  className?: string;
  useSafeArea?: boolean; // default: true
}

export function GamePageWrapper({ children, className, useSafeArea = true }: GamePageWrapperProps) {
  return (
    <div
      className={cn('bg-neo-page flex flex-col', className)}
      style={useSafeArea ? {
        paddingTop: 'var(--cap-safe-area-top, 0px)',
        paddingBottom: 'var(--cap-safe-area-bottom, 0px)',
        paddingLeft: 'var(--cap-safe-area-left, 0px)',
        paddingRight: 'var(--cap-safe-area-right, 0px)',
      } : undefined}
    >
      {children}
    </div>
  );
}
```

---

## PageStateHandler
**Path:** `components/layout/PageStateHandler.tsx`

Loading/error/empty state handler with customizable components and retry support.

```tsx
'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/PageLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface PageStateHandlerProps {
  isLoading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  loadingText?: string;
  emptyText?: string;
  emptyIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function PageStateHandler({
  isLoading, error, isEmpty = false, onRetry,
  loadingComponent, errorComponent, emptyComponent,
  loadingText, emptyText, children,
}: PageStateHandlerProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  if (isLoading) {
    return loadingComponent ? <>{loadingComponent}</> : (
      <div className="flex flex-col items-center justify-center py-20">
        <PageLoader size="md" text={loadingText || t('common.loading') || 'Loading...'} />
      </div>
    );
  }

  if (error) {
    return errorComponent ? <>{errorComponent}</> : (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className={cn('w-16 h-16 mb-4', isDarkMode ? 'text-red-400' : 'text-red-500')} />
        <p className={cn('text-lg font-medium mb-2', isDarkMode ? 'text-white' : 'text-gray-900')}>
          {t('common.error') || 'Something went wrong'}
        </p>
        <p className={cn('text-sm mb-4 text-center max-w-md', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>{error}</p>
        {onRetry && (
          <Button onClick={onRetry} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> {t('common.retry') || 'Try Again'}
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return emptyComponent ? <>{emptyComponent}</> : (
      <EmptyState type="no-results" title={emptyText || t('common.noData')} showMascot mascotVariant="happy" />
    );
  }

  return <>{children}</>;
}
```
