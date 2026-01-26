import { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Menu, X, Settings, BookOpen, Trophy, ScrollText, Shield, Coffee, User, Gift, Accessibility, Brain, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import AuthButton from './auth/AuthButton';
import MusicControls from './MusicControls';
import { CoinBalance } from './CoinBalance';
import AuthModal from './auth/AuthModal';
import { GiftNotificationBadge } from './gift/GiftNotificationBadge';
import { AdminGiftModal } from './gift/AdminGiftModal';
import { useUnclaimedGifts } from '@/hooks/useUnclaimedGifts';
import { QuickLanguageSwitcher } from './QuickLanguageSwitcher';
import { useSafeArea } from '@/hooks/useSafeArea';
import HeaderMenuDropdown from './HeaderMenuDropdown';

/**
 * Header Props
 */
interface HeaderProps {
    className?: string;
}

/**
 * Header - Neo-Brutalist styled main site header
 * Memoized to prevent unnecessary re-renders
 */
const Header = memo<HeaderProps>(({ className = '' }) => {
    const { t, language, currentFlag } = useLanguage();
    const { isAuthenticated, isAdmin, profile, refreshProfile } = useAuth();
    const router = useRouter();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [mounted, setMounted] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const safeArea = useSafeArea(); // Get safe area insets for native apps

    // Gift notification state
    const { unclaimedCount, gifts, refresh: refreshGifts, claimGift } = useUnclaimedGifts();
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [selectedGift, setSelectedGift] = useState<typeof gifts[0] | null>(null);
    // Track which gift IDs have been auto-shown this session to prevent re-showing
    // Note: Cross-session persistence is handled by profile.gift_modal_dismissed_at in DB
    const autoShownGiftIdsRef = useRef<Set<string>>(new Set());
    // Track which gift IDs have been dismissed this session (user clicked X without claiming)
    // Note: Dismissal is immediately persisted to DB via /api/player/gifts/dismiss-modal
    const dismissedGiftIdsRef = useRef<Set<string>>(new Set());

    // Handle opening gift modal with oldest unclaimed gift
    const handleOpenGiftModal = useCallback(() => {
        const unclaimedGift = gifts.find(g => !g.claimed);
        if (unclaimedGift) {
            setSelectedGift(unclaimedGift);
            setShowGiftModal(true);
        }
    }, [gifts]);

    // Handle claiming a gift
    const handleClaimGift = useCallback(async (giftId: string) => {
        await claimGift(giftId);
        // Refresh to get updated gift list and profile (for updated XP/coins)
        await Promise.all([
            refreshGifts(),
            refreshProfile(),
        ]);
    }, [claimGift, refreshGifts, refreshProfile]);

    // Handle dismissing gift modal - show next unclaimed gift if available
    // Persist dismissal to database IMMEDIATELY to prevent auto-showing in future sessions/pages
    const handleDismissGiftModal = useCallback(async () => {
        // Mark current gift as dismissed in ref for immediate effect within this session
        if (selectedGift?.id) {
            dismissedGiftIdsRef.current.add(selectedGift.id);
        }

        // Persist dismissal to database IMMEDIATELY (fire-and-forget)
        // This updates gift_modal_dismissed_at so gifts created before this timestamp
        // won't auto-show again in future sessions or after navigation
        fetch('/api/player/gifts/dismiss-modal', {
            method: 'POST',
        }).then(() => {
            // Refresh profile to get updated gift_modal_dismissed_at
            refreshProfile();
        }).catch(error => {
            console.error('Failed to persist gift modal dismissal:', error);
            // Non-critical error - don't block user experience
        });

        // Find the next unclaimed gift (excluding the currently selected one and dismissed ones)
        const nextUnclaimedGift = gifts.find(g =>
            !g.claimed &&
            g.id !== selectedGift?.id &&
            !dismissedGiftIdsRef.current.has(g.id)
        );

        if (nextUnclaimedGift) {
            // Show the next unclaimed gift
            setSelectedGift(nextUnclaimedGift);
            // Modal stays open, just updates the gift
        } else {
            // No more unclaimed gifts, close the modal
            setShowGiftModal(false);
            setSelectedGift(null);
        }
    }, [gifts, selectedGift, refreshProfile]);

    // Auto-show gift modal after 3 seconds when user has unclaimed gifts
    // - Tracks which gifts have been auto-shown this session to prevent re-showing
    // - Compares gift creation date with dismissal timestamp to allow NEW gifts to auto-show
    useEffect(() => {
        // Don't auto-show if already showing
        if (showGiftModal) {
            return;
        }

        // Don't auto-show if no gifts
        if (gifts.length === 0) {
            return;
        }

        // Find unclaimed gifts that:
        // 1. Haven't been auto-shown this session
        // 2. Were created AFTER the last dismissal (or dismissal is null)
        const dismissedAt = profile?.gift_modal_dismissed_at
            ? new Date(profile.gift_modal_dismissed_at).getTime()
            : 0;

        const eligibleGift = gifts.find(g => {
            if (g.claimed) return false;
            // Skip if already auto-shown this session
            if (autoShownGiftIdsRef.current.has(g.id)) return false;
            // Skip if already dismissed this session (user clicked X)
            if (dismissedGiftIdsRef.current.has(g.id)) return false;
            // If dismissal timestamp exists, only show gifts created AFTER dismissal
            if (dismissedAt > 0) {
                const giftCreatedAt = new Date(g.created_at).getTime();
                return giftCreatedAt > dismissedAt;
            }
            // No dismissal, show any unclaimed gift
            return true;
        });

        if (!eligibleGift) {
            return;
        }

        // Auto-show after 3 seconds
        const timer = setTimeout(() => {
            // Mark this gift as auto-shown this session (ref only - DB handles cross-session)
            autoShownGiftIdsRef.current.add(eligibleGift.id);
            setSelectedGift(eligibleGift);
            setShowGiftModal(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, [gifts, showGiftModal, profile?.gift_modal_dismissed_at]);

    // Dispatch event when gift modal opens/closes to allow games to pause
    // This enables timer pause during gift modal display
    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('giftModalStateChange', {
            detail: { isOpen: showGiftModal }
        }));
    }, [showGiftModal]);

    // Track client-side mounting for portal
    useEffect(() => {
        setMounted(true);
    }, []);

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

    // Close mobile menu on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowMobileMenu(false);
            }
        };
        if (showMobileMenu) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showMobileMenu]);

    // Get font family based on language (memoized)
    const fontFamily = useMemo(() => {
        switch (language) {
            case 'he':
                return "'Fredoka', sans-serif";
            case 'ja':
                return "'Noto Sans JP', 'Rubik', sans-serif";
            case 'sv':
            case 'en':
            case 'es':
            default:
                return "'Fredoka', 'Rubik', sans-serif";
        }
    }, [language]);

    // Memoized navigation handler - use router for client-side navigation with locale
    // If player is in an active game, trigger exit flow instead of navigating
    const handleLogoClick = useCallback(() => {
        // Check if player is in an active multiplayer room
        const gameCode = sessionStorage.getItem('gameCode');
        const username = sessionStorage.getItem('username');

        if (gameCode && username) {
            // Player is in a room - trigger exit flow
            // Dispatch custom event that PlayerView/HostView can listen to
            window.dispatchEvent(new CustomEvent('requestRoomExit', {
                detail: { gameCode, username, source: 'logo' }
            }));
            return;
        }

        // No active session - navigate normally
        router.push(`/${language}`);
    }, [language, router]);

    // Auth Modal State
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

    const openSignIn = useCallback(() => {
        setShowMobileMenu(false);
        setAuthModalMode('signin');
        setShowAuthModal(true);
    }, []);

    const openSignUp = useCallback(() => {
        setShowMobileMenu(false);
        setAuthModalMode('signup');
        setShowAuthModal(true);
    }, []);

    return (
        <header
            className={cn(
                "w-full mb-1 sm:mb-2 lg:mb-3 px-2 sm:px-3 lg:px-4 pb-1 lg:pb-2",
                // Sticky only on mobile/tablet, not on desktop (lg+)
                "sticky top-0 lg:static",
                "z-[60] bg-slate-50 dark:bg-slate-900",
                // Min-height prevents CLS (Cumulative Layout Shift) on page load
                // Header reserves space even before content hydrates
                "min-h-[60px] sm:min-h-[70px] lg:min-h-[80px]",
                className
            )}
            style={{
                // Add safe area padding for native apps (status bar spacing)
                paddingTop: safeArea.top > 0 ? `${safeArea.top + 8}px` : undefined,
            }}
        >
            {/* NEO-BRUTALIST Header Bar */}
            <div
                className={cn(
                    "w-full mx-auto",
                    "flex items-center justify-between",
                    "px-2 sm:px-3 lg:px-4 py-2 sm:py-2 lg:py-2.5",
                    "bg-neo-white/90 dark:bg-neo-navy",
                    "backdrop-blur-md",
                    "border-4 lg:border-4 xl:border-4 2xl:border-4 border-neo-black",
                    "shadow-hard-lg xl:shadow-hard-lg 2xl:shadow-hard-lg",
                    "rounded-neo-lg xl:rounded-neo-lg 2xl:rounded-neo-lg",
                    "transition-all duration-100",
                    "min-w-0"
                )}
            >
                {/* Logo - Clean design matching OG image */}
                <motion.button
                    className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 cursor-pointer bg-transparent border-none p-0 flex-shrink-0 relative"
                    onClick={handleLogoClick}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label={t('common.goToHome') || 'Go to home page'}
                >
                    {/* Lime-light lightning bolt - left */}
                    <svg
                        className="w-4 h-5 xs:w-5 xs:h-6 sm:w-6 sm:h-7 lg:w-7 lg:h-8 xl:w-8 xl:h-10 flex-shrink-0 text-neo-black dark:text-neo-lime-light animate-lightning-left"
                        viewBox="0 0 24 32"
                        fill="none"
                        style={{ transform: 'rotate(-15deg)' }}
                        aria-hidden="true"
                    >
                        <path
                            d="M14 2L4 18h7l-3 12 13-18h-8l5-10H14z"
                            fill="currentColor"
                            stroke="#1a365d"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                    </svg>

                    <h1
                        className="font-black uppercase tracking-tight flex items-center gap-0.5 whitespace-nowrap"
                        style={{ fontFamily }}
                    >
                        {/* LEXI - Hero text: larger, bolder, lime primary */}
                        <span
                            className="text-xl xs:text-2xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl text-neo-black dark:text-neo-lime relative animate-lexi-glow landscape:text-xl landscape:xs:text-2xl landscape:sm:text-3xl"
                            style={{
                                WebkitTextStroke: '3px #1a365d',
                                paintOrder: 'stroke fill',
                                textShadow: '4px 4px 0px #1a365d',
                            }}
                        >
                            {t('logo.lexi')}
                        </span>
                        {/* CLASH - Supporting text: smaller, cyan-muted for subtle contrast */}
                        <span
                            className="text-base xs:text-lg sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl text-slate-800 dark:text-neo-cyan-muted relative landscape:text-base landscape:xs:text-lg landscape:sm:text-xl"
                            style={{
                                WebkitTextStroke: '1.5px #1a365d',
                                paintOrder: 'stroke fill',
                                textShadow: '2px 2px 0px rgba(26, 54, 93, 0.7)',
                            }}
                        >
                            {t('logo.clash')}
                        </span>
                    </h1>

                    {/* Cyan lightning bolt - right */}
                    <svg
                        className="w-4 h-5 xs:w-5 xs:h-6 sm:w-6 sm:h-7 lg:w-7 lg:h-8 xl:w-8 xl:h-10 flex-shrink-0 text-neo-black dark:text-neo-cyan-light animate-lightning-right"
                        viewBox="0 0 24 32"
                        fill="none"
                        style={{ transform: 'rotate(15deg)' }}
                        aria-hidden="true"
                    >
                        <path
                            d="M14 2L4 18h7l-3 12 13-18h-8l5-10H14z"
                            fill="currentColor"
                            stroke="#1a365d"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                    </svg>
                </motion.button>

                {/* Desktop Controls: visible on sm+ - Keep only: Coins, Gifts, Language, Menu */}
                <div className="hidden sm:flex items-center gap-3 md:gap-3 lg:gap-4 xl:gap-4 2xl:gap-5 flex-shrink-0">
                    {/* Coin Balance - shown for authenticated users */}
                    {isAuthenticated && profile && (
                        <Link
                            href={`/${language}/profile`}
                            className="hover:scale-105 active:scale-95 transition-transform"
                            aria-label={t('profile.viewCoins') || `${profile.total_coins?.toLocaleString() || 0} coins - View profile`}
                        >
                            <CoinBalance
                                coins={profile.total_coins || 0}
                                size="sm"
                                showAnimation={false}
                            />
                        </Link>
                    )}

                    {/* Gift Notification Button - only show for authenticated users with unclaimed gifts */}
                    {isAuthenticated && unclaimedCount > 0 && (
                        <button
                            onClick={handleOpenGiftModal}
                            className={cn(
                                "relative flex items-center justify-center",
                                "w-10 h-10",
                                "bg-amber-400 text-neo-black",
                                "border-3 border-neo-black",
                                "rounded-neo shadow-hard-sm",
                                "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard hover:bg-amber-500",
                                "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                                "transition-all duration-100"
                            )}
                            aria-label={t('gift.youHaveGifts') || `You have ${unclaimedCount} unclaimed gift${unclaimedCount !== 1 ? 's' : ''}`}
                        >
                            <Gift size={20} />
                            <GiftNotificationBadge count={unclaimedCount} />
                        </button>
                    )}

                    {/* Quick Language Switcher - visible for ALL users */}
                    <QuickLanguageSwitcher compact />

                    {/* Menu Dropdown - contains all other items */}
                    <HeaderMenuDropdown />
                </div>

                {/* Mobile: Volume + Hamburger - simplified grouping */}
                <div className="sm:hidden flex items-center gap-2 min-w-0 flex-shrink-0" ref={mobileMenuRef}>
                    {/* Sound controls */}
                    <MusicControls />

                    {/* Hamburger menu button - always shows Menu/X icon */}
                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className={cn(
                            "flex items-center justify-center flex-shrink-0",
                            "w-11 h-11 min-w-[44px] min-h-[44px]",
                            "bg-neo-cream text-neo-black",
                            "border-3 border-neo-black",
                            "rounded-neo shadow-hard-sm",
                            "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard",
                            "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                            "transition-all duration-100"
                        )}
                        aria-label={showMobileMenu ? (t('common.closeMenu') || 'Close menu') : (t('common.openMenu') || 'Open menu')}
                        aria-expanded={showMobileMenu}
                    >
                        {showMobileMenu ? (
                            <X size={18} />
                        ) : (
                            <Menu size={18} />
                        )}
                    </button>
                </div>

            </div>

            {/* Mobile Menu Slide-out Pane - Rendered via portal to escape header's stacking context */}
            {mounted && createPortal(
                <AnimatePresence>
                    {showMobileMenu && (
                        <>
                            {/* Backdrop overlay */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 bg-neo-black/50 z-70 sm:hidden"
                                onClick={() => setShowMobileMenu(false)}
                            />
                            {/* Slide-out pane - slides from right in LTR, left in RTL */}
                            <motion.div
                                ref={mobileMenuRef}
                                initial={{ x: language === 'he' ? '-100%' : '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: language === 'he' ? '-100%' : '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className={cn(
                                    "fixed top-0 bottom-0 w-[280px] max-w-[85vw] z-80 sm:hidden",
                                    "bg-neo-cream dark:bg-slate-800 border-neo-black dark:border-slate-600",
                                    "shadow-hard-xl overflow-y-auto",
                                    "pb-[max(env(safe-area-inset-bottom),1rem)]",
                                    language === 'he'
                                        ? "left-0 border-r-4 rounded-r-neo-lg"
                                        : "right-0 border-l-4 rounded-l-neo-lg"
                                )}
                            >
                                {/* Pane Header with close button */}
                                <div className="flex items-center justify-between p-4 border-b-3 border-neo-black/20 dark:border-slate-600">
                                    <span className="text-lg font-bold text-neo-black dark:text-white">
                                        {t('common.menu') || 'Menu'}
                                    </span>
                                    <button
                                        onClick={() => setShowMobileMenu(false)}
                                        className={cn(
                                            "flex items-center justify-center",
                                            "min-w-[48px] min-h-[48px] w-12 h-12",
                                            "bg-white dark:bg-slate-700 text-neo-black dark:text-white",
                                            "border-3 border-neo-black dark:border-slate-500",
                                            "rounded-neo shadow-hard-sm",
                                            "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                                            "transition-all duration-100"
                                        )}
                                        aria-label={t('common.closeMenu') || 'Close menu'}
                                    >
                                        <X className="text-xl" size={20} />
                                    </button>
                                </div>

                                {/* Menu content with consistent spacing */}
                                <div className="flex flex-col gap-3 p-4">
                                    {/* Coin Balance - shown for authenticated users */}
                                    {isAuthenticated && profile && (
                                        <>
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-bold text-neo-black/80 dark:text-slate-300 uppercase tracking-wide">
                                                    {t('profile.coins') || 'Coins'}
                                                </span>
                                                <Link
                                                    href={`/${language}/profile`}
                                                    onClick={() => setShowMobileMenu(false)}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                                                        "bg-white dark:bg-slate-700 hover:bg-neo-lime/30 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                                        "shadow-hard-sm hover:shadow-hard"
                                                    )}
                                                >
                                                    <CoinBalance
                                                        coins={profile.total_coins || 0}
                                                        size="sm"
                                                        showAnimation={false}
                                                    />
                                                    <span className="ms-auto text-neo-black/60 dark:text-slate-400">
                                                        {t('profile.viewProfile') || 'View Profile'}
                                                    </span>
                                                </Link>
                                            </div>

                                            {/* Divider */}
                                            <div className="h-0.5 bg-neo-black/20 dark:bg-slate-600 rounded-full" />
                                        </>
                                    )}

                                    {/* Gift Notification - shown for authenticated users with unclaimed gifts */}
                                    {isAuthenticated && unclaimedCount > 0 && (
                                        <>
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-bold text-neo-black/80 dark:text-slate-300 uppercase tracking-wide">
                                                    {t('gift.rewards') || 'Rewards'}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setShowMobileMenu(false);
                                                        handleOpenGiftModal();
                                                    }}
                                                    className={cn(
                                                        "relative flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                                                        "bg-amber-400 hover:bg-amber-500 text-neo-black",
                                                        "shadow-hard-sm hover:shadow-hard"
                                                    )}
                                                >
                                                    <span className="flex items-center justify-center w-7 h-7 rounded-md bg-white/30 border-3 border-neo-black text-neo-black">
                                                        <Gift className="w-4 h-4" aria-hidden="true" />
                                                    </span>
                                                    <span>{t('gift.youHaveGifts') || `You have ${unclaimedCount} gift${unclaimedCount !== 1 ? 's' : ''}`}</span>
                                                    <GiftNotificationBadge count={unclaimedCount} className="relative top-0 right-0" />
                                                </button>
                                            </div>

                                            {/* Divider */}
                                            <div className="h-0.5 bg-neo-black/20 dark:bg-slate-600 rounded-full" />
                                        </>
                                    )}

                                    {/* Account Section */}
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-bold text-neo-black/80 dark:text-slate-300 uppercase tracking-wide">
                                            {t('common.account') || 'Account'}
                                        </span>
                                        <AuthButton
                                            inline
                                            onClose={() => setShowMobileMenu(false)}
                                            onSignInClick={openSignIn}
                                            onSignUpClick={openSignUp}
                                        />
                                    </div>

                                    {/* Divider */}
                                    <div className="h-0.5 bg-neo-black/20 dark:bg-slate-600 rounded-full" />

                                    {/* Settings Section - Language quick-switch + full settings link */}
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-bold text-neo-black/80 dark:text-slate-300 uppercase tracking-wide">
                                            {t('settings.title') || 'Settings'}
                                        </span>

                                        {/* Quick Language Switcher - for fast language changes */}
                                        <div className="flex items-center gap-3 px-4 py-3 rounded-neo border-3 border-neo-black dark:border-slate-500 bg-white dark:bg-slate-700">
                                            <span className="text-sm font-bold text-neo-black dark:text-white">
                                                {t('settings.language') || 'Language'}
                                            </span>
                                            <div className="ms-auto">
                                                <QuickLanguageSwitcher showLabel />
                                            </div>
                                        </div>

                                        {/* Accessibility Quick Access */}
                                        <Link
                                            href={`/${language}/settings#accessibility`}
                                            onClick={() => setShowMobileMenu(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                                                "bg-white dark:bg-slate-700 hover:bg-neo-cyan/50 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                                "shadow-hard-sm hover:shadow-hard"
                                            )}
                                        >
                                            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-cyan/50 border-3 border-neo-black text-neo-black dark:text-white">
                                                <Accessibility className="w-4 h-4" aria-hidden="true" />
                                            </span>
                                            <span>{t('settings.accessibility') || 'Accessibility'}</span>
                                        </Link>

                                        {/* Full Settings Link - for theme, sound, accessibility */}
                                        <Link
                                            href={`/${language}/settings`}
                                            onClick={() => setShowMobileMenu(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                                                "bg-white dark:bg-slate-700 hover:bg-neo-cyan/50 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                                "shadow-hard-sm hover:shadow-hard"
                                            )}
                                        >
                                            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-cyan/50 border-3 border-neo-black text-neo-black dark:text-white">
                                                <Settings className="w-4 h-4" aria-hidden="true" />
                                            </span>
                                            <span>{t('settings.moreSettings') || 'More Settings'}</span>
                                        </Link>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-0.5 bg-neo-black/20 dark:bg-slate-600 rounded-full" />

                                    {/* Brain Training Section - only shown for authenticated users */}
                                    {isAuthenticated && (
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs font-bold text-neo-black/80 dark:text-slate-300 uppercase tracking-wide">
                                                {t('landing.brainTraining') || 'Brain Training'}
                                            </span>
                                            <Link
                                                href={`/${language}/brain`}
                                                onClick={() => setShowMobileMenu(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                                                    "bg-gradient-to-r from-neo-purple/80 to-purple-400/80 hover:from-neo-purple hover:to-purple-400 text-neo-black",
                                                    "shadow-hard-sm hover:shadow-hard"
                                                )}
                                            >
                                                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-navy border-3 border-neo-black text-neo-purple-light">
                                                    <Brain className="w-4 h-4" aria-hidden="true" />
                                                </span>
                                                <span>{t('brain.nav.dashboard') || 'Cognitive Dashboard'}</span>
                                            </Link>
                                        </div>
                                    )}

                                    {/* Admin Controls Section - only shown for admin users */}
                                    {isAdmin && (
                                        <>
                                            {/* Divider */}
                                            <div className="h-0.5 bg-neo-black/20 dark:bg-slate-600 rounded-full" />

                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-bold text-neo-black/80 dark:text-slate-300 uppercase tracking-wide">
                                                    {t('common.admin') || 'Admin'}
                                                </span>

                                                <Link
                                                    href={`/${language}/admin`}
                                                    onClick={() => setShowMobileMenu(false)}
                                                    className="
                                                    flex items-center justify-center
                                                    min-w-[48px] min-h-[48px] w-12 h-12
                                                    bg-neo-pink text-white
                                                    border-3 border-neo-black
                                                    rounded-neo shadow-hard-sm
                                                    active:translate-x-[1px] active:translate-y-[1px] active:shadow-none
                                                    transition-all duration-100
                                                "
                                                    aria-label={t('common.adminDashboard') || 'Admin Dashboard'}
                                                >
                                                    <BarChart3 className="text-base" size={16} aria-hidden="true" />
                                                </Link>
                                            </div>
                                        </>
                                    )}

                                    {/* Divider */}
                                    <div className="h-0.5 bg-neo-black/20 dark:bg-slate-600 rounded-full" />

                                    {/* Info Links Section - replaces footer on mobile */}
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs font-bold text-neo-black/80 dark:text-slate-300 uppercase tracking-wide">
                                            {t('common.info') || 'Info'}
                                        </span>
                                        <div className="flex flex-col gap-2">
                                            <Link
                                                href={`/${language}/rules`}
                                                onClick={() => setShowMobileMenu(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                                                    "bg-white dark:bg-slate-700 hover:bg-neo-cyan/50 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                                    "shadow-hard-sm hover:shadow-hard"
                                                )}
                                            >
                                                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-cyan border-3 border-neo-black text-neo-black">
                                                    <BookOpen className="w-4 h-4" aria-hidden="true" />
                                                </span>
                                                <span>{t('footer.aboutGame') || 'About the Game'}</span>
                                            </Link>
                                            <Link
                                                href={`/${language}/leaderboard`}
                                                onClick={() => setShowMobileMenu(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                                                    "bg-white dark:bg-slate-700 hover:bg-neo-cyan/50 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                                    "shadow-hard-sm hover:shadow-hard"
                                                )}
                                            >
                                                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-lime border-3 border-neo-black text-neo-black">
                                                    <Trophy className="w-4 h-4" aria-hidden="true" />
                                                </span>
                                                <span>{t('footer.leaderboard') || 'Leaderboard'}</span>
                                            </Link>
                                            <Link
                                                href={`/${language}/legal/terms`}
                                                onClick={() => setShowMobileMenu(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                                                    "bg-white dark:bg-slate-700 hover:bg-neo-lime/50 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                                    "shadow-hard-sm hover:shadow-hard"
                                                )}
                                            >
                                                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-cream border-3 border-neo-black text-neo-black">
                                                    <ScrollText className="w-4 h-4" aria-hidden="true" />
                                                </span>
                                                <span>{t('legal.termsOfService')}</span>
                                            </Link>
                                            <Link
                                                href={`/${language}/legal/privacy`}
                                                onClick={() => setShowMobileMenu(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                                                    "bg-white dark:bg-slate-700 hover:bg-neo-lime/50 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                                    "shadow-hard-sm hover:shadow-hard"
                                                )}
                                            >
                                                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-pink-light border-3 border-neo-black">
                                                    <Shield className="w-4 h-4 text-neo-black" aria-hidden="true" />
                                                </span>
                                                <span>{t('legal.privacyPolicy')}</span>
                                            </Link>
                                            <a
                                                href="https://ko-fi.com/lexiclash"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() => setShowMobileMenu(false)}
                                                aria-label={`${t('support.kofiFooter')} (${t('common.opensInNewTab') || 'opens in new tab'})`}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                                                    "bg-neo-pink/20 dark:bg-slate-700 hover:bg-neo-pink/40 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                                    "shadow-hard-sm hover:shadow-hard"
                                                )}
                                            >
                                                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-pink border-3 border-neo-black text-white">
                                                    <Coffee className="w-4 h-4" aria-hidden="true" />
                                                </span>
                                                <span>{t('support.kofiFooter')}</span>
                                                <span className="sr-only">({t('common.opensInNewTab') || 'opens in new tab'})</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Global Auth Modal - Managed by Header to survive mobile menu closing */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                showGuestStats={true}
                initialMode={authModalMode}
            />

            {/* Admin Gift Modal - Shows unclaimed gifts with luxury animation */}
            <AdminGiftModal
                gift={selectedGift}
                show={showGiftModal}
                onClaim={handleClaimGift}
                onDismiss={handleDismissGiftModal}
                currentXp={profile?.total_xp || 0}
                currentCoins={profile?.total_coins || 0}
            />
        </header>
    );
});

Header.displayName = 'Header';

export default Header;
