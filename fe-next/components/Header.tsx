import { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Menu, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import AuthButton from './auth/AuthButton';
import MusicControls from './MusicControls';
import DailyQuickLink from './daily/DailyQuickLink';
import Avatar from './Avatar';
import type { Language } from '../shared/types/game';

/**
 * Header Props
 */
interface HeaderProps {
  className?: string;
}

// Language options for the switcher
const LANGUAGE_OPTIONS: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'he', flag: '🇮🇱', name: 'עברית' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
];

/**
 * Header - Neo-Brutalist styled main site header
 * Memoized to prevent unnecessary re-renders
 */
const Header = memo<HeaderProps>(({ className = '' }) => {
    const { t, language, setLanguage, currentFlag } = useLanguage();
    const { isAuthenticated, isAdmin, profile } = useAuth();
    const [showLangDropdown, setShowLangDropdown] = useState(false);
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
                "w-full mb-2 sm:mb-4 lg:mb-6 xl:mb-8 px-2 xs:px-3 sm:px-4 lg:px-8 xl:px-12 pt-3 sm:pt-4 lg:pt-6 xl:pt-8 pb-2 lg:pb-4 sticky top-0 z-50 landscape:static bg-slate-50 dark:bg-slate-900",
                className
            )}
        >
            {/* NEO-BRUTALIST Header Bar */}
            <div
                className={cn(
                    "max-w-6xl lg:max-w-7xl 2xl:max-w-[1800px] mx-auto",
                    "flex items-center justify-between",
                    "px-1 xs:px-2 sm:px-4 md:px-6 lg:px-6 xl:px-8 2xl:px-10 py-2 xs:py-3 sm:py-3 lg:py-3 xl:py-4 2xl:py-4",
                    "bg-neo-cyan-muted",
                    "border-4 lg:border-4 xl:border-4 2xl:border-4 border-neo-black",
                    "shadow-hard-lg xl:shadow-hard-lg 2xl:shadow-hard-lg",
                    "rounded-neo-lg xl:rounded-neo-lg 2xl:rounded-neo-lg",
                    "transition-all duration-100",
                    "min-w-0"
                )}
            >
                {/* Logo */}
                <motion.button
                    className="flex items-center gap-1 xs:gap-2 sm:gap-3 lg:gap-3 2xl:gap-4 cursor-pointer bg-transparent border-none p-0 flex-shrink-0"
                    onClick={handleLogoClick}
                    whileHover={{ x: -2, y: -2 }}
                    whileTap={{ x: 2, y: 2 }}
                    aria-label={t('common.goToHome') || 'Go to home page'}
                >
                    <h1
                        className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl 2xl:text-4xl font-black uppercase tracking-tight flex items-center gap-0.5 xs:gap-1 lg:gap-1.5 2xl:gap-2 flex-shrink min-w-0 overflow-hidden landscape:text-base landscape:xs:text-lg landscape:sm:text-xl"
                        style={{ fontFamily }}
                    >
                        {/* LEXI - Neo-Brutalist white with black shadow */}
                        <span
                            className="text-white"
                            style={{
                                textShadow: '3px 3px 0px rgb(var(--neo-black)), -1px -1px 0px rgb(var(--neo-black)), 1px -1px 0px rgb(var(--neo-black)), -1px 1px 0px rgb(var(--neo-black))',
                            }}
                        >
                            {t('logo.lexi')}
                        </span>
                        {/* Lightning bolt - static for cleaner UX */}
                        <span className="text-base xs:text-xl sm:text-2xl lg:text-2xl xl:text-3xl 2xl:text-3xl">
                            ⚡
                        </span>
                        {/* CLASH - Neo-Brutalist white italic skewed with black shadow */}
                        <span
                            className="text-white italic"
                            style={{
                                transform: 'skewX(-8deg)',
                                textShadow: '3px 3px 0px rgb(var(--neo-black)), -1px -1px 0px rgb(var(--neo-black)), 1px -1px 0px rgb(var(--neo-black)), -1px 1px 0px rgb(var(--neo-black))',
                            }}
                        >
                            {t('logo.clash')}
                        </span>
                    </h1>
                </motion.button>

                {/* Desktop Controls: visible on sm+ */}
                <div className="hidden sm:flex items-center gap-3 md:gap-3 lg:gap-4 xl:gap-4 2xl:gap-5 flex-shrink-0">
                    {/* Daily Challenge Quick Link */}
                    <DailyQuickLink />

                    {/* Language Switcher */}
                    <div
                        className="relative"
                        onMouseEnter={() => setShowLangDropdown(true)}
                        onMouseLeave={() => setShowLangDropdown(false)}
                    >
                        <button
                            onClick={() => setShowLangDropdown(!showLangDropdown)}
                            className={cn(
                                "flex items-center justify-center gap-1",
                                "min-w-[44px] min-h-[44px] w-11 h-11 lg:w-12 lg:h-12 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14",
                                "bg-neo-cream text-neo-black",
                                "border-3 lg:border-3 2xl:border-3 border-neo-black",
                                "rounded-neo lg:rounded-neo shadow-hard lg:shadow-hard 2xl:shadow-hard-lg",
                                "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg",
                                "active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-sm",
                                "transition-all duration-100"
                            )}
                            aria-label={t('common.changeLanguage') || 'Change language'}
                            aria-expanded={showLangDropdown}
                            aria-haspopup="listbox"
                        >
                            <span className="text-xl lg:text-xl xl:text-2xl 2xl:text-2xl">{currentFlag}</span>
                            <ChevronDown className={cn(
                                "w-3 h-3 transition-transform",
                                showLangDropdown && "rotate-180"
                            )} />
                        </button>

                        <AnimatePresence>
                            {showLangDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full end-0 mt-2 z-[100] bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-lg overflow-hidden min-w-[120px]"
                                    role="listbox"
                                    aria-label={t('common.selectLanguage') || 'Select language'}
                                >
                                    {LANGUAGE_OPTIONS.map((option) => (
                                        <button
                                            key={option.code}
                                            onClick={() => {
                                                setLanguage(option.code);
                                                setShowLangDropdown(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-3 py-2 text-sm font-bold",
                                                "hover:bg-neo-cyan transition-colors",
                                                language === option.code && "bg-neo-cyan"
                                            )}
                                            role="option"
                                            aria-selected={language === option.code}
                                        >
                                            <span>{option.flag}</span>
                                            <span className="text-neo-black">{option.name}</span>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Admin Dashboard Link - only shown for admin users */}
                    {isAdmin && (
                        <Link
                            href={`/${language}/admin`}
                            className="
                                flex items-center justify-center
                                min-w-[44px] min-h-[44px] w-11 h-11 lg:w-12 lg:h-12 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14
                                bg-neo-purple text-white
                                border-3 lg:border-3 2xl:border-3 border-neo-black
                                rounded-neo lg:rounded-neo
                                shadow-hard lg:shadow-hard 2xl:shadow-hard-lg
                                hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg
                                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                                transition-all duration-100
                            "
                            aria-label={t('common.adminDashboard') || 'Admin Dashboard'}
                        >
                            <BarChart3 className="text-base lg:text-base xl:text-lg 2xl:text-lg" size={16} aria-hidden="true" />
                        </Link>
                    )}
                    <MusicControls />
                    <AuthButton />
                </div>

                {/* Mobile: Avatar + Volume Controls + Hamburger Menu */}
                <div className="sm:hidden flex items-center gap-2" ref={mobileMenuRef}>
                    {/* Profile Avatar - visible on mobile header when authenticated */}
                    {isAuthenticated && profile && (
                        <Link
                            href={`/${language}/profile`}
                            className={cn(
                                "flex items-center justify-center",
                                "min-w-[44px] min-h-[44px] w-11 h-11",
                                "bg-neo-cream",
                                "border-3 border-neo-black",
                                "rounded-full shadow-hard",
                                "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg",
                                "active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-sm",
                                "transition-all duration-100",
                                "overflow-hidden"
                            )}
                            aria-label={t('profile.title') || 'Profile'}
                        >
                            <Avatar
                                profilePictureUrl={profile.profile_picture_url ?? undefined}
                                avatarEmoji={profile.avatar_emoji}
                                avatarColor={profile.avatar_color}
                                size="md"
                            />
                        </Link>
                    )}

                    {/* Sound controls - visible on mobile header */}
                    <MusicControls />

                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className={cn(
                            "flex items-center justify-center",
                            "min-w-[44px] min-h-[44px] w-11 h-11",
                            "bg-neo-cream text-neo-black",
                            "border-3 border-neo-black",
                            "rounded-neo shadow-hard",
                            "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg",
                            "active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-sm",
                            "transition-all duration-100"
                        )}
                        aria-label={showMobileMenu ? (t('common.closeMenu') || 'Close menu') : (t('common.openMenu') || 'Open menu')}
                        aria-expanded={showMobileMenu}
                    >
                        {showMobileMenu ? (
                            <X className="text-xl" size={20} />
                        ) : (
                            <Menu className="text-xl" size={20} />
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
                                        "min-w-[44px] min-h-[44px] w-11 h-11",
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

                                {/* Language Section */}
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-bold text-neo-black/80 dark:text-slate-300 uppercase tracking-wide">
                                        {t('common.language') || 'Language'}
                                    </span>
                                    <div className="flex flex-col gap-1.5">
                                        {LANGUAGE_OPTIONS.map((option) => (
                                            <button
                                                key={option.code}
                                                onClick={() => {
                                                    setLanguage(option.code);
                                                }}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black dark:border-slate-500 transition-all w-full",
                                                    language === option.code
                                                        ? "bg-neo-cyan shadow-hard-sm text-neo-black"
                                                        : "bg-white dark:bg-slate-700 hover:bg-neo-cyan/50 dark:hover:bg-slate-600 text-neo-black dark:text-white"
                                                )}
                                            >
                                                <span className="text-lg">{option.flag}</span>
                                                <span>{option.name}</span>
                                            </button>
                                        ))}
                                    </div>
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
                                                    min-w-[44px] min-h-[44px] w-11 h-11
                                                    bg-neo-purple text-white
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
