import React, { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import AuthButton from './auth/AuthButton';
import MusicControls from './MusicControls';
import LevelBadge from './LevelBadge';

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
    const { t, language } = useLanguage();
    const { isAuthenticated, profile } = useAuth();

    // Get font family based on language (memoized)
    const fontFamily = useMemo(() => {
        switch (language) {
            case 'he':
                return "'Fredoka', sans-serif";
            case 'ja':
                return "'Noto Sans JP', 'Rubik', sans-serif";
            case 'sv':
            case 'en':
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
                "w-full mb-2 sm:mb-4 px-3 sm:px-4 pt-3 sm:pt-4 sticky top-0 z-50",
                className
            )}
        >
            {/* NEO-BRUTALIST Header Bar */}
            <div
                className="
                    max-w-6xl mx-auto
                    flex items-center justify-between
                    px-4 sm:px-6 py-3 sm:py-4
                    bg-neo-cyan-muted
                    border-4 border-neo-black
                    shadow-hard-lg
                    rounded-neo-lg
                    transition-all duration-100
                "
            >
                {/* Logo */}
                <motion.button
                    className="flex items-center gap-2 sm:gap-3 cursor-pointer bg-transparent border-none p-0 min-w-0 flex-shrink"
                    onClick={handleLogoClick}
                    whileHover={{ x: -2, y: -2 }}
                    whileTap={{ x: 2, y: 2 }}
                    aria-label={t('common.goToHome') || 'Go to home page'}
                >
                    <h1
                        className="text-xl xs:text-2xl sm:text-4xl font-black uppercase tracking-tight flex items-center gap-0.5 xs:gap-1"
                        style={{ fontFamily }}
                    >
                        {/* LEXI - Neo-Brutalist white with black shadow */}
                        <span
                            className="text-white"
                            style={{
                                textShadow: '3px 3px 0px var(--neo-black), -1px -1px 0px var(--neo-black), 1px -1px 0px var(--neo-black), -1px 1px 0px var(--neo-black)',
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
                                textShadow: '3px 3px 0px var(--neo-black), -1px -1px 0px var(--neo-black), 1px -1px 0px var(--neo-black), -1px 1px 0px var(--neo-black)',
                            }}
                        >
                            {t('logo.clash')}
                        </span>
                    </h1>
                </motion.button>

                {/* Controls: Level + Music + Auth/Settings */}
                <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0 min-w-0">
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
