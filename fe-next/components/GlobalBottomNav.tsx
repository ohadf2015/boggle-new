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

// Lazy load AuthModal - only shown when unauthenticated users tap Brain/Profile
const AuthModal = dynamic(() => import('./auth/AuthModal'), { ssr: false });

/**
 * GlobalBottomNav - Mobile-only bottom navigation bar
 *
 * UX Design Rationale:
 * - Follows iOS/Android platform conventions for bottom tab bars
 * - Positions primary actions in the "thumb zone" for one-handed use
 * - Provides persistent access to core features without menu diving
 * - Smart hiding during gameplay to prevent accidental taps
 *
 * Features:
 * - Three primary tabs: Home, Brain, Profile
 * - Active state indication with neo-yellow highlight
 * - Safe area support for devices with notches/home indicators
 * - Automatic hiding during gameplay (via NavigationContext)
 * - Desktop breakpoint: hidden on sm+ (tailwind)
 */
export const GlobalBottomNav = memo(function GlobalBottomNav() {
    const { t, language } = useLanguage();
    const { isInGame } = useNavigation();
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const safeArea = useSafeArea();
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Determine active tab based on current pathname
    const activeTab = useMemo(() => {
        // Remove locale prefix to get clean path
        const cleanPath = pathname.replace(`/${language}`, '');

        if (cleanPath === '' || cleanPath === '/') return 'home';
        if (cleanPath.startsWith('/multiplayer')) return 'play';
        if (cleanPath.startsWith('/brain')) return 'brain';
        if (cleanPath.startsWith('/profile')) return 'profile';

        return 'home'; // Default to home if no match
    }, [pathname, language]);

    // Navigation handlers
    const navigateToHome = useCallback(() => {
        router.push(`/${language}`);
    }, [router, language]);

    const navigateToPlay = useCallback(() => {
        router.push(`/${language}/multiplayer`);
    }, [router, language]);

    const navigateToBrain = useCallback(() => {
        // Brain training requires authentication - show modal if not logged in
        if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
        }
        router.push(`/${language}/brain`);
    }, [router, language, isAuthenticated]);

    const navigateToProfile = useCallback(() => {
        // Profile requires authentication - show modal if not logged in
        if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
        }
        router.push(`/${language}/profile`);
    }, [router, language, isAuthenticated]);

    // Hide on paths that have their own navigation (multiplayer game, host view, etc.)
    const shouldHideOnCurrentPath = useMemo(() => {
        const cleanPath = pathname.replace(`/${language}`, '');

        // Hide on these specific paths that have their own bottom nav
        const pathsWithOwnNav = [
            '/singleplayer',
            '/daily',
            '/adventure',
            // Education section has its own EducationHeader nav — hide main app nav
            '/education',
            '/student',
            '/teacher',
            // REMOVED: '/multiplayer' - Keep bottom nav visible on multiplayer lobby
            // REMOVED: '/profile' - GlobalBottomNav should remain visible on profile
            // to avoid confusing tab switching UX
        ];

        return pathsWithOwnNav.some(path => cleanPath.startsWith(path));
    }, [pathname, language]);

    // Hide bottom nav when:
    // 1. In active game (isInGame from NavigationContext)
    // 2. On paths with their own navigation (multiplayer, etc.)
    if (isInGame || shouldHideOnCurrentPath) {
        return null;
    }

    return (
        <nav
            className={cn(
                "fixed bottom-0 left-0 right-0 z-[80]",
                "bg-neo-navy", // Solid background, no transparency
                "border-t-3 border-neo-black",
                "shadow-[0_-4px_0_0_rgba(0,0,0,1)]", // Hard shadow upward
                "sm:hidden", // Only visible on mobile (<sm breakpoint)
            )}
            style={{
                // Add safe area padding for iOS home indicator
                paddingBottom: safeArea.bottom > 0 ? `${safeArea.bottom}px` : undefined,
            }}
            aria-label={t('nav.bottomNavigation') || 'Bottom navigation'}
        >
            <div className="flex items-center justify-around h-16">
                {/* Home Tab */}
                <button
                    onClick={navigateToHome}
                    className={cn(
                        "flex flex-col items-center justify-center",
                        "min-w-[64px] min-h-[48px]", // WCAG touch target size
                        "px-4 py-2",
                        "transition-all duration-100",
                        "relative",
                        activeTab === 'home'
                            ? "text-neo-yellow"
                            : "text-neo-white/60 hover:text-neo-white/80"
                    )}
                    aria-label={t('nav.home') || 'Home'}
                    aria-current={activeTab === 'home' ? 'page' : undefined}
                >
                    <Home
                        className={cn(
                            "w-6 h-6 mb-1",
                            activeTab === 'home' && "animate-neo-pop"
                        )}
                        aria-hidden="true"
                    />
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wide",
                        activeTab === 'home' && "text-neo-yellow"
                    )}>
                        {t('nav.home') || 'Home'}
                    </span>
                    {/* Active indicator */}
                    {activeTab === 'home' && (
                        <div
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-neo-yellow rounded-b-full"
                            aria-hidden="true"
                        />
                    )}
                </button>

                {/* Play/Multiplayer Tab */}
                <button
                    onClick={navigateToPlay}
                    className={cn(
                        "flex flex-col items-center justify-center",
                        "min-w-[64px] min-h-[48px]",
                        "px-3 py-2",
                        "transition-all duration-100",
                        "relative",
                        activeTab === 'play'
                            ? "text-neo-orange"
                            : "text-neo-white/60 hover:text-neo-white/80"
                    )}
                    aria-label={t('nav.play') || 'Play'}
                    aria-current={activeTab === 'play' ? 'page' : undefined}
                >
                    <Swords
                        className={cn(
                            "w-6 h-6 mb-1",
                            activeTab === 'play' && "animate-neo-pop"
                        )}
                        aria-hidden="true"
                    />
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wide",
                        activeTab === 'play' && "text-neo-orange"
                    )}>
                        {t('nav.play') || 'Play'}
                    </span>
                    {activeTab === 'play' && (
                        <div
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-neo-orange rounded-b-full"
                            aria-hidden="true"
                        />
                    )}
                </button>

                {/* Brain Training Tab */}
                <button
                    onClick={navigateToBrain}
                    className={cn(
                        "flex flex-col items-center justify-center",
                        "min-w-[64px] min-h-[48px]", // WCAG touch target size
                        "px-4 py-2",
                        "transition-all duration-100",
                        "relative",
                        activeTab === 'brain'
                            ? "text-neo-purple"
                            : "text-neo-white/60 hover:text-neo-white/80"
                    )}
                    aria-label={t('nav.brain') || 'Brain Training'}
                    aria-current={activeTab === 'brain' ? 'page' : undefined}
                >
                    <Brain
                        className={cn(
                            "w-6 h-6 mb-1",
                            activeTab === 'brain' && "animate-neo-pop"
                        )}
                        aria-hidden="true"
                    />
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wide",
                        activeTab === 'brain' && "text-neo-purple"
                    )}>
                        {t('nav.brain') || 'Brain'}
                    </span>
                    {/* Active indicator */}
                    {activeTab === 'brain' && (
                        <div
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-neo-purple rounded-b-full"
                            aria-hidden="true"
                        />
                    )}
                </button>

                {/* Profile Tab */}
                <button
                    onClick={navigateToProfile}
                    className={cn(
                        "flex flex-col items-center justify-center",
                        "min-w-[64px] min-h-[48px]", // WCAG touch target size
                        "px-4 py-2",
                        "transition-all duration-100",
                        "relative",
                        activeTab === 'profile'
                            ? "text-neo-cyan"
                            : "text-neo-white/60 hover:text-neo-white/80"
                    )}
                    aria-label={t('nav.profile') || 'Profile'}
                    aria-current={activeTab === 'profile' ? 'page' : undefined}
                >
                    <User
                        className={cn(
                            "w-6 h-6 mb-1",
                            activeTab === 'profile' && "animate-neo-pop"
                        )}
                        aria-hidden="true"
                    />
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wide",
                        activeTab === 'profile' && "text-neo-cyan"
                    )}>
                        {t('nav.profile') || 'Profile'}
                    </span>
                    {/* Active indicator */}
                    {activeTab === 'profile' && (
                        <div
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-neo-cyan rounded-b-full"
                            aria-hidden="true"
                        />
                    )}
                </button>
            </div>

            {/* Auth Modal - shown when unauthenticated users tap Brain or Profile */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </nav>
    );
});

export default GlobalBottomNav;
