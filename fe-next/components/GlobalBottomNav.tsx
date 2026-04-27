'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
    Home, Swords, ScrollText, Users,
    Map, Brain, CalendarDays, Zap, Hammer, PartyPopper,
    Trophy, User as UserIcon, Settings as SettingsIcon, Users2, Gift, Target,
} from 'lucide-react';
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

type TabId = 'home' | 'play' | 'quests' | 'friends' | 'dynamic';

interface TabConfig {
    id: TabId;
    labelKey: string;
    icon: typeof Home;
    color: string;         // Active text + indicator color
    glowColor: string;     // Subtle glow under active icon
}

// Order: home is LAST so it renders rightmost (with dir="ltr" on the nav row,
// this holds in both LTR and RTL locales so users always reach home on the right).
// The dynamic slot (when present) is inserted just before home — see computed `tabs` below.
const TABS_BASE: TabConfig[] = [
    { id: 'play',    labelKey: 'nav.play',    icon: Swords,     color: 'text-neo-pink', glowColor: 'bg-neo-pink/15' },
    { id: 'quests',  labelKey: 'nav.quests',  icon: ScrollText, color: 'text-neo-lime', glowColor: 'bg-neo-lime/15' },
    { id: 'friends', labelKey: 'nav.friends', icon: Users,      color: 'text-neo-pink', glowColor: 'bg-neo-pink/15' },
    { id: 'home',    labelKey: 'nav.home',    icon: Home,       color: 'text-neo-cyan', glowColor: 'bg-neo-cyan/15' },
];

// Color map for the sliding indicator pill
const INDICATOR_COLORS: Record<TabId, string> = {
    home: 'bg-neo-cyan',
    play: 'bg-neo-pink',
    quests: 'bg-neo-lime',
    friends: 'bg-neo-pink',
    dynamic: 'bg-neo-cyan',
};

// Route → contextual tab mapping. First matching prefix wins.
// Routes already covered by the base tabs (home/play/quests/friends) return null → no extra slot.
type DynamicSpec = Omit<TabConfig, 'id'>;
const DYNAMIC_ROUTES: ReadonlyArray<readonly [string, DynamicSpec]> = [
    ['/adventure',          { labelKey: 'nav.adventure',    icon: Map,            color: 'text-neo-lime',   glowColor: 'bg-neo-lime/15' }],
    ['/brain',              { labelKey: 'nav.brain',        icon: Brain,          color: 'text-neo-purple', glowColor: 'bg-neo-purple/15' }],
    ['/daily-word-wheel',   { labelKey: 'nav.daily',        icon: CalendarDays,   color: 'text-neo-cyan',   glowColor: 'bg-neo-cyan/15' }],
    ['/word-of-the-day',    { labelKey: 'nav.daily',        icon: CalendarDays,   color: 'text-neo-cyan',   glowColor: 'bg-neo-cyan/15' }],
    ['/daily',              { labelKey: 'nav.daily',        icon: CalendarDays,   color: 'text-neo-cyan',   glowColor: 'bg-neo-cyan/15' }],
    ['/blast',              { labelKey: 'nav.blast',        icon: Zap,            color: 'text-neo-pink',   glowColor: 'bg-neo-pink/15' }],
    ['/word-forge',         { labelKey: 'nav.forge',        icon: Hammer,         color: 'text-neo-lime',   glowColor: 'bg-neo-lime/15' }],
    ['/party',              { labelKey: 'nav.party',        icon: PartyPopper,    color: 'text-neo-pink',   glowColor: 'bg-neo-pink/15' }],
    ['/leaderboard',        { labelKey: 'nav.leaderboard',  icon: Trophy,         color: 'text-neo-lime',   glowColor: 'bg-neo-lime/15' }],
    ['/profile',            { labelKey: 'nav.profile',      icon: UserIcon,       color: 'text-neo-cyan',   glowColor: 'bg-neo-cyan/15' }],
    ['/account',            { labelKey: 'nav.profile',      icon: UserIcon,       color: 'text-neo-cyan',   glowColor: 'bg-neo-cyan/15' }],
    ['/settings',           { labelKey: 'nav.settings',     icon: SettingsIcon,   color: 'text-neo-cyan',   glowColor: 'bg-neo-cyan/15' }],
    ['/community',          { labelKey: 'nav.community',    icon: Users2,         color: 'text-neo-lime',   glowColor: 'bg-neo-lime/15' }],
    ['/referrals',          { labelKey: 'nav.referrals',    icon: Gift,           color: 'text-neo-pink',   glowColor: 'bg-neo-pink/15' }],
    ['/singleplayer',       { labelKey: 'nav.singleplayer', icon: Target,         color: 'text-neo-cyan',   glowColor: 'bg-neo-cyan/15' }],
];

function resolveDynamic(cleanPath: string): DynamicSpec | null {
    for (const [prefix, spec] of DYNAMIC_ROUTES) {
        if (cleanPath.startsWith(prefix)) return spec;
    }
    return null;
}

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

    const cleanPath = useMemo(
        () => pathname.replace(`/${language}`, ''),
        [pathname, language]
    );

    const dynamicSpec = useMemo<DynamicSpec | null>(
        () => resolveDynamic(cleanPath),
        [cleanPath]
    );

    const activeTab = useMemo((): TabId | null => {
        if (cleanPath === '' || cleanPath === '/') return 'home';
        if (cleanPath.startsWith('/multiplayer')) return 'play';
        if (cleanPath.startsWith('/quests')) return 'quests';
        if (cleanPath.startsWith('/friends')) return 'friends';
        if (dynamicSpec) return 'dynamic';
        return null; // Unmapped route → no tab highlighted (avoids misleading home selection)
    }, [cleanPath, dynamicSpec]);

    // Compose visible tabs: insert dynamic slot just before Home when applicable.
    const tabs = useMemo<TabConfig[]>(() => {
        if (!dynamicSpec) return TABS_BASE;
        const homeIdx = TABS_BASE.findIndex(t => t.id === 'home');
        const dynamicTab: TabConfig = { id: 'dynamic', ...dynamicSpec };
        return [
            ...TABS_BASE.slice(0, homeIdx),
            dynamicTab,
            ...TABS_BASE.slice(homeIdx),
        ];
    }, [dynamicSpec]);

    const navigate = useCallback((tab: TabId) => {
        if (tab === 'dynamic') return; // Already on this page — indicator only
        if (tab === 'friends' && !isAuthenticated) {
            setShowAuthModal(true);
            return;
        }
        const routes: Record<Exclude<TabId, 'dynamic'>, string> = {
            home: `/${language}`,
            play: `/${language}/multiplayer`,
            quests: `/${language}/quests`,
            friends: `/${language}/friends`,
        };
        router.push(routes[tab as Exclude<TabId, 'dynamic'>]);
    }, [router, language, isAuthenticated]);

    // pathsWithOwnNav — dedicated surfaces (admin/educator) that ship their own nav.
    // Game entrypoints (multiplayer, adventure, daily, brain, …) show the global nav on
    // their lobby screens; actual gameplay hides it via `isInGame` (NavigationContext).
    const shouldHideOnCurrentPath = useMemo(() => {
        const pathsWithOwnNav = ['/admin', '/student', '/teacher'];
        return pathsWithOwnNav.some(p => cleanPath.startsWith(p));
    }, [cleanPath]);

    // Hide entire bottom nav on CrazyGames — external links and social features prohibited
    const isHidden = isInGame || shouldHideOnCurrentPath || isOnCrazyGamesPlatform;

    const navRef = useRef<HTMLElement>(null);

    // Signal nav visibility to CSS so sticky overlays can offset above it.
    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.classList.toggle('has-global-bottom-nav', !isHidden);
        return () => {
            document.documentElement.classList.remove('has-global-bottom-nav');
        };
    }, [isHidden]);

    // Publish real nav height (h-16 + safe-area) into --bottom-nav-height. This is the
    // single source of truth consumed by content padding (globals.css) and by the
    // AdMob banner's margin calc — replaces brittle DOM measurement from sibling components.
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        if (isHidden) {
            root.style.setProperty('--bottom-nav-height', '0px');
            return;
        }
        const el = navRef.current;
        if (!el) return;
        const update = () => {
            root.style.setProperty('--bottom-nav-height', `${el.offsetHeight}px`);
        };
        update();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => {
            ro.disconnect();
            root.style.setProperty('--bottom-nav-height', '0px');
        };
    }, [isHidden]);

    if (isHidden) return null;

    return (
        <nav
            ref={navRef}
            data-global-bottom-nav=""
            className={cn(
                "fixed left-0 right-0 bottom-0 z-[80]",
                "bg-neo-navy",
                "border-t-3 border-neo-black",
                "shadow-[0_-4px_0_0_rgba(0,0,0,1)]",
                "sm:hidden",
            )}
            style={{
                paddingBottom: safeArea.bottom > 0 ? `${safeArea.bottom}px` : 'env(safe-area-inset-bottom, 0px)',
            }}
            aria-label={t('nav.bottomNavigation')}
        >
            {/* dir="ltr" locks source-order → visual-order so Home stays rightmost in RTL too */}
            <div dir="ltr" className="flex items-center justify-around h-16 relative">
                {tabs.map((tab) => {
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
