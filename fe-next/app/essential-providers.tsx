'use client';

/**
 * Essential Providers - Loaded on ALL pages
 * Keep this MINIMAL to optimize landing page performance
 *
 * ONLY include providers that are needed on EVERY page
 */

import { useEffect, useMemo, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { ThemeProvider } from '@/utils/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { RadixDirectionProvider } from '@/components/providers/RadixDirectionProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { MotionConfigProvider } from '@/components/motion/MotionConfigProvider';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { MusicProvider } from '@/contexts/MusicContext';
import { PlayerStyleProvider } from '@/contexts/PlayerStyleContext';
import { SoundEffectsProvider } from '@/contexts/SoundEffectsContext';
import { HapticsProvider } from '@/contexts/HapticsContext';
import { CoinProvider } from '@/contexts/CoinContext';
import { CrazyGamesProvider } from '@/components/CrazyGamesSDK';
import { Toaster } from 'react-hot-toast';
import { globalToastStyle } from '@/lib/toast/toastStyle';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { AdMobProvider } from '@/contexts/AdMobContext';
// Season claim/announcement are home-only, interaction-gated popups (never SSR/SEO
// content) — lazy-load so their ~35KB stays out of the synchronous initial parse on
// every route. ssr:false: they render nothing visible when there's nothing to claim,
// so first-paint HTML is identical (no CLS).
const SeasonClaimContainer = dynamic(
  () => import('@/components/seasons/SeasonClaimContainer').then((m) => m.SeasonClaimContainer),
  { ssr: false },
);
const SeasonAnnouncementModal = dynamic(
  () => import('@/components/seasons/SeasonAnnouncementModal').then((m) => m.SeasonAnnouncementModal),
  { ssr: false },
);
import { HomeOnlySeasonGate } from '@/components/seasons/HomeOnlySeasonGate';

// Non-first-paint leaf mounts (effect-only listeners, gated modals, native
// guards, ad banners, FX overlays) are dynamically imported with ssr:false so
// their code leaves the synchronous first-load bundle AND their mount/effects
// run after hydration instead of inside the critical hydration pass. None render
// visible UI at first paint, so ssr:false is flash-free. Visible cosy surfaces
// (CosyAmbientBackdrop, QuietCelebrationLayer) are intentionally NOT deferred —
// ssr:false on those would flash (see .claude/rules Class-5 mobile-web flash).
const AnchoredNativeBanner = dynamic(() => import('@/components/ads/AnchoredNativeBanner'), { ssr: false });
const BannerCoordinatorMount = dynamic(() => import('@/components/ads/BannerCoordinatorMount'), { ssr: false });
const WebAnchorAdObserver = dynamic(() => import('@/components/ads/WebAnchorAdObserver'), { ssr: false });
const SignupPromptHost = dynamic(() => import('@/components/auth/SignupPromptHost').then(m => m.SignupPromptHost), { ssr: false });
const PlayerStyleOnboardingWrapper = dynamic(() => import('./components/PlayerStyleOnboardingWrapper'), { ssr: false });
const UnlockNotifierMount = dynamic(() => import('@/components/cosmetics/UnlockNotifierMount').then(m => m.UnlockNotifierMount), { ssr: false });
import { initUtmCapture } from '@/utils/utmCapture';
import { initConsoleOverride, initCapacitorLogFilter } from '@/utils/consoleOverride';
import { initSessionTracking } from '@/utils/sessionTracking';
import { initCrashlytics } from '@/utils/crashlytics';
import { linkLogRocketSession } from '@/utils/sentry';
import { hasConsent } from '@/utils/cookieConsent';
import { LogRocketIdentify } from '@/components/providers/LogRocketIdentify';
import { PostHogProvider } from '@/components/providers/PostHogProvider';
// QuietCelebrationLayer + CosyAmbientBackdrop render visible surfaces — keep
// them server-rendered (static) so they don't flash in after hydration.
import QuietCelebrationLayer from '@/components/cosy/QuietCelebrationLayer';
import CosyAmbientBackdrop from '@/components/cosy/CosyAmbientBackdrop';

const GlobalCoinEarnFx = dynamic(() => import('@/components/animations/GlobalCoinEarnFx'), { ssr: false });
const SharedFxMount = dynamic(() => import('@/components/animations/SharedFxMount'), { ssr: false });
const NativeSelectionGuard = dynamic(() => import('@/components/native/NativeSelectionGuard'), { ssr: false });
const EasterEggListener = dynamic(() => import('@/components/EasterEggListener'), { ssr: false });
const HiddenAchievementListener = dynamic(() => import('@/components/achievements/HiddenAchievementListener'), { ssr: false });


import type { TranslationData } from '@/translations/loadTranslation';
import type { Language } from '@/shared/types/game';

interface EssentialProvidersProps {
  children: ReactNode;
  lang: Language;
  /** Pre-loaded translations for the initial language (avoids 1.26MB bundle) */
  initialTranslations?: TranslationData;
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
    initCapacitorLogFilter();
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

// Lazy load LogRocket — requires analytics consent (GDPR compliance).
// Deferred to 3 seconds OR first user interaction (whichever comes first).
let logRocketInitialized = false;
const initLogRocket = () => {
    if (logRocketInitialized) return;
    if (typeof window === 'undefined' || window.location.hostname === 'localhost') return;
    if (!hasConsent('analytics')) return;

    logRocketInitialized = true;
    import('logrocket').then(({ default: LogRocket }) => {
        LogRocket.init('ioiov9/lexiclash');
        // Link LogRocket session to Sentry for error replay correlation
        linkLogRocketSession();
        // Notify identify hook that LogRocket is ready
        window.dispatchEvent(new Event('logrocket-ready'));
    });
};

/**
 * EssentialProviders - Minimal provider stack for landing page
 * Loads ~50KB of essential JavaScript + AuthProvider
 * LogRocket (~100KB) is deferred to avoid blocking initial load
 *
 * IMPORTANT: AuthProvider is included to ensure profile dropdown works on ALL pages
 * Bug fix: Profile dropdown was only appearing after visiting settings page
 * Root cause: AuthProvider was missing from EssentialProviders
 */
export function EssentialProviders({ children, lang, initialTranslations }: EssentialProvidersProps) {
    // Initialize session tracking for analytics
    useEffect(() => {
        initSessionTracking();
        // Native-only: enable Firebase Crashlytics so launch crashes are captured.
        // No-ops on web; errors are swallowed internally — never blocks launch.
        void initCrashlytics();
    }, []);

    // Defer LogRocket initialization for optimal performance
    // Load after 3 seconds or on first user interaction, whichever comes first
    // Only initializes when analytics consent is granted
    useEffect(() => {
        const timeoutId = setTimeout(initLogRocket, 3000);

        const events = ['click', 'touchstart', 'keydown', 'scroll'] as const;
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

        // Also listen for consent changes — user may grant analytics after page load
        const handleConsent = () => initLogRocket();
        window.addEventListener('cookie-consent-change', handleConsent);

        return () => {
            clearTimeout(timeoutId);
            events.forEach(event => {
                window.removeEventListener(event, handleInteraction);
            });
            window.removeEventListener('cookie-consent-change', handleConsent);
        };
    }, []);

    // Memoize children so that when active providers (Music, SoundEffects, Haptics)
    // change state, the children tree reference stays stable and React.memo'd
    // components below don't re-render unnecessarily.
    const memoizedChildren = useMemo(() => children, [children]);

    return (
        <ErrorBoundary>
            <QueryProvider>
            <QueryErrorResetBoundary>
            {() => (
            <>
            {/* Stable tier: rarely changes */}
            <ThemeProvider>
                <LanguageProvider initialLanguage={lang} initialTranslations={initialTranslations}>
                    <RadixDirectionProvider>
                    <AuthProvider>
                        <LogRocketIdentify />
                        <PostHogProvider>
                        {/* Mounted globally so chrome (header auth buttons, landing
                            CTAs) can react to CrazyGames embed status on every
                            route — not only game pages. Detection is sticky and
                            cheap (≤500ms quick-bail off-platform). */}
                        <CrazyGamesProvider>
                        <CoinProvider>
                            <AccessibilityProvider>
                            <MotionConfigProvider>
                                {/* Active tier: changes during gameplay */}
                                {/* PlayerStyle owns the chosen genre style; applies the accent
                                    and is read by Music for the signature track. Above Music. */}
                                <PlayerStyleProvider>
                                <MusicProvider>
                                    <SoundEffectsProvider>
                                        <HapticsProvider>
                                            <AdMobProvider>
                                            <NavigationProvider>
                                                {memoizedChildren}
                                                {/* Native-app only: kills the long-press text/image selection callout (looks broken in the webview) */}
                                                <NativeSelectionGuard />
                                                {/* Mounts the SharedFxApp Pixi singleton once so coin/level-up/firework FX actually render */}
                                                <SharedFxMount />
                                                {/* Cosy / Calm Mode: soothing ambient warm-light backdrop (gentle drift; still under reduced-motion) */}
                                                <CosyAmbientBackdrop />
                                                {/* Cosy / Calm Mode: dignified quiet acknowledgement that replaces confetti when celebrations are suppressed */}
                                                <QuietCelebrationLayer />
                                                {/* Global coin-earn VFX: sound + flying coins on every addCoins */}
                                                <GlobalCoinEarnFx />
                                                {/* Hidden Konami-code easter egg → fireworks + toast (cosmetic only) */}
                                                <EasterEggListener />
                                                {/* Hidden in-app achievements (easter eggs) → localized reveal card + confetti.
                                                    Gameplay only emits on the bus; this listener owns all UI. */}
                                                <HiddenAchievementListener />
                                                {/* Season modals are gated to home route + first interaction + suspense delay
                                                    so they never interrupt gameplay or pop instantly on landing. */}
                                                <HomeOnlySeasonGate>
                                                    <SeasonClaimContainer />
                                                    <SeasonAnnouncementModal />
                                                </HomeOnlySeasonGate>
                                                {/* Global guest signup prompt — fires on first win or 5+ games regardless of mode. MP routes delegate to useMultiplayerSignupNudge. */}
                                                <SignupPromptHost />
                                                {/* One-time "pick your music/theme style" popup for existing users.
                                                    Gated (shouldShowStylePopup): never double-prompts, defers to
                                                    profile-customization, skips fresh-onboarding visitors. */}
                                                <PlayerStyleOnboardingWrapper />
                                                {/* Cosmetic unlock toast — global so rank-up/streak unlocks surface a
                                                    tap-to-equip deep-link wherever the player is, not just on profile. */}
                                                <UnlockNotifierMount />
                                                {/* Native AdMob banner — single global mount, route-aware.
                                                    BannerCoordinatorMount hosts the single banner coordinator
                                                    (ops + load/fail/foreground signals) the two banner owners
                                                    declare intent into. */}
                                                <BannerCoordinatorMount />
                                                <AnchoredNativeBanner />
                                                {/* WEB AdSense anchor-ad measurer — publishes --web-anchor-ad-height
                                                    so bottom CTAs (e.g. daily Play button) clear the injected
                                                    fixed anchor the AdMob var can't see. No-op on native AdMob. */}
                                                <WebAnchorAdObserver />
                                            </NavigationProvider>
                                            </AdMobProvider>
                                        </HapticsProvider>
                                        <Toaster
                                            position="top-center"
                                            containerStyle={{
                                                pointerEvents: 'none',
                                                zIndex: 9999,
                                                top: 20,
                                            }}
                                            toastOptions={{
                                                duration: 2000,
                                                style: globalToastStyle,
                                            }}
                                        />
                                    </SoundEffectsProvider>
                                </MusicProvider>
                                </PlayerStyleProvider>
                            </MotionConfigProvider>
                        </AccessibilityProvider>
                    </CoinProvider>
                    </CrazyGamesProvider>
                    </PostHogProvider>
                    </AuthProvider>
                    </RadixDirectionProvider>
                </LanguageProvider>
            </ThemeProvider>
            </>
            )}
            </QueryErrorResetBoundary>
            </QueryProvider>
        </ErrorBoundary>
    );
}
