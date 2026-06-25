import { memo, useCallback, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { Menu, X, Settings, Trophy, ScrollText, Coffee, Accessibility, Info, HelpCircle, Mail, Cookie, Gift, Users, UserPlus, ChevronRight, Sparkles, User, Flame, Bell, Check, Pencil, Bug } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayerStyle } from '../../contexts/PlayerStyleContext';
import { cn } from '../../lib/utils';
import AuthButton from '../auth/AuthButton';
import MusicControls from '../MusicControls';
import { ReportBugModal } from '../feedback/ReportBugModal';
import { CoinBalance } from '../CoinBalance';
import { RankTierChip } from '../seasons/RankTierChip';
import { scoreTier } from '@/lib/seasons/scoreTier';
import { GiftNotificationBadge } from '../gift/GiftNotificationBadge';
import { QuickLanguageSwitcher } from '../QuickLanguageSwitcher';
import { NotificationItem } from '../notifications/NotificationItem';
import type { NotificationData } from '../notifications/types';
import { InstagramIcon } from '@/components/icons/SocialIcons';
import { ManageCookiesButton } from '@/components/CookieConsent';
import GetAppMenuRow from '@/components/android-install/GetAppMenuRow';
import Avatar from '../Avatar';
import { getStoredCustomAvatar, getStoredUsername, setStoredUsername } from '../../utils/profileStorage';
import { setGuestName } from '../../utils/guestManager';
import { updateGuestDailyPlayer } from '../../utils/dailyChallenge/guestPlayer';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import { useDailyMissions } from '@/hooks/useDailyMissions';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useCrazyGamesAuth } from '@/hooks/useCrazyGamesAuth';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useFriends } from '@/hooks/useFriends';
import { useFriendMessages } from '@/hooks/useFriendMessages';
import { queryKeys } from '@/lib/queryKeys';
import { notificationListScrollClass } from '@/lib/header/notificationScroll';

interface HeaderMobileMenuProps {
    unclaimedCount: number;
    onOpenGiftModal: () => void;
    onSignIn: () => void;
    onSignUp: () => void;
}

// --- Animation config ---
const SWIPE_CLOSE_THRESHOLD = 80;

const HeaderMobileMenu = memo<HeaderMobileMenuProps>(({ unclaimedCount, onOpenGiftModal, onSignIn, onSignUp }) => {
    const { t, language } = useLanguage();
    const { isAuthenticated, isAdmin, profile, user, loading } = useAuth();
    const { style: playerStyle } = usePlayerStyle();
    const engagementStatus = useEngagementStatus();
    const { missions, completedCount, isGrandSlam, loading: missionsLoading } = useDailyMissions();
    const {
        notifications,
        unreadCount: notificationCount,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        fetchPreviousNotifications,
        previousNotifications,
        isLoadingPrevious,
    } = useRealtimeNotifications();
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    const [showPreviousNotifications, setShowPreviousNotifications] = useState(false);
    const [hasFetchedPrevious, setHasFetchedPrevious] = useState(false);

    const togglePreviousNotifications = useCallback(async () => {
        const next = !showPreviousNotifications;
        setShowPreviousNotifications(next);
        if (next && !hasFetchedPrevious) {
            setHasFetchedPrevious(true);
            await fetchPreviousNotifications();
        }
    }, [showPreviousNotifications, hasFetchedPrevious, fetchPreviousNotifications]);

    // Filter out gift notifications when the gift button is already visible (prevents duplication)
    const filteredNotifications = (unclaimedCount > 0
        ? ((notifications ?? []) as NotificationData[]).filter(n => n.notification_type !== 'gift')
        : (notifications ?? []) as NotificationData[]);
    const { isCrazyGames } = useCrazyGamesAuth();
    const { isLoading: cgLoading } = useCrazyGames();
    const queryClient = useQueryClient();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showBugReport, setShowBugReport] = useState(false);
    const [lastSeenBadgeCount, setLastSeenBadgeCount] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        const raw = window.localStorage.getItem('mobileMenu.lastSeenBadgeCount');
        const parsed = raw ? Number.parseInt(raw, 10) : 0;
        return Number.isFinite(parsed) ? parsed : 0;
    });
    const [giftBannerDismissed, setGiftBannerDismissed] = useState(false);

    // Guest name editing
    const [guestName, setGuestNameState] = useState<string>(() => getStoredUsername() || '');
    const [isEditingGuestName, setIsEditingGuestName] = useState(false);
    const [editGuestNameValue, setEditGuestNameValue] = useState('');
    const guestNameInputRef = useRef<HTMLInputElement>(null);

    // Refresh guest name when menu opens
    useEffect(() => {
        if (showMobileMenu && !isAuthenticated) {
            setGuestNameState(getStoredUsername() || '');
        }
    }, [showMobileMenu, isAuthenticated]);

    // Keep the native AdMob banner BEHIND the open side menu. The banner is a
    // native platform view that composites above the WebView, so no z-index can
    // cover it — instead we flag <html> while the drawer is open. AnchoredNativeBanner
    // observes this class and hides the banner, restoring it when the drawer closes.
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        root.classList.toggle('mobile-drawer-open', showMobileMenu);
        return () => { root.classList.remove('mobile-drawer-open'); };
    }, [showMobileMenu]);

    const handleStartEditGuestName = useCallback(() => {
        setEditGuestNameValue(guestName);
        setIsEditingGuestName(true);
        setTimeout(() => guestNameInputRef.current?.focus(), 50);
    }, [guestName]);

    const handleSaveGuestName = useCallback(() => {
        const trimmed = editGuestNameValue.trim().slice(0, 20);
        if (trimmed) {
            setStoredUsername(trimmed);
            setGuestName(trimmed);
            updateGuestDailyPlayer({ displayName: trimmed });
            setGuestNameState(trimmed);
        }
        setIsEditingGuestName(false);
    }, [editGuestNameValue]);

    // Aggregate badge: gifts + notifications + completed quests
    const badgeCount = unclaimedCount + (isAuthenticated ? notificationCount : 0) + completedCount;

    // Badge is hidden when the user has already seen at least this many items.
    // New items pushing the count above the persisted high-water mark resurface it.
    const badgeSeen = badgeCount <= lastSeenBadgeCount;

    const markBadgeSeen = useCallback((count: number) => {
        setLastSeenBadgeCount(count);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('mobileMenu.lastSeenBadgeCount', String(count));
        }
    }, []);

    // If the count drops (e.g. user dismissed notifications elsewhere), clamp the
    // stored marker so a future increase still triggers the badge correctly.
    // Skip while missions are loading — completedCount is temporarily 0 on mount.
    useEffect(() => {
        if (badgeCount < lastSeenBadgeCount && !missionsLoading) {
            markBadgeSeen(badgeCount);
        }
    }, [badgeCount, lastSeenBadgeCount, markBadgeSeen, missionsLoading]);

    // Friends activity badge — surfaces incoming requests, pending challenges, unread DMs
    const pathname = usePathname();
    const { pendingRequests, pendingChallenges } = useFriends();
    const { unreadCount: friendMessageUnread } = useFriendMessages();
    const friendsActivityCount = isAuthenticated
        ? pendingRequests.length + pendingChallenges.length + friendMessageUnread
        : 0;
    const [lastSeenFriendsCount, setLastSeenFriendsCount] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        const raw = window.localStorage.getItem('mobileMenu.lastSeenFriendsCount');
        const parsed = raw ? Number.parseInt(raw, 10) : 0;
        return Number.isFinite(parsed) ? parsed : 0;
    });
    const markFriendsSeen = useCallback((count: number) => {
        setLastSeenFriendsCount(count);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('mobileMenu.lastSeenFriendsCount', String(count));
        }
    }, []);
    // Clamp high-water mark down when count drops (items handled elsewhere)
    useEffect(() => {
        if (friendsActivityCount < lastSeenFriendsCount) {
            markFriendsSeen(friendsActivityCount);
        }
    }, [friendsActivityCount, lastSeenFriendsCount, markFriendsSeen]);
    // Clear badge when user navigates to /friends (via menu click OR direct URL)
    useEffect(() => {
        if (pathname?.includes('/friends')) {
            markFriendsSeen(friendsActivityCount);
        }
    }, [pathname, friendsActivityCount, markFriendsSeen]);
    const friendsBadgeCount = Math.max(0, friendsActivityCount - lastSeenFriendsCount);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const isRtl = language === 'he';

    // Close mobile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setShowMobileMenu(false);
            }
        };
        if (showMobileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMobileMenu]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setShowMobileMenu(false);
        };
        if (showMobileMenu) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showMobileMenu]);

    // Lock body scroll when menu is open
    useEffect(() => {
        if (showMobileMenu) {
            document.body.style.overflow = 'hidden';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showMobileMenu]);

    const closeMenu = useCallback(() => setShowMobileMenu(false), []);

    const handleSignIn = useCallback(() => { closeMenu(); onSignIn(); }, [closeMenu, onSignIn]);
    const handleSignUp = useCallback(() => { closeMenu(); onSignUp(); }, [closeMenu, onSignUp]);
    const handleOpenGift = useCallback(() => { closeMenu(); onOpenGiftModal(); }, [closeMenu, onOpenGiftModal]);

    // Swipe-to-close (RTL-aware) — passive touch tracking, NOT framer `drag`.
    // A framer drag gesture on the drawer fights vertical scrolling: any
    // diagonal movement engages the elastic horizontal drag, so the menu
    // shakes / springs back instead of scrolling. We instead detect a
    // deliberate horizontal swipe on touchend and never translate the element,
    // leaving native vertical scrolling completely untouched.
    const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const handleTouchStart = useCallback((e: ReactTouchEvent) => {
        const touch = e.touches[0];
        swipeStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    }, []);
    const handleTouchEnd = useCallback((e: ReactTouchEvent) => {
        const start = swipeStartRef.current;
        swipeStartRef.current = null;
        const touch = e.changedTouches[0];
        if (!start || !touch) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        // Vertical-dominant or short gestures are scrolls — ignore them.
        if (Math.abs(dx) < SWIPE_CLOSE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
        const closing = isRtl ? dx < 0 : dx > 0;
        if (closing) setShowMobileMenu(false);
    }, [isRtl]);

    const storedAvatar = getStoredCustomAvatar();
    const avatarConfig = isAuthenticated
        ? (profile?.avatar_config ?? storedAvatar)
        : storedAvatar;

    return (
        <>
            {/* Mobile-only inline strip: Volume + Lang + Auth.
                Desktop already renders these via HeaderDesktopControls,
                so we keep the trio gated `sm:hidden` to avoid duplicates. */}
            <div className="sm:hidden flex items-center gap-2 min-w-0 shrink-0">
                <MusicControls />

                {/* Quick UI-language pill — always visible on mobile (incl. CrazyGames),
                    so embed players can switch language without the hamburger menu. */}
                <QuickLanguageSwitcher compact />

                {/* Unified auth button for guests (hidden on CrazyGames).
                    Also gated on `cgLoading` so the button does not flash
                    before the SDK resolves the embed environment.
                    `mounted` gate prevents hydration-shape drift: SSR
                    renders before `loading`/`cgLoading` resolve to false,
                    so the button SSR-state would not match its post-hydrate
                    state and shifted sibling positions. */}
                {mounted && !isAuthenticated && !loading && !cgLoading && !isCrazyGames && (
                    <button
                        onClick={onSignIn}
                        className={cn(
                            "hidden min-[420px]:flex items-center gap-1 shrink-0",
                            "px-2.5 py-1.5 h-9 min-h-[36px]",
                            "bg-neo-cyan text-neo-black",
                            "border-2 border-neo-black",
                            "rounded-neo shadow-hard-sm",
                            "hover:-translate-x-px hover:-translate-y-px hover:shadow-hard",
                            "active:translate-x-px active:translate-y-px active:shadow-none",
                            "transition-all duration-100",
                            "text-[11px] font-bold whitespace-nowrap"
                        )}
                        aria-label={t('auth.signIn')}
                    >
                        <User size={12} aria-hidden="true" />
                        <span>{t('auth.signIn')}</span>
                    </button>
                )}
            </div>

            {/*
              Hamburger Button — visible at ALL breakpoints (mobile + desktop).
              Replaces the legacy desktop dropdown so both viewports share the
              same side-drawer menu.
              Hidden on CrazyGames: the menu exposes profile / settings /
              leaderboard / cookie banner / Ko-fi / Instagram links that
              would all navigate the player off-mode (CG is multiplayer-only).
              `mounted` gate: SSR cannot resolve `isCrazyGames` (SDK loads
              client-only); deferring keeps SSR ↔ first-client render
              identical, preventing Radix Select aria-controls drift on
              the sibling QuickLanguageSwitcher.
            */}
            {mounted && !isCrazyGames && (
                <button
                    onClick={async () => {
                        if (!showMobileMenu) {
                            if (notificationCount > 0) {
                                await markAllAsRead();
                            }
                            markBadgeSeen(badgeCount);
                        }
                        setShowMobileMenu(!showMobileMenu);
                    }}
                    className={cn(
                        "relative flex items-center justify-center shrink-0",
                        "w-11 h-11 min-w-[44px] min-h-[44px]",
                        "bg-neo-cream text-neo-black",
                        "border-3 border-neo-black",
                        "rounded-neo shadow-hard-sm",
                        "hover:-translate-x-px hover:-translate-y-px hover:shadow-hard",
                        "active:translate-x-px active:translate-y-px active:shadow-none",
                        "transition-all duration-100"
                    )}
                    aria-label={showMobileMenu ? t('common.closeMenu') : t('common.openMenu')}
                    aria-expanded={showMobileMenu}
                    aria-haspopup="true"
                >
                    <m.div
                        animate={{ rotate: showMobileMenu ? 90 : 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                    >
                        {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
                    </m.div>
                    {/* Aggregated badge */}
                    {badgeCount > 0 && !showMobileMenu && !badgeSeen && (
                        <div className="absolute -top-1.5 -inset-e-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-neo-red rounded-full border-2 border-neo-cream text-[10px] font-black text-white leading-none">{badgeCount}</div>
                    )}
                </button>
            )}

            {/* Mobile Menu Slide-out Pane (also hidden on CrazyGames) */}
            {!isCrazyGames && mounted && createPortal(
                <LazyMotion features={domAnimation}>
                <>
                    {showMobileMenu && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 bg-neo-black/60 backdrop-blur-[2px] z-70 animate-in fade-in-0 duration-200"
                                onClick={closeMenu}
                            />

                            {/* Slide-out pane with swipe-to-close */}
                            <div
                                ref={mobileMenuRef}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                                data-testid="mobile-menu-drawer"
                                className={cn(
                                    "fixed top-0 bottom-0 w-[320px] sm:w-[360px] max-w-[88vw] z-80",
                                    // Viewport-relative height cap. The drawer is `fixed top-0
                                    // bottom-0`, so it sizes to its containing block — normally the
                                    // viewport. But the native WebView repaint hack briefly sets
                                    // `transform: translateZ(0)` on <html>; if that transform lingers
                                    // (rAF starved under native-ad compositing), <html> becomes the
                                    // containing block and the drawer grows to the DOCUMENT height.
                                    // Its overflow-y-auto body then fits all content without
                                    // overflowing, so the menu can't scroll while still looking full.
                                    // `max-h-[100dvh]` keeps it bounded to the visible viewport
                                    // regardless of which ancestor is the containing block.
                                    "max-h-[100dvh]",
                                    "bg-neo-navy border-neo-black",
                                    // Non-scrolling shell. Vertical scrolling lives on the inner
                                    // body below; swipe-to-close is handled by the passive touch
                                    // handlers above (no framer `drag`, so nothing fights scroll).
                                    "shadow-hard-xl overflow-hidden flex flex-col",
                                    'animate-in duration-300',
                                    isRtl
                                        ? "left-0 border-r-4 rounded-r-neo-lg slide-in-from-left-full"
                                        : "right-0 border-l-4 rounded-l-neo-lg slide-in-from-right-full"
                                )}
                            >
                              {/* ── Scrollable body — owns vertical scroll, decoupled from the
                                  swipe-to-close drag layer so native touch scroll works. ── */}
                              <div
                                data-testid="mobile-menu-scroll"
                                className={cn(
                                    "relative flex-1 min-h-0",
                                    "overflow-y-auto overflow-x-hidden overscroll-contain",
                                    "pb-[max(env(safe-area-inset-bottom),1rem)]"
                                )}
                                style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
                              >
                                {/* ── Close button (top corner) ── */}
                                <div
                                    className={cn(
                                        "absolute z-10",
                                        isRtl ? "right-3" : "left-3"
                                    )}
                                    style={{ top: 'max(0.75rem, calc(env(safe-area-inset-top, 0px) + 0.25rem))' }}
                                >
                                    <button
                                        onClick={closeMenu}
                                        className={cn(
                                            "flex items-center justify-center",
                                            "w-9 h-9",
                                            "bg-neo-white/10 text-neo-white",
                                            "border-2 border-neo-white/20",
                                            "rounded-full",
                                            "hover:bg-neo-white/20 hover:text-neo-white",
                                            "active:scale-90",
                                            "transition-all duration-100"
                                        )}
                                        aria-label={t('common.closeMenu')}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* ── Profile Hero Section ── */}
                                <div
                                    className={cn(
                                        "relative px-5 pb-5",
                                        "bg-linear-to-b from-neo-purple/30 via-neo-navy to-neo-navy",
                                        "border-b-3 border-neo-black/40"
                                    )}
                                    style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top, 0px) + 2.25rem))' }}
                                >
                                    {/* Decorative dots */}
                                    <div className="absolute top-2 right-4 flex gap-1 opacity-30">
                                        <div className="w-1.5 h-1.5 rounded-full bg-neo-pink" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-neo-cyan" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-neo-lime" />
                                    </div>

                                    {isAuthenticated && profile ? (
                                        <Link href={`/${language}/profile`} onClick={closeMenu} className="block group">
                                            <div className="flex items-center gap-3.5">
                                                <div className="relative shrink-0">
                                                    <div className={cn(
                                                        'rounded-full border-3 shadow-hard-sm p-0.5 bg-neo-navy group-hover:border-neo-cyan transition-colors',
                                                        playerStyle.accentHex ? 'border-accent' : 'border-neo-lime'
                                                    )}>
                                                        <Avatar
                                                            customAvatar={avatarConfig}
                                                            userId={user?.id}
                                                            size="lg"
                                                        />
                                                    </div>
                                                    {/* Level badge */}
                                                    {profile.current_level != null && (
                                                        <div className="absolute -bottom-1 -right-1 bg-neo-lime text-neo-black text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-neo-black shadow-hard-sm">
                                                            {profile.current_level}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-base font-black text-neo-white truncate">
                                                            {profile.display_name || profile.username}
                                                        </span>
                                                        {/* Player title — score-based rank tier, fully translated
                                                            via rank.tier.* in all 5 languages. */}
                                                        <RankTierChip tier={scoreTier(profile.total_score)} size="xs" className="shrink-0" />
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <CoinBalance coins={profile.total_coins || 0} size="md" showSparkle />
                                                    </div>
                                                    {engagementStatus.streak > 0 && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Flame className="w-3.5 h-3.5 text-neo-orange fill-current" />
                                                            <span className="text-[10px] font-black text-neo-orange">{engagementStatus.streak}</span>
                                                            <span className="text-[10px] font-bold text-neo-cyan/80">
                                                                {t('streakBar.level', { level: engagementStatus.level })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {profile.total_games != null && profile.total_games > 0 && (
                                                        <span className="text-[10px] text-neo-white mt-0.5 font-bold">
                                                            {profile.total_games} {t('profile.gamesPlayed')}
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronRight className={cn(
                                                    "ms-auto w-4 h-4 text-neo-white group-hover:text-neo-white transition-colors shrink-0",
                                                    isRtl && "rotate-180"
                                                )} />
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-full border-3 border-neo-white/20 shadow-hard-sm p-0.5 bg-neo-navy">
                                                    <Avatar
                                                        customAvatar={avatarConfig}
                                                        userId="guest"
                                                        size="lg"
                                                    />
                                                </div>
                                                {isEditingGuestName ? (
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <input
                                                            ref={guestNameInputRef}
                                                            type="text"
                                                            value={editGuestNameValue}
                                                            onChange={(e) => setEditGuestNameValue(e.target.value)}
                                                            maxLength={20}
                                                            className="bg-neo-navy/80 text-neo-white border-2 border-neo-cyan rounded-neo px-2 py-1 text-base font-bold focus:outline-hidden focus:ring-2 focus:ring-neo-cyan w-full max-w-[160px]"
                                                            onKeyDown={(e) => {
                                                                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                                                                if (e.key === 'Enter') handleSaveGuestName();
                                                                if (e.key === 'Escape') setIsEditingGuestName(false);
                                                            }}
                                                            onBlur={handleSaveGuestName}
                                                        />
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleStartEditGuestName}
                                                        className="flex items-center gap-2 group min-w-0"
                                                    >
                                                        <span className="text-base font-black text-neo-white group-hover:text-neo-cyan transition-colors truncate">
                                                            {guestName || t('common.guest')}
                                                        </span>
                                                        <Pencil className="w-3.5 h-3.5 text-neo-white group-hover:text-neo-cyan shrink-0 transition-colors" />
                                                    </button>
                                                )}
                                            </div>
                                            <AuthButton
                                                inline
                                                onClose={closeMenu}
                                                onSignInClick={handleSignIn}
                                                onSignUpClick={handleSignUp}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Daily Missions (expanded) */}
                                {isAuthenticated && missions.length > 0 && (
                                    <div className="mx-4 mt-2 space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <Trophy className="w-4 h-4 text-neo-lime shrink-0" />
                                                <span className="text-[10px] font-black text-neo-white uppercase tracking-widest">
                                                    {t('dailyMissions.title')}
                                                </span>
                                            </div>
                                            <span className={cn(
                                                "text-xs font-black",
                                                isGrandSlam ? "text-neo-lime" : "text-neo-white"
                                            )}>
                                                {completedCount}/{missions.length}
                                            </span>
                                        </div>
                                        {missions.map((m) => (
                                            <Link
                                                key={m.type}
                                                href={`/${language}${m.href}`}
                                                onClick={closeMenu}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2 rounded-neo",
                                                    m.completed
                                                        ? "bg-neo-lime/10 border border-neo-lime/30"
                                                        : "bg-neo-white/5 border border-neo-white/10 hover:border-neo-lime/30",
                                                    "transition-colors"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                                                    m.completed ? "border-neo-lime bg-neo-lime/20" : "border-neo-white/20"
                                                )}>
                                                    {m.completed && <Check size={10} className="text-neo-lime" />}
                                                </div>
                                                <span className={cn(
                                                    "text-xs font-bold flex-1",
                                                    m.completed ? "text-neo-lime/80 line-through" : "text-neo-white"
                                                )}>
                                                    {t(`dailyMissions.${m.type}`)}
                                                </span>
                                            </Link>
                                        ))}
                                        <Link
                                            href={`/${language}/quests`}
                                            onClick={closeMenu}
                                            className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-neo-cyan hover:text-neo-lime transition-colors"
                                        >
                                            <Sparkles size={10} />
                                            {t('quests.title')}
                                        </Link>
                                    </div>
                                )}

                                {/* ── Notifications Section (in-menu) ── */}
                                {isAuthenticated && (
                                    <div className="mx-4 mt-2">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <Bell className="w-3.5 h-3.5 text-neo-lime" />
                                                <span className="text-[10px] font-black text-neo-white uppercase tracking-widest">
                                                    {t('notifications.title')}
                                                </span>
                                                {notificationCount > 0 && (
                                                    <span className="min-w-[16px] h-4 px-1 flex items-center justify-center bg-neo-lime rounded-full border border-black text-[9px] font-black text-black">
                                                        {notificationCount}
                                                    </span>
                                                )}
                                            </div>
                                            {notificationCount > 0 && (
                                                <button
                                                    onClick={() => markAllAsRead()}
                                                    className="flex items-center gap-1 text-[10px] text-neo-cyan hover:text-neo-lime transition-colors font-bold"
                                                >
                                                    <Check size={10} />
                                                    {t('notifications.markAllRead')}
                                                </button>
                                            )}
                                        </div>
                                        {filteredNotifications.length > 0 ? (
                                            <>
                                                <div className={cn(
                                                    "rounded-neo border-2 border-neo-white/10",
                                                    "bg-neo-white/5",
                                                    notificationListScrollClass(
                                                        showAllNotifications ? filteredNotifications.length : Math.min(3, filteredNotifications.length),
                                                        "max-h-72"
                                                    )
                                                )}>
                                                    {(showAllNotifications
                                                        ? filteredNotifications
                                                        : filteredNotifications.slice(0, 3)
                                                    ).map((n) => (
                                                        <NotificationItem
                                                            key={n.id}
                                                            notification={n}
                                                            onClick={() => {
                                                                if (n.notification_type === 'gift') {
                                                                    closeMenu();
                                                                    window.dispatchEvent(new CustomEvent('openGiftModal', {
                                                                        detail: { giftId: n.related_entity_id },
                                                                    }));
                                                                } else if (n.action_url) {
                                                                    closeMenu();
                                                                    const url = n.action_url.startsWith('/') ? `/${language}${n.action_url}` : n.action_url;
                                                                    window.location.href = url;
                                                                }
                                                            }}
                                                            onMarkAsRead={() => markAsRead(n.id)}
                                                            onDismiss={() => dismissNotification(n.id)}
                                                        />
                                                    ))}
                                                </div>
                                                {filteredNotifications.length > 3 && (
                                                    <button
                                                        onClick={() => setShowAllNotifications(!showAllNotifications)}
                                                        className="w-full mt-1 text-center text-[10px] text-neo-white hover:text-neo-cyan transition-colors font-bold py-1"
                                                    >
                                                        {showAllNotifications
                                                            ? t('common.showLess')
                                                            : t('notifications.viewAll') + ` (${filteredNotifications.length})`
                                                        }
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-[10px] text-neo-white text-center py-2 font-bold">
                                                {t('notifications.empty')}
                                            </div>
                                        )}
                                        <button
                                            onClick={togglePreviousNotifications}
                                            className="w-full mt-1 text-center text-[10px] text-neo-white hover:text-neo-cyan transition-colors font-bold py-1"
                                            aria-expanded={showPreviousNotifications}
                                        >
                                            {showPreviousNotifications
                                                ? t('notifications.hidePrevious')
                                                : t('notifications.showPrevious')}
                                        </button>
                                        {showPreviousNotifications && (
                                            <div className={cn(
                                                "mt-1 rounded-neo border-2 border-neo-white/10",
                                                "bg-neo-white/5",
                                                notificationListScrollClass(previousNotifications.length, "max-h-64")
                                            )}>
                                                {isLoadingPrevious ? (
                                                    <div className="text-[10px] text-neo-white text-center py-2">
                                                        …
                                                    </div>
                                                ) : previousNotifications.length === 0 ? (
                                                    <div className="text-[10px] text-neo-white text-center py-2 font-bold">
                                                        {t('notifications.noPrevious')}
                                                    </div>
                                                ) : (
                                                    previousNotifications.map((n) => (
                                                        <NotificationItem
                                                            key={`prev-${n.id}`}
                                                            notification={n as NotificationData}
                                                            onClick={() => {
                                                                if (n.action_url) {
                                                                    closeMenu();
                                                                    const url = n.action_url.startsWith('/') ? `/${language}${n.action_url}` : n.action_url;
                                                                    window.location.href = url;
                                                                }
                                                            }}
                                                            onMarkAsRead={() => markAsRead(n.id)}
                                                            onDismiss={() => dismissNotification(n.id)}
                                                        />
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Menu Items (Staggered) ── */}
                                <div
                                    className="flex flex-col gap-1.5 p-4"
                                >
                                    {/* Gift Notification - highlighted */}
                                    {isAuthenticated && unclaimedCount > 0 && !giftBannerDismissed && (
                                        <div>
                                            <div className="relative">
                                                <button
                                                    onClick={handleOpenGift}
                                                    className={cn(
                                                        "relative flex items-center gap-3 w-full px-4 py-3 text-sm font-bold rounded-neo",
                                                        "bg-linear-to-r from-amber-500/90 to-amber-400/90 text-neo-black",
                                                        "border-3 border-neo-black shadow-hard-sm",
                                                        "hover:shadow-hard hover:-translate-y-px",
                                                        "active:translate-y-px active:shadow-none",
                                                        "transition-all duration-100"
                                                    )}
                                                >
                                                    <MenuIcon className="bg-white/30 border-neo-black/30">
                                                        <Gift className="w-4 h-4" aria-hidden="true" />
                                                    </MenuIcon>
                                                    <span>{t('gift.youHaveGifts') || `You have ${unclaimedCount} gift${unclaimedCount !== 1 ? 's' : ''}`}</span>
                                                    <GiftNotificationBadge count={unclaimedCount} className="relative top-0 right-0" />
                                                    <Sparkles className="absolute top-1 right-2 w-3 h-3 text-white animate-pulse" aria-hidden="true" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setGiftBannerDismissed(true);
                                                        // Persist dismissal to DB so it doesn't reappear on refresh
                                                        fetch('/api/player/gifts/dismiss-modal', { method: 'POST' })
                                                            .then(() => {
                                                                // Invalidate gift queries so unclaimedCount updates
                                                                queryClient.invalidateQueries({ queryKey: queryKeys.gifts._def });
                                                            })
                                                            .catch(() => {});
                                                        // Also dismiss any gift-type notifications from the notification list
                                                        (notifications as NotificationData[])
                                                            .filter(n => n.notification_type === 'gift')
                                                            .forEach(n => dismissNotification(n.id));
                                                    }}
                                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-neo-black/80 border-2 border-neo-white/20 flex items-center justify-center text-neo-white hover:text-neo-white hover:bg-neo-black transition-colors z-10"
                                                    aria-label={t('notifications.dismiss')}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ─ Get the App (durable Android install re-entry; self-hides off Android) ─ */}
                                    <div>
                                        <GetAppMenuRow onNavigate={closeMenu} />
                                    </div>

                                    {/* ─ Settings Section ─ */}
                                    <div>
                                        <SectionLabel>{t('settings.title')}</SectionLabel>
                                    </div>

                                    <div>
                                        <div className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-neo",
                                            "bg-neo-white/5 border-2 border-neo-white/10"
                                        )}>
                                            <span className="text-sm font-bold text-neo-white">
                                                {t('settings.language')}
                                            </span>
                                            <div className="ms-auto">
                                                <QuickLanguageSwitcher showLabel />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <MenuLink href={`/${language}/settings#accessibility`} onClick={closeMenu} accentColor="cyan">
                                            <MenuIcon className="bg-neo-cyan/20 border-neo-cyan/40">
                                                <Accessibility className="w-4 h-4 text-neo-cyan" aria-hidden="true" />
                                            </MenuIcon>
                                            <span>{t('settings.accessibility')}</span>
                                        </MenuLink>
                                    </div>

                                    <div>
                                        <MenuLink href={`/${language}/settings`} onClick={closeMenu} accentColor="cyan">
                                            <MenuIcon className="bg-neo-cyan/20 border-neo-cyan/40">
                                                <Settings className="w-4 h-4 text-neo-cyan" aria-hidden="true" />
                                            </MenuIcon>
                                            <span>{t('settings.moreSettings')}</span>
                                        </MenuLink>
                                    </div>

                                    {/* ─ Community ─ */}
                                    <div>
                                        <SectionLabel>{t('ugc.nav.community')}</SectionLabel>
                                    </div>

                                    <div>
                                        <MenuLink href={`/${language}/community`} onClick={closeMenu} accentColor="pink">
                                            <MenuIcon className="bg-neo-pink/20 border-neo-pink/40">
                                                <Users className="w-4 h-4 text-neo-pink" aria-hidden="true" />
                                            </MenuIcon>
                                            <span>{t('ugc.nav.community')}</span>
                                        </MenuLink>
                                    </div>

                                    <div className="relative">
                                        <MenuLink href={`/${language}/friends`} onClick={closeMenu} accentColor="cyan">
                                            <MenuIcon className="bg-neo-cyan/20 border-neo-cyan/40">
                                                <UserPlus className="w-4 h-4 text-neo-cyan" aria-hidden="true" />
                                            </MenuIcon>
                                            <span>{t('nav.friends')}</span>
                                        </MenuLink>
                                        <GiftNotificationBadge count={friendsBadgeCount} />
                                    </div>

                                    {/* ─ Admin ─ */}
                                    {isAdmin && (
                                        <>
                                            <div>
                                                <SectionLabel>{t('common.admin')}</SectionLabel>
                                            </div>
                                            <div>
                                                <Link
                                                    href={`/${language}/admin`}
                                                    onClick={closeMenu}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo w-full",
                                                        "bg-linear-to-r from-neo-pink/30 to-neo-pink/10 text-neo-white",
                                                        "border-2 border-neo-pink/40",
                                                        "hover:border-neo-pink/60 hover:from-neo-pink/40",
                                                        "active:scale-[0.98]",
                                                        "transition-all duration-100"
                                                    )}
                                                >
                                                    <MenuIcon className="bg-neo-pink/30 border-neo-pink/50">
                                                        <Sparkles className="w-4 h-4 text-neo-pink" aria-hidden="true" />
                                                    </MenuIcon>
                                                    <span>{t('common.adminDashboard')}</span>
                                                </Link>
                                            </div>
                                        </>
                                    )}

                                    {/* ─ Info Links ─ */}
                                    <div>
                                        <SectionLabel>{t('common.info')}</SectionLabel>
                                    </div>

                                    {/* Report a Bug — promoted to a prominent full-width action so
                                        players can flag issues from anywhere. Routes to /api/feedback
                                        (Supabase + Telegram + email). */}
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => { closeMenu(); setShowBugReport(true); }}
                                            className={cn(
                                                "flex items-center gap-3 w-full px-4 py-3 text-sm font-bold rounded-neo",
                                                "bg-linear-to-r from-neo-pink/30 to-neo-purple/20 text-neo-white",
                                                "border-2 border-neo-pink/40",
                                                "hover:border-neo-pink/60 hover:from-neo-pink/40",
                                                "active:scale-[0.98]",
                                                "transition-all duration-100"
                                            )}
                                        >
                                            <MenuIcon className="bg-neo-pink/30 border-neo-pink/50">
                                                <Bug className="w-4 h-4 text-neo-pink" aria-hidden="true" />
                                            </MenuIcon>
                                            <span>{t('bugReport.menuLabel')}</span>
                                        </button>
                                    </div>

                                    <div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <InfoLink href={`/${language}/about`} onClick={closeMenu} icon={<Info className="w-3.5 h-3.5" />} color="bg-neo-cyan/20 text-neo-cyan">{t('footer.about')}</InfoLink>
                                            <InfoLink href={`/${language}/faq`} onClick={closeMenu} icon={<HelpCircle className="w-3.5 h-3.5" />} color="bg-neo-purple/20 text-neo-purple">{t('footer.faq')}</InfoLink>
                                            <InfoLink href={`/${language}/leaderboard`} onClick={closeMenu} icon={<Trophy className="w-3.5 h-3.5" />} color="bg-neo-lime/20 text-neo-lime">{t('footer.leaderboard')}</InfoLink>
                                            <InfoLink href={`/${language}/contact`} onClick={closeMenu} icon={<Mail className="w-3.5 h-3.5" />} color="bg-neo-white/10 text-neo-white">{t('footer.contact')}</InfoLink>
                                            <InfoLink href={`/${language}/legal`} onClick={closeMenu} icon={<ScrollText className="w-3.5 h-3.5" />} color="bg-neo-pink/20 text-neo-pink-light">{t('legal.title')}</InfoLink>
                                            <InfoLinkExternal href="https://ko-fi.com/lexiclash" onClick={closeMenu} icon={<Coffee className="w-3.5 h-3.5" />} color="bg-neo-pink/30 text-neo-pink" label={t('common.opensInNewTab')}>{t('support.kofiFooter')}</InfoLinkExternal>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <a
                                                href="https://www.instagram.com/lexi.clash"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={closeMenu}
                                                aria-label="Instagram"
                                                className={cn(
                                                    "flex items-center gap-2 flex-1 px-3 py-2 text-xs font-bold rounded-neo",
                                                    "bg-linear-to-r from-purple-500/20 to-pink-500/20 text-neo-white",
                                                    "border-2 border-neo-white/10",
                                                    "hover:border-neo-white/20 hover:text-neo-white",
                                                    "transition-all duration-100"
                                                )}
                                            >
                                                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-linear-to-br from-purple-500 to-pink-500 text-white">
                                                    <InstagramIcon className="w-3 h-3" size="0.75em" />
                                                </span>
                                                <span>Instagram</span>
                                            </a>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={closeMenu}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeMenu(); } }}
                                                className={cn(
                                                    "flex items-center gap-2 flex-1 px-3 py-2 text-xs font-bold rounded-neo cursor-pointer",
                                                    "bg-neo-white/5 text-neo-white",
                                                    "border-2 border-neo-white/10",
                                                    "hover:border-neo-white/20 hover:text-neo-white",
                                                    "transition-all duration-100"
                                                )}
                                            >
                                                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-neo-lime/20 text-neo-lime">
                                                    <Cookie className="w-3 h-3" aria-hidden="true" />
                                                </span>
                                                <ManageCookiesButton />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ─ Account (Login/Logout) ─ */}
                                    {isAuthenticated && (
                                        <>
                                            <div>
                                                <SectionLabel>{t('common.account')}</SectionLabel>
                                            </div>
                                            <div>
                                                <AuthButton
                                                    inline
                                                    onClose={closeMenu}
                                                    onSignInClick={handleSignIn}
                                                    onSignUpClick={handleSignUp}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Swipe hint */}
                                    <div className="flex justify-center pt-2 pb-1">
                                        <span className="text-[10px] text-neo-white font-bold">
                                            {isRtl ? '← ' : ''}
                                            {t('common.swipeToClose') || 'Swipe to close'}
                                            {!isRtl ? ' →' : ''}
                                        </span>
                                    </div>
                                </div>
                              </div>
                            </div>
                        </>
                    )}
                </>
                </LazyMotion>,
                document.body
            )}

            <ReportBugModal isOpen={showBugReport} onClose={() => setShowBugReport(false)} />
        </>
    );
});

// Despite the legacy filename, this component now renders the unified
// side drawer for both mobile and desktop viewports.
HeaderMobileMenu.displayName = 'HeaderSideMenu';

export default HeaderMobileMenu;

// --- Helper sub-components ---

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 pt-3 pb-1 px-1">
            <span className="text-[10px] font-black text-neo-white uppercase tracking-widest">
                {children}
            </span>
            <div className="flex-1 h-px bg-neo-white/10" />
        </div>
    );
}

function MenuIcon({ className, children }: { className: string; children: React.ReactNode }) {
    return (
        <span className={cn(
            "flex items-center justify-center w-7 h-7 rounded-lg border-2 shrink-0",
            className
        )}>
            {children}
        </span>
    );
}

function MenuLink({ href, onClick, accentColor, children }: {
    href: string;
    onClick: () => void;
    accentColor: 'cyan' | 'pink' | 'lime' | 'purple';
    children: React.ReactNode;
}) {
    const hoverColors = {
        cyan: 'hover:border-neo-cyan/40',
        pink: 'hover:border-neo-pink/40',
        lime: 'hover:border-neo-lime/40',
        purple: 'hover:border-neo-purple/40',
    };

    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo w-full",
                "bg-neo-white/5 text-neo-white",
                "border-2 border-neo-white/10",
                hoverColors[accentColor],
                "hover:bg-neo-white/8",
                "active:scale-[0.98]",
                "transition-all duration-100"
            )}
        >
            {children}
        </Link>
    );
}

function InfoLink({ href, onClick, icon, color, children }: {
    href: string;
    onClick: () => void;
    icon: React.ReactNode;
    color: string;
    children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-xs font-bold rounded-neo",
                "bg-neo-white/5 text-neo-white",
                "border-2 border-neo-white/10",
                "hover:border-neo-white/20 hover:text-neo-white",
                "active:scale-[0.97]",
                "transition-all duration-100"
            )}
        >
            <span className={cn("flex items-center justify-center w-5 h-5 rounded-md", color)}>
                {icon}
            </span>
            <span className="truncate">{children}</span>
        </Link>
    );
}

function InfoLinkExternal({ href, onClick, icon, color, label, children }: {
    href: string;
    onClick: () => void;
    icon: React.ReactNode;
    color: string;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            aria-label={`${children} (${label})`}
            className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-xs font-bold rounded-neo",
                "bg-neo-white/5 text-neo-white",
                "border-2 border-neo-white/10",
                "hover:border-neo-white/20 hover:text-neo-white",
                "active:scale-[0.97]",
                "transition-all duration-100"
            )}
        >
            <span className={cn("flex items-center justify-center w-5 h-5 rounded-md", color)}>
                {icon}
            </span>
            <span className="truncate">{children}</span>
        </a>
    );
}
