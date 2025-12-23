import { memo, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChartBar } from 'react-icons/fa';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import AuthButton from './auth/AuthButton';
import MusicControls from './MusicControls';
import LevelBadge from './LevelBadge';
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
        <motion.header
            initial={{ y: -20, opacity: 0, rotate: -1 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.4, ease: [0.68, -0.55, 0.265, 1.55] }}
            className={cn(
                "w-full mb-2 sm:mb-4 px-2 xs:px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sticky top-0 z-50 landscape:static bg-slate-50 dark:bg-slate-900 overflow-x-hidden",
                className
            )}
        >
            {/* NEO-BRUTALIST Header Bar */}
            <div
                className={cn(
                    "max-w-6xl mx-auto",
                    "flex items-center justify-between",
                    "px-1 xs:px-2 sm:px-4 md:px-6 py-2 xs:py-3 sm:py-4",
                    "bg-neo-cyan-muted",
                    "border-4 border-neo-black",
                    "shadow-hard-lg",
                    "rounded-neo-lg",
                    "transition-all duration-100",
                    "min-w-0"
                )}
            >
                {/* Logo */}
                <motion.button
                    className="flex items-center gap-1 xs:gap-2 sm:gap-3 cursor-pointer bg-transparent border-none p-0 flex-shrink-0"
                    onClick={handleLogoClick}
                    whileHover={{ x: -2, y: -2 }}
                    whileTap={{ x: 2, y: 2 }}
                    aria-label={t('common.goToHome') || 'Go to home page'}
                >
                    <h1
                        className="text-lg xs:text-xl sm:text-2xl md:text-4xl font-black uppercase tracking-tight flex items-center gap-0.5 xs:gap-1 flex-shrink min-w-0 landscape:text-base landscape:xs:text-lg landscape:sm:text-xl"
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
                        {/* Lightning bolt */}
                        <motion.span
                            animate={{
                                rotate: [0, -15, 15, -15, 15, 0],
                                scale: [1, 1.3, 1]
                            }}
                            transition={{ duration: 0.4, delay: 1, repeat: 3, repeatDelay: 5 }}
                            className="text-base xs:text-xl sm:text-3xl"
                        >
                            ⚡
                        </motion.span>
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

                {/* Controls: Language + Admin + Level + Music + Auth/Settings */}
                <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-3 flex-shrink-0 min-w-0">
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
                                "min-w-[44px] min-h-[44px] w-11 h-11 xs:w-12 xs:h-12 sm:w-11 sm:h-11",
                                "bg-neo-cream text-neo-black",
                                "border-2 sm:border-3 border-neo-black",
                                "rounded-neo shadow-hard",
                                "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg",
                                "active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-sm",
                                "transition-all duration-100"
                            )}
                            aria-label={t('common.changeLanguage') || 'Change language'}
                            aria-expanded={showLangDropdown}
                            aria-haspopup="listbox"
                        >
                            <span className="text-lg sm:text-xl">{currentFlag}</span>
                        </button>

                        <AnimatePresence>
                            {showLangDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full right-0 mt-2 z-[100] bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-lg overflow-hidden min-w-[120px]"
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
                                min-w-[44px] min-h-[44px] w-11 h-11 xs:w-12 xs:h-12 sm:w-11 sm:h-11
                                bg-neo-purple text-white
                                border-2 sm:border-3 border-neo-black
                                rounded-neo
                                shadow-hard
                                hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg
                                active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                                transition-all duration-100
                            "
                            aria-label={t('common.adminDashboard') || 'Admin Dashboard'}
                        >
                            <FaChartBar className="text-base" aria-hidden="true" />
                        </Link>
                    )}
                    {/* Show level badge for authenticated users - hidden on very small screens */}
                    {isAuthenticated && profile?.current_level && (
                        <div className="hidden xs:block">
                            <LevelBadge
                                level={profile.current_level}
                                size="md"
                                animate={false}
                            />
                        </div>
                    )}
                    <MusicControls />
                    <AuthButton />
                </div>
            </div>
        </motion.header>
    );
});

Header.displayName = 'Header';

export default Header;
