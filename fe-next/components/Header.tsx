import { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Menu, X, Settings, BookOpen, Trophy, ScrollText, Shield, Coffee } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import AuthButton from './auth/AuthButton';
import MusicControls from './MusicControls';
import DailyQuickLink from './daily/DailyQuickLink';
import { CoinBalance } from './CoinBalance';

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
    const { isAuthenticated, isAdmin, profile } = useAuth();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

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

    // Memoized navigation handler
    const handleLogoClick = useCallback(() => {
        window.location.href = '/';
    }, []);

    return (
        <header
            className={cn(
                "w-full mb-1 sm:mb-2 lg:mb-3 px-2 sm:px-3 lg:px-4 pt-2 sm:pt-2 lg:pt-3 pb-1 lg:pb-2 sticky top-0 z-50 bg-slate-50 dark:bg-slate-900",
                className
            )}
        >
            {/* NEO-BRUTALIST Header Bar */}
            <div
                className={cn(
                    "w-full mx-auto",
                    "flex items-center justify-between",
                    "px-2 sm:px-3 lg:px-4 py-2 sm:py-2 lg:py-2.5",
                    "bg-gradient-to-r from-slate-800/85 via-slate-700/80 to-slate-800/85",
                    "dark:from-slate-700/85 dark:via-slate-600/80 dark:to-slate-700/85",
                    "backdrop-blur-md",
                    "border-4 lg:border-4 xl:border-4 2xl:border-4 border-neo-black",
                    "shadow-hard-lg xl:shadow-hard-lg 2xl:shadow-hard-lg",
                    "rounded-neo-lg xl:rounded-neo-lg 2xl:rounded-neo-lg",
                    "transition-all duration-100",
                    "min-w-0 overflow-hidden"
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
                    {/* Small yellow sparkle - top left decorative */}
                    <svg className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 absolute -top-1 xs:-top-2 left-2 xs:left-4 text-neo-yellow hidden xs:block animate-sparkle-left" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z"/>
                    </svg>

                    {/* Pink lightning bolt - left */}
                    <svg
                        className="w-4 h-5 xs:w-5 xs:h-6 sm:w-6 sm:h-7 lg:w-7 lg:h-8 xl:w-8 xl:h-10 flex-shrink-0 text-neo-pink animate-lightning-left"
                        viewBox="0 0 24 32"
                        fill="none"
                        style={{ transform: 'rotate(-15deg)' }}
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
                        {/* LEXI - Hero text: larger, bolder, with subtle glow */}
                        <span
                            className="text-xl xs:text-2xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl text-neo-cyan relative animate-lexi-glow landscape:text-xl landscape:xs:text-2xl landscape:sm:text-3xl"
                            style={{
                                WebkitTextStroke: '3px #1a365d',
                                paintOrder: 'stroke fill',
                                textShadow: '4px 4px 0px #1a365d',
                            }}
                        >
                            {t('logo.lexi')}
                        </span>
                        {/* CLASH - Supporting text: smaller, softer */}
                        <span
                            className="text-base xs:text-lg sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl text-neo-yellow relative landscape:text-base landscape:xs:text-lg landscape:sm:text-xl"
                            style={{
                                WebkitTextStroke: '1.5px #1a365d',
                                paintOrder: 'stroke fill',
                                textShadow: '2px 2px 0px rgba(26, 54, 93, 0.7)',
                            }}
                        >
                            {t('logo.clash')}
                        </span>
                    </h1>

                    {/* Yellow lightning bolt - right */}
                    <svg
                        className="w-4 h-5 xs:w-5 xs:h-6 sm:w-6 sm:h-7 lg:w-7 lg:h-8 xl:w-8 xl:h-10 flex-shrink-0 text-neo-yellow animate-lightning-right"
                        viewBox="0 0 24 32"
                        fill="none"
                        style={{ transform: 'rotate(15deg)' }}
                    >
                        <path
                            d="M14 2L4 18h7l-3 12 13-18h-8l5-10H14z"
                            fill="currentColor"
                            stroke="#1a365d"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                    </svg>

                    {/* Small pink sparkle - top right decorative */}
                    <svg className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 absolute -top-1 xs:-top-2 right-0 xs:right-2 text-neo-pink hidden xs:block animate-sparkle-right" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z"/>
                    </svg>
                </motion.button>

                {/* Desktop Controls: visible on sm+ */}
                <div className="hidden sm:flex items-center gap-3 md:gap-3 lg:gap-4 xl:gap-4 2xl:gap-5 flex-shrink-0">
                    {/* Daily Challenge Quick Link */}
                    <DailyQuickLink />

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

                    <MusicControls />
                    <AuthButton />
                </div>

                {/* Mobile: Coins + Volume + Hamburger - simplified grouping */}
                <div className="sm:hidden flex items-center gap-1.5 min-w-0 flex-shrink-0" ref={mobileMenuRef}>
                    {/* Coin Balance - links to profile, shown for authenticated users */}
                    {isAuthenticated && profile && (
                        <Link
                            href={`/${language}/profile`}
                            className="hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
                            aria-label={t('profile.viewCoins') || `${profile.total_coins?.toLocaleString() || 0} coins - View profile`}
                        >
                            <CoinBalance
                                coins={profile.total_coins || 0}
                                size="xs"
                                showAnimation={false}
                            />
                        </Link>
                    )}

                    {/* Sound controls */}
                    <MusicControls />

                    {/* Hamburger menu button */}
                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className={cn(
                            "flex items-center justify-center flex-shrink-0",
                            "w-9 h-9",
                            "bg-neo-cream text-neo-black",
                            "border-2 border-neo-black",
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

            {/* Mobile Menu Slide-out Pane - Rendered outside header bar to avoid stacking context issues */}
            <AnimatePresence>
                {showMobileMenu && (
                    <>
                        {/* Backdrop overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-neo-black/50 z-[9998] sm:hidden"
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
                                "fixed top-0 bottom-0 w-[280px] max-w-[85vw] z-[9999] sm:hidden",
                                "bg-neo-cream dark:bg-slate-800 border-neo-black dark:border-slate-600",
                                "shadow-hard-xl overflow-y-auto",
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
                                        "border-2 border-neo-black dark:border-slate-500",
                                        "rounded-neo shadow-hard-sm",
                                        "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                                        "transition-all duration-100"
                                    )}
                                    aria-label={t('common.closeMenu') || 'Close menu'}
                                >
                                    <X className="text-xl" size={20} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-4 p-4">
                                {/* Daily Challenge - TOP PRIORITY */}
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-bold text-neo-black/80 dark:text-slate-300 uppercase tracking-wide">
                                        {t('daily.badge') || 'Daily Challenge'}
                                    </span>
                                    <DailyQuickLink inline onClick={() => setShowMobileMenu(false)} />
                                </div>

                                {/* Divider */}
                                <div className="h-0.5 bg-neo-black/20 dark:bg-slate-600 rounded-full" />

                                {/* Account Section */}
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-bold text-neo-black/80 dark:text-slate-300 uppercase tracking-wide">
                                        {t('common.account') || 'Account'}
                                    </span>
                                    <AuthButton inline onClose={() => setShowMobileMenu(false)} />
                                </div>

                                {/* Divider */}
                                <div className="h-0.5 bg-neo-black/20 dark:bg-slate-600 rounded-full" />

                                {/* Settings Link - consolidated settings (language, theme, sound) */}
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-bold text-neo-black/80 dark:text-slate-300 uppercase tracking-wide">
                                        {t('settings.title') || 'Settings'}
                                    </span>
                                    <Link
                                        href={`/${language}/settings`}
                                        onClick={() => setShowMobileMenu(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-2 border-neo-black dark:border-slate-500 transition-all w-full",
                                            "bg-white dark:bg-slate-700 hover:bg-neo-cyan/50 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                            "shadow-hard-sm hover:shadow-hard"
                                        )}
                                    >
                                        <Settings className="w-5 h-5" />
                                        <span>{t('settings.languageThemeSound') || 'Language, Theme & Sound'}</span>
                                        <span className="ms-auto text-lg">{currentFlag}</span>
                                    </Link>
                                </div>

                                {/* Admin Controls Section - only shown for admin users */}
                                {isAdmin && (
                                    <>
                                        {/* Divider */}
                                        <div className="h-0.5 bg-neo-black/20 dark:bg-slate-600 rounded-full" />

                                        <div className="flex flex-col gap-3">
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
                                                    border-2 border-neo-black
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
                                                "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-2 border-neo-black dark:border-slate-500 transition-all w-full",
                                                "bg-white dark:bg-slate-700 hover:bg-neo-cyan/50 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                                "shadow-hard-sm hover:shadow-hard"
                                            )}
                                        >
                                            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-cyan border-2 border-neo-black">
                                                <BookOpen className="w-4 h-4 text-neo-black" />
                                            </span>
                                            <span>{t('footer.aboutGame') || 'About the Game'}</span>
                                        </Link>
                                        <Link
                                            href={`/${language}/leaderboard`}
                                            onClick={() => setShowMobileMenu(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-2 border-neo-black dark:border-slate-500 transition-all w-full",
                                                "bg-white dark:bg-slate-700 hover:bg-neo-cyan/50 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                                "shadow-hard-sm hover:shadow-hard"
                                            )}
                                        >
                                            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-yellow border-2 border-neo-black">
                                                <Trophy className="w-4 h-4 text-neo-black" />
                                            </span>
                                            <span>{t('footer.leaderboard') || 'Leaderboard'}</span>
                                        </Link>
                                        <Link
                                            href={`/${language}/legal/terms`}
                                            onClick={() => setShowMobileMenu(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-2 border-neo-black dark:border-slate-500 transition-all w-full",
                                                "bg-white dark:bg-slate-700 hover:bg-neo-yellow/50 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                                "shadow-hard-sm hover:shadow-hard"
                                            )}
                                        >
                                            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-cream border-2 border-neo-black">
                                                <ScrollText className="w-4 h-4 text-neo-black" />
                                            </span>
                                            <span>{t('legal.termsOfService')}</span>
                                        </Link>
                                        <Link
                                            href={`/${language}/legal/privacy`}
                                            onClick={() => setShowMobileMenu(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-2 border-neo-black dark:border-slate-500 transition-all w-full",
                                                "bg-white dark:bg-slate-700 hover:bg-neo-yellow/50 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                                "shadow-hard-sm hover:shadow-hard"
                                            )}
                                        >
                                            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-pink-light border-2 border-neo-black">
                                                <Shield className="w-4 h-4 text-neo-black" />
                                            </span>
                                            <span>{t('legal.privacyPolicy')}</span>
                                        </Link>
                                        <a
                                            href="https://ko-fi.com/lexiclash"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setShowMobileMenu(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-2 border-neo-black dark:border-slate-500 transition-all w-full",
                                                "bg-neo-pink/20 dark:bg-slate-700 hover:bg-neo-pink/40 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                                                "shadow-hard-sm hover:shadow-hard"
                                            )}
                                        >
                                            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-pink border-2 border-neo-black">
                                                <Coffee className="w-4 h-4 text-white" />
                                            </span>
                                            <span>{t('support.kofiFooter')}</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>
    );
});

Header.displayName = 'Header';

export default Header;
