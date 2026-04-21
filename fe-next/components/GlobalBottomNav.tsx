'use client';

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Home, Swords, ScrollText, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useSafeArea } from '../hooks/useSafeArea';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useDailyMissions } from '../hooks/useDailyMissions';
import { useFriends } from '../hooks/useFriends';
import { useFriendMessages } from '../hooks/useFriendMessages';
import { toast } from './ui/EnhancedToast';
import type { Message } from '@/shared/types/friends';

// 3 daily missions shown in the Quests tab (no brain drill)
const QUEST_MISSION_TYPES = ['wordHunt', 'adventure', 'community'] as const;
const QUEST_TOTAL = QUEST_MISSION_TYPES.length;

// Lazy load AuthModal - only shown when unauthenticated users tap Profile
const AuthModal = dynamic(() => import('./auth/AuthModal'), { ssr: false });

type TabId = 'home' | 'play' | 'quests' | 'friends';

interface TabConfig {
    id: TabId;
    labelKey: string;
    icon: typeof Home;
    color: string;         // Active text + indicator color
    glowColor: string;     // Subtle glow under active icon
}

const TABS: TabConfig[] = [
    { id: 'home',    labelKey: 'nav.home',    icon: Home,       color: 'text-neo-cyan', glowColor: 'bg-neo-cyan/15' },
    { id: 'play',    labelKey: 'nav.play',    icon: Swords,     color: 'text-neo-pink', glowColor: 'bg-neo-pink/15' },
    { id: 'quests',  labelKey: 'nav.quests',  icon: ScrollText, color: 'text-neo-lime',   glowColor: 'bg-neo-lime/15' },
    { id: 'friends', labelKey: 'nav.friends', icon: Users,      color: 'text-neo-pink',   glowColor: 'bg-neo-pink/15' },
];

// Color map for the sliding indicator pill
const INDICATOR_COLORS: Record<TabId, string> = {
    home: 'bg-neo-cyan',
    play: 'bg-neo-pink',
    quests: 'bg-neo-lime',
    friends: 'bg-neo-pink',
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
    const { isOnCrazyGamesPlatform } = useCrazyGames();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const safeArea = useSafeArea();
    const { user } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const { missions } = useDailyMissions();
    const { pendingRequests, pendingChallenges, friends } = useFriends();

    // Refs with fresh values so onMessage callback can decide whether to toast
    const pathnameRef = useRef(pathname);
    pathnameRef.current = pathname;
    const searchParamsRef = useRef(searchParams);
    searchParamsRef.current = searchParams;
    const currentUserIdRef = useRef(user?.id);
    currentUserIdRef.current = user?.id;
    const friendsRef = useRef(friends);
    friendsRef.current = friends;

    const handleIncomingMessage = useCallback((message: Message) => {
        // Ignore messages sent by me (echoed to other tabs/devices)
        if (!currentUserIdRef.current || message.fromUserId === currentUserIdRef.current) return;

        // Suppress when the user is already viewing this exact thread
        const path = pathnameRef.current || '';
        const sp = searchParamsRef.current;
        const onFriends = path.includes('/friends');
        const onMessagesTab = sp?.get('tab') === 'messages';
        const viewingThisFriend = sp?.get('friendUserId') === message.fromUserId;
        if (onFriends && onMessagesTab && viewingThisFriend) return;

        const sender = friendsRef.current.find((f) => f.odUserId === message.fromUserId);
        const senderName = sender?.displayName || sender?.username || t('friends.newMessage');
        const preview = message.message.length > 80
            ? message.message.substring(0, 77) + '...'
            : message.message;

        toast.info(
            t('friends.messageFrom', { name: senderName }),
            preview,
            {
                label: t('friends.open'),
                onClick: () => router.push(
                    `/${language}/friends?tab=messages&friendUserId=${message.fromUserId}`
                ),
            }
        );
    }, [t, router, language]);

    const { unreadCount } = useFriendMessages(undefined, handleIncomingMessage);
    const socialBadgeCount = pendingRequests.length + pendingChallenges.length + unreadCount;

    // Count completed quests (3 shown: wordHunt, adventure, community — no brain drill)
    const questsCompleted = useMemo(() =>
        missions.filter(m => QUEST_MISSION_TYPES.includes(m.type as typeof QUEST_MISSION_TYPES[number]) && m.completed).length,
    [missions]);

    const activeTab = useMemo((): TabId => {
        const cleanPath = pathname.replace(`/${language}`, '');
        if (cleanPath === '' || cleanPath === '/') return 'home';
        if (cleanPath.startsWith('/multiplayer')) return 'play';
        if (cleanPath.startsWith('/quests')) return 'quests';
        if (cleanPath.startsWith('/friends')) return 'friends';
        return 'home';
    }, [pathname, language]);

    const navigate = useCallback((tab: TabId) => {
        if (tab === 'friends' && !isAuthenticated) {
            setShowAuthModal(true);
            return;
        }
        const routes: Record<TabId, string> = {
            home: `/${language}`,
            play: `/${language}/multiplayer`,
            quests: `/${language}/quests`,
            friends: `/${language}/friends`,
        };
        router.push(routes[tab]);
    }, [router, language, isAuthenticated]);

    // pathsWithOwnNav — these routes render their own nav, so we hide the global one
    const shouldHideOnCurrentPath = useMemo(() => {
        const pathsWithOwnNav = ['/multiplayer', '/singleplayer', '/daily', '/adventure', '/education', '/student', '/teacher', '/admin', '/brain', '/challenge', '/custom', '/join'];
        const cleanPath = pathname.replace(`/${language}`, '');
        return pathsWithOwnNav.some(p => cleanPath.startsWith(p));
    }, [pathname, language]);

    // Hide entire bottom nav on CrazyGames — external links and social features prohibited
    if (isInGame || shouldHideOnCurrentPath || isOnCrazyGamesPlatform) return null;

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
                // Nav sits at screen bottom. Banner (when shown) floats above nav via AdMob margin, so nav keeps the full safe-area as its own padding.
                paddingBottom: safeArea.bottom > 0 ? `${safeArea.bottom}px` : 'env(safe-area-inset-bottom, 0px)',
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
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy rounded",
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
                                        "absolute top-0 w-2 h-2 rounded-full -translate-y-1/2",
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

                                {/* Quest progress badge — circular ring on Quests tab */}
                                {tab.id === 'quests' && questsCompleted > 0 && (
                                    <span
                                        className="absolute -top-1.5 -inset-e-2.5 flex items-center justify-center"
                                        aria-label={t('quests.progress', { completed: questsCompleted, total: QUEST_TOTAL })}
                                        data-testid="quest-progress-badge"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 18 18" className="-rotate-90">
                                            {/* Background ring */}
                                            <circle
                                                cx="9" cy="9" r="7"
                                                fill="#1a1a2e"
                                                stroke="rgba(255,255,255,0.15)"
                                                strokeWidth="2.5"
                                            />
                                            {/* Progress arc */}
                                            <circle
                                                cx="9" cy="9" r="7"
                                                fill="none"
                                                stroke={questsCompleted === QUEST_TOTAL ? '#84cc16' : '#00FFFF'}
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeDasharray={2 * Math.PI * 7}
                                                strokeDashoffset={2 * Math.PI * 7 * (1 - questsCompleted / QUEST_TOTAL)}
                                            />
                                        </svg>
                                        {/* Count text */}
                                        <span className={cn(
                                            "absolute inset-0 flex items-center justify-center",
                                            "text-[8px] font-black leading-none",
                                            questsCompleted === QUEST_TOTAL ? "text-neo-lime" : "text-neo-white"
                                        )}>
                                            {questsCompleted}
                                        </span>
                                    </span>
                                )}

                                {/* Social badge — pending friend requests + unread messages */}
                                {tab.id === 'friends' && socialBadgeCount > 0 && (
                                    <span
                                        className="absolute -top-1 -inset-e-2 flex items-center justify-center w-4 h-4 rounded-full bg-neo-pink border-2 border-neo-navy text-[8px] font-black text-neo-white leading-none"
                                        aria-label={t('friends.socialBadge', { count: socialBadgeCount })}
                                        data-testid="friend-social-badge"
                                    >
                                        {socialBadgeCount > 9 ? '9+' : socialBadgeCount}
                                    </span>
                                )}
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
