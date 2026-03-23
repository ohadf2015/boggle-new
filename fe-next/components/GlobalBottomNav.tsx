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

type TabId = 'home' | 'play' | 'quests' | 'profile';

interface TabConfig {
    id: TabId;
    labelKey: string;
    icon: typeof Home;
    color: string;         // Active text + indicator color
    glowColor: string;     // Subtle glow under active icon
}

const TABS: TabConfig[] = [
    { id: 'home',    labelKey: 'nav.home',    icon: Home,       color: 'text-neo-yellow', glowColor: 'bg-neo-yellow/15' },
    { id: 'play',    labelKey: 'nav.play',    icon: Swords,     color: 'text-neo-orange', glowColor: 'bg-neo-orange/15' },
    { id: 'quests',  labelKey: 'nav.quests',  icon: ScrollText, color: 'text-neo-lime',   glowColor: 'bg-neo-lime/15' },
    { id: 'profile', labelKey: 'nav.profile', icon: User,       color: 'text-neo-cyan',   glowColor: 'bg-neo-cyan/15' },
];

// Color map for the sliding indicator pill
const INDICATOR_COLORS: Record<TabId, string> = {
    home: 'bg-neo-yellow',
    play: 'bg-neo-orange',
    quests: 'bg-neo-lime',
    profile: 'bg-neo-cyan',
};

/**
 * GlobalBottomNav - Mobile-only bottom navigation bar
 *
 * UX Design Rationale:
 * - Fixed at bottom of viewport in the thumb zone for easy one-handed use
 * - z-[80] ensures nav sits above all non-modal landing page elements
 * - WCAG 2.1 AA compliant: touch target minimum 48x48px (we use 64x48)
 * - Safe area support for iOS home indicator (notch devices)
 * - Auto-hides during gameplay via NavigationContext (isInGame)
 *
 * Features:
 * - Animated sliding pill indicator between tabs (layoutId)
 * - Active indicator pill at top of active tab
 * - Spring-animated icon scale on active
 * - Per-tab accent colors with subtle glow
 * - transition-all on tab buttons for smooth state changes
 * - pathsWithOwnNav: hides on routes that have their own navigation
 * - shouldHideOnCurrentPath logic prevents double-nav on sub-pages
 */
export const GlobalBottomNav = memo(function GlobalBottomNav() {
    const { t, language } = useLanguage();
    const { isInGame } = useNavigation();
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const safeArea = useSafeArea();
    const [showAuthModal, setShowAuthModal] = useState(false);

    const activeTab = useMemo((): TabId => {
        const cleanPath = pathname.replace(`/${language}`, '');
        if (cleanPath === '' || cleanPath === '/') return 'home';
        if (cleanPath.startsWith('/multiplayer')) return 'play';
        if (cleanPath.startsWith('/quests')) return 'quests';
        if (cleanPath.startsWith('/profile')) return 'profile';
        return 'home';
    }, [pathname, language]);

    const navigate = useCallback((tab: TabId) => {
        if (tab === 'profile' && !isAuthenticated) {
            setShowAuthModal(true);
            return;
        }
        const routes: Record<TabId, string> = {
            home: `/${language}`,
            play: `/${language}/multiplayer`,
            quests: `/${language}/quests`,
            profile: `/${language}/profile`,
        };
        router.push(routes[tab]);
    }, [router, language, isAuthenticated]);

    // pathsWithOwnNav — these routes render their own nav, so we hide the global one
    const shouldHideOnCurrentPath = useMemo(() => {
        const pathsWithOwnNav = ['/singleplayer', '/daily', '/adventure', '/education', '/student', '/teacher', '/multiplayer'];
        const cleanPath = pathname.replace(`/${language}`, '');
        return pathsWithOwnNav.some(p => cleanPath.startsWith(p));
    }, [pathname, language]);

    if (isInGame || shouldHideOnCurrentPath) return null;

    return (
        <nav
            className={cn(
                "fixed bottom-0 left-0 right-0 z-[80]",
                "bg-neo-navy",
                "border-t-3 border-neo-black",
                "shadow-[0_-4px_0_0_rgba(0,0,0,1)]",
                "sm:hidden",
            )}
            style={{
                paddingBottom: safeArea.bottom > 0 ? `${safeArea.bottom}px` : undefined,
            }}
            aria-label={t('nav.bottomNavigation')}
        >
            <div className="flex items-center justify-around h-16 relative">
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.id)}
                            className={cn(
                                "flex flex-col items-center justify-center relative",
                                "min-w-[64px] min-h-[48px]",
                                "px-3 py-2",
                                "transition-all duration-150",
                                isActive ? tab.color : "text-neo-white/40"
                            )}
                            aria-label={t(tab.labelKey)}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {/* Glow background behind active icon */}
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div
                                        layoutId="tab-glow"
                                        className={cn(
                                            "absolute inset-0 rounded-xl",
                                            tab.glowColor
                                        )}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Active indicator pill at top */}
                            {isActive && (
                                <motion.div
                                    layoutId="tab-indicator"
                                    className={cn(
                                        "absolute top-0 w-8 h-1 rounded-b-full",
                                        INDICATOR_COLORS[tab.id]
                                    )}
                                    transition={{ type: 'spring' as const, damping: 25, stiffness: 300 }}
                                />
                            )}

                            {/* Icon with scale animation */}
                            <motion.div
                                animate={{
                                    scale: isActive ? 1.15 : 1,
                                    y: isActive ? -1 : 0,
                                }}
                                transition={{ type: 'spring' as const, damping: 12, stiffness: 300 }}
                                className="relative z-10"
                            >
                                <Icon className="w-6 h-6 mb-0.5" aria-hidden="true" />
                            </motion.div>

                            {/* Label */}
                            <motion.span
                                className={cn(
                                    "text-[10px] font-bold uppercase tracking-wide relative z-10",
                                    isActive ? tab.color : "text-neo-white/40"
                                )}
                                animate={{
                                    opacity: isActive ? 1 : 0.6,
                                }}
                                transition={{ duration: 0.15 }}
                            >
                                {t(tab.labelKey)}
                            </motion.span>
                        </button>
                    );
                })}
            </div>

            {/* Auth Modal */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </nav>
    );
});

export default GlobalBottomNav;
