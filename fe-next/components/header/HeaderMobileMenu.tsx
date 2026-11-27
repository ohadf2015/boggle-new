import { memo, useCallback, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { Menu, X, Gift, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayerStyle } from '../../contexts/PlayerStyleContext';
import { cn } from '../../lib/utils';
import { neoChunkyPress } from '@/components/ui/neoStyles';
import { usePress } from '@/components/motion/usePress';
import AuthButton from '../auth/AuthButton';
import MusicControls from '../MusicControls';
import { ReportBugModal } from '../feedback/ReportBugModal';
import { scoreTier } from '@/lib/seasons/scoreTier';
import { DrawerProfileHero } from './DrawerProfileHero';
import { GiftNotificationBadge } from '../gift/GiftNotificationBadge';
import { QuickLanguageSwitcher } from '../QuickLanguageSwitcher';
import type { NotificationData } from '../notifications/types';
import { teacherMenuEntry } from '@/lib/education/teacherRole';
import { getStoredCustomAvatar } from '../../utils/profileStorage';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import { useDailyMissions } from '@/hooks/useDailyMissions';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useCrazyGamesAuth } from '@/hooks/useCrazyGamesAuth';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useFriends } from '@/hooks/useFriends';
import { useFriendMessages } from '@/hooks/useFriendMessages';
import { queryKeys } from '@/lib/queryKeys';
import { DrawerNotifications } from './drawer/DrawerNotifications';
import { DrawerNavSections } from './drawer/DrawerNavSections';
import { DrawerGuestHero } from './drawer/DrawerGuestHero';

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
    const teacherEntry = teacherMenuEntry(profile);
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

    // Aggregate badge: unclaimed gifts + unread notifications only.
    // Completed daily missions are progress, not claimable rewards — counting
    // them kept the hamburger badge lit after the rewards had already been paid.
    const badgeCount = unclaimedCount + (isAuthenticated ? notificationCount : 0);

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
    const signInPress = usePress<HTMLButtonElement>();
    const menuPress = usePress<HTMLButtonElement>();
    useEffect(() => { setMounted(true); }, []);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const isRtl = language === 'he';

    // Close mobile menu when clicking outside. Radix popovers/selects/dropdowns
    // rendered inside the drawer (e.g. the Language row's <Select>) portal their
    // open content straight to document.body — a DOM *sibling* of the drawer,
    // not a descendant — so `mobileMenuRef.contains(target)` is false for them.
    // Without this guard, opening/using any such control reads as an "outside"
    // click and slams the whole drawer shut mid-interaction. Every Radix portal
    // node is stamped with `data-radix-popper-content-wrapper`, so exempt it.
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (target instanceof Element && target.closest('[data-radix-popper-content-wrapper]')) {
                return;
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
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
    const dismissGiftBanner = useCallback(() => {
        setGiftBannerDismissed(true);
        fetch('/api/player/gifts/dismiss-modal', { method: 'POST' })
            .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.gifts._def }))
            .catch(() => {});
        (notifications as NotificationData[])
            .filter(n => n.notification_type === 'gift')
            .forEach(n => dismissNotification(n.id));
    }, [queryClient, notifications, dismissNotification]);

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
            {/* Mobile-only inline strip: Volume + Auth.
                Desktop already renders these via HeaderDesktopControls,
                so we keep it gated `sm:hidden` to avoid duplicates. */}
            <div className="sm:hidden flex items-center gap-1.5 min-w-0 shrink-0">
                <MusicControls compact />

                {/* Language picker stays in the header on phones and desktop.
                    (PR #2128 had moved the phone pill into the drawer only.) */}
                <QuickLanguageSwitcher compact className="min-w-9 h-9 px-1.5 border-2" />

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
                        {...signInPress}
                        className={cn(
                            "hidden min-[420px]:flex items-center gap-1 shrink-0",
                            "px-2.5 py-1.5 h-9 min-h-[36px]",
                            "bg-neo-cyan text-neo-black",
                            "border-2 border-neo-black rounded-neo",
                            neoChunkyPress(2),
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
                    {...menuPress}
                    className={cn(
                        "relative flex items-center justify-center shrink-0",
                        "w-9 h-9 min-w-9 min-h-9 sm:w-11 sm:h-11 sm:min-w-[44px] sm:min-h-[44px]",
                        "bg-neo-cream text-neo-black",
                        "border-2 sm:border-3 border-neo-black rounded-neo",
                        neoChunkyPress(2)
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
                    {showMobileMenu && (
                        <>
                            <div
                                className="fixed inset-0 bg-neo-black/60 backdrop-blur-[2px] z-70 animate-in fade-in-0 duration-200"
                                onClick={closeMenu}
                            />

                            {/* Non-scrolling shell; swipe-to-close is passive touch tracking (no framer drag,
                                which fights vertical scroll). max-h-[100dvh] keeps it viewport-bound even if a
                                lingering transform on <html> becomes the containing block. */}
                            <div
                                ref={mobileMenuRef}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                                data-testid="mobile-menu-drawer"
                                role="dialog"
                                aria-modal="true"
                                aria-label={t('common.menu', 'Menu')}
                                className={cn(
                                    "fixed top-0 bottom-0 w-[320px] sm:w-[380px] max-w-[88vw] z-80",
                                    "max-h-[100dvh]",
                                    "bg-neo-navy",
                                    "shadow-hard-xl overflow-hidden flex flex-col",
                                    'animate-in duration-300',
                                    isRtl
                                        ? "left-0 border-r-4 border-neo-black slide-in-from-left-full"
                                        : "right-0 border-l-4 border-neo-black slide-in-from-right-full"
                                )}
                            >
                              <div
                                data-testid="mobile-menu-scroll"
                                className={cn(
                                    "relative flex-1 min-h-0",
                                    "overflow-y-auto overflow-x-hidden overscroll-contain",
                                    "pb-[max(env(safe-area-inset-bottom),1.25rem)]"
                                )}
                                style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
                              >
                                {/* ── Hero ── */}
                                <div
                                    className="relative bg-neo-navy-light border-b-3 border-neo-black px-4 pb-5"
                                    style={{ paddingTop: 'max(3.25rem, calc(env(safe-area-inset-top, 0px) + 2.5rem))' }}
                                >
                                    <div
                                        className="absolute inset-x-0 top-0 h-1.5 flex"
                                        aria-hidden="true"
                                    >
                                        <span className="flex-1 bg-neo-lime" />
                                        <span className="flex-1 bg-neo-pink" />
                                        <span className="flex-1 bg-neo-cyan" />
                                        <span className="flex-1 bg-neo-purple" />
                                    </div>
                                    <button
                                        onClick={closeMenu}
                                        className={cn(
                                            "absolute flex items-center justify-center w-10 h-10",
                                            "bg-neo-cream text-neo-black border-2 border-neo-black rounded-neo shadow-hard-sm",
                                            "hover:-translate-y-px hover:shadow-hard active:translate-y-px active:shadow-none",
                                            "transition-[transform,box-shadow] duration-100",
                                            isRtl ? "left-3" : "right-3"
                                        )}
                                        style={{ top: 'max(0.75rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))' }}
                                        aria-label={t('common.closeMenu')}
                                    >
                                        <X size={18} strokeWidth={3} />
                                    </button>

                                    {isAuthenticated && profile ? (
                                        <DrawerProfileHero
                                            href={`/${language}/profile`}
                                            onNavigate={closeMenu}
                                            displayName={profile.display_name || profile.username}
                                            avatarConfig={avatarConfig}
                                            userId={user?.id}
                                            revision={profile?.updated_at ?? null}
                                            currentLevel={profile.current_level ?? null}
                                            tier={scoreTier(profile.total_score)}
                                            coins={profile.total_coins || 0}
                                            streak={engagementStatus.streak}
                                            totalGames={profile.total_games ?? null}
                                            accentHex={playerStyle.accentHex ?? null}
                                            isRtl={isRtl}
                                        />
                                    ) : (
                                        <DrawerGuestHero
                                            avatarConfig={avatarConfig}
                                            closeMenu={closeMenu}
                                            onSignIn={handleSignIn}
                                            onSignUp={handleSignUp}
                                        />
                                    )}
                                </div>

                                <div className="flex flex-col gap-5 px-4 pt-4">
                                    {isAuthenticated && unclaimedCount > 0 && !giftBannerDismissed && (
                                        <div className="relative">
                                            <button
                                                onClick={handleOpenGift}
                                                className={cn(
                                                    "flex items-center gap-3 w-full px-3 py-3 text-sm font-black rounded-neo text-start",
                                                    "bg-neo-yellow text-neo-black border-3 border-neo-black shadow-hard-sm",
                                                    "hover:-translate-y-px hover:shadow-hard active:translate-y-px active:shadow-none",
                                                    "transition-[transform,box-shadow] duration-100"
                                                )}
                                            >
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-neo-black bg-neo-cream">
                                                    <Gift className="w-4 h-4" aria-hidden="true" />
                                                </span>
                                                <span className="flex-1">{t('gift.youHaveGifts')}</span>
                                                <GiftNotificationBadge count={unclaimedCount} className="relative top-0 right-0" />
                                            </button>
                                            <button
                                                onClick={dismissGiftBanner}
                                                className="absolute -top-2 -inset-e-2 w-6 h-6 rounded-full bg-neo-black border-2 border-neo-cream flex items-center justify-center text-neo-white z-10"
                                                aria-label={t('notifications.dismiss')}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}

                                    <DrawerNavSections
                                        closeMenu={closeMenu}
                                        isAuthenticated={isAuthenticated}
                                        isAdmin={isAdmin}
                                        teacherEntry={teacherEntry}
                                        friendsBadgeCount={friendsBadgeCount}
                                        missions={missions}
                                        completedCount={completedCount}
                                        isGrandSlam={isGrandSlam}
                                        notificationsSlot={isAuthenticated && (
                                            <DrawerNotifications
                                                notifications={filteredNotifications}
                                                unreadCount={notificationCount}
                                                previous={previousNotifications as NotificationData[]}
                                                isLoadingPrevious={isLoadingPrevious}
                                                fetchPrevious={fetchPreviousNotifications}
                                                markAsRead={markAsRead}
                                                markAllAsRead={markAllAsRead}
                                                dismiss={dismissNotification}
                                                closeMenu={closeMenu}
                                            />
                                        )}
                                        onReportBug={() => { closeMenu(); setShowBugReport(true); }}
                                    />

                                    {isAuthenticated && (
                                        <div className="border-t-2 border-neo-white/10 pt-4">
                                            <AuthButton
                                                inline
                                                onClose={closeMenu}
                                                onSignInClick={handleSignIn}
                                                onSignUpClick={handleSignUp}
                                            />
                                        </div>
                                    )}
                                </div>
                              </div>
                            </div>
                        </>
                    )}
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
