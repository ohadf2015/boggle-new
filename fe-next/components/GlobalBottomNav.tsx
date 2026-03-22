'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Home, Swords, ScrollText, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useSafeArea } from '../hooks/useSafeArea';

// Lazy load AuthModal - only shown when unauthenticated users tap Profile
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
 * - Four primary tabs: Home, Play, Quests, Profile
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
        if (cleanPath.startsWith('/quests')) return 'quests';
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

    const navigateToQuests = useCallback(() => {
        router.push(`/${language}/quests`);
    }, [router, language]);

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
            // Multiplayer has its own header with exit button, room code, and player count
            '/multiplayer',
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
                "bg-neo-navy/95 backdrop-blur-sm", // Slight transparency with blur
                "border-t-3 border-neo-black",
                "shadow-[0_-4px_0_0_rgba(0,0,0,1)]", // Hard shadow upward
                "sm:hidden", // Only visible on mobile (<sm breakpoint)
            )}
            style={{
                // Add safe area padding for iOS home indicator
                paddingBottom: safeArea.bottom > 0 ? `${safeArea.bottom}px` : undefined,
            }}
            aria-label={t('nav.bottomNavigation')}
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
                            : "text-neo-white/40 hover:text-neo-white/70"
                    )}
                    aria-label={t('nav.home')}
                    aria-current={activeTab === 'home' ? 'page' : undefined}
                >
                    {/* Glow background */}
                    {activeTab === 'home' && (
                        <motion.div
                            layoutId="tab-glow"
                            className="absolute inset-0 rounded-xl bg-neo-yellow/10"
                            transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }}
                        />
                    )}
                    <motion.div
                        animate={{ scale: activeTab === 'home' ? 1.15 : 1, y: activeTab === 'home' ? -1 : 0 }}
                        transition={{ type: 'spring' as const, damping: 12, stiffness: 300 }}
                        className="relative z-10"
                    >
                        <Home className="w-6 h-6 mb-0.5" aria-hidden="true" />
                    </motion.div>
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wide relative z-10",
                        activeTab === 'home' && "text-neo-yellow"
                    )}>
                        {t('nav.home')}
                    </span>
                    {/* Active indicator */}
                    {activeTab === 'home' && (
                        <motion.div
                            layoutId="tab-indicator"
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-neo-yellow rounded-b-full"
                            transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }}
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
                            : "text-neo-white/40 hover:text-neo-white/70"
                    )}
                    aria-label={t('nav.play')}
                    aria-current={activeTab === 'play' ? 'page' : undefined}
                >
                    {activeTab === 'play' && (
                        <motion.div
                            layoutId="tab-glow"
                            className="absolute inset-0 rounded-xl bg-neo-orange/10"
                            transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }}
                        />
                    )}
                    <motion.div
                        animate={{ scale: activeTab === 'play' ? 1.15 : 1, y: activeTab === 'play' ? -1 : 0 }}
                        transition={{ type: 'spring' as const, damping: 12, stiffness: 300 }}
                        className="relative z-10"
                    >
                        <Swords className="w-6 h-6 mb-0.5" aria-hidden="true" />
                    </motion.div>
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wide relative z-10",
                        activeTab === 'play' && "text-neo-orange"
                    )}>
                        {t('nav.play')}
                    </span>
                    {activeTab === 'play' && (
                        <motion.div
                            layoutId="tab-indicator"
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-neo-orange rounded-b-full"
                            transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }}
                            aria-hidden="true"
                        />
                    )}
                </button>

                {/* Quests Tab */}
                <button
                    onClick={navigateToQuests}
                    className={cn(
                        "flex flex-col items-center justify-center",
                        "min-w-[64px] min-h-[48px]",
                        "px-3 py-2",
                        "transition-all duration-100",
                        "relative",
                        activeTab === 'quests'
                            ? "text-neo-lime"
                            : "text-neo-white/40 hover:text-neo-white/70"
                    )}
                    aria-label={t('nav.quests')}
                    aria-current={activeTab === 'quests' ? 'page' : undefined}
                >
                    {activeTab === 'quests' && (
                        <motion.div
                            layoutId="tab-glow"
                            className="absolute inset-0 rounded-xl bg-neo-lime/10"
                            transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }}
                        />
                    )}
                    <motion.div
                        animate={{ scale: activeTab === 'quests' ? 1.15 : 1, y: activeTab === 'quests' ? -1 : 0 }}
                        transition={{ type: 'spring' as const, damping: 12, stiffness: 300 }}
                        className="relative z-10"
                    >
                        <ScrollText className="w-6 h-6 mb-0.5" aria-hidden="true" />
                    </motion.div>
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wide relative z-10",
                        activeTab === 'quests' && "text-neo-lime"
                    )}>
                        {t('nav.quests')}
                    </span>
                    {activeTab === 'quests' && (
                        <motion.div
                            layoutId="tab-indicator"
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-neo-lime rounded-b-full"
                            transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }}
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
                            : "text-neo-white/40 hover:text-neo-white/70"
                    )}
                    aria-label={t('nav.profile')}
                    aria-current={activeTab === 'profile' ? 'page' : undefined}
                >
                    {activeTab === 'profile' && (
                        <motion.div
                            layoutId="tab-glow"
                            className="absolute inset-0 rounded-xl bg-neo-cyan/10"
                            transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }}
                        />
                    )}
                    <motion.div
                        animate={{ scale: activeTab === 'profile' ? 1.15 : 1, y: activeTab === 'profile' ? -1 : 0 }}
                        transition={{ type: 'spring' as const, damping: 12, stiffness: 300 }}
                        className="relative z-10"
                    >
                        <User className="w-6 h-6 mb-0.5" aria-hidden="true" />
                    </motion.div>
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wide relative z-10",
                        activeTab === 'profile' && "text-neo-cyan"
                    )}>
                        {t('nav.profile')}
                    </span>
                    {/* Active indicator */}
                    {activeTab === 'profile' && (
                        <motion.div
                            layoutId="tab-indicator"
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-neo-cyan rounded-b-full"
                            transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }}
                            aria-hidden="true"
                        />
                    )}
                </button>
            </div>

            {/* Auth Modal - shown when unauthenticated users tap Profile */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </nav>
    );
});

export default GlobalBottomNav;
