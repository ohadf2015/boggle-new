import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import AuthButton from './auth/AuthButton';
import MusicControls from './MusicControls';

const Header = ({ className = '' }) => {
    const { theme } = useTheme();
    const { t, language } = useLanguage();
    const isDarkMode = theme === 'dark';

    // Get font family based on language using switch case
    const getFontFamily = (lang) => {
        switch (lang) {
            case 'he':
                return "'Fredoka', sans-serif";
            case 'ja':
                return "'Noto Sans JP', 'Rubik', sans-serif";
            case 'sv':
            case 'en':
            default:
                return "'Outfit', 'Rubik', sans-serif";
        }
    };



    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`w-full max-w-6xl mx-auto mb-1 sm:mb-4 px-4 pt-2 sm:pt-3 sticky top-0 z-50 ${isDarkMode ? 'bg-slate-900/95 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-sm'} ${className}`}
        >
            <div className="flex items-center justify-between">
                {/* Logo */}
                <div
                    className="flex items-center gap-2 sm:gap-3 cursor-pointer"
                    onClick={() => window.location.href = '/'}
                >
                    <motion.h1
                        className="text-2xl sm:text-4xl font-black tracking-wider flex items-center gap-1 sm:gap-2"
                        style={{ fontFamily: getFontFamily(language) }}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                        <span className={cn(
                            "bg-clip-text text-transparent bg-gradient-to-r",
                            isDarkMode
                                ? "from-cyan-400 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                                : "from-cyan-600 to-blue-600"
                        )}>
                            {t('logo.lexi')}
                        </span>
                        <motion.span
                            animate={{
                                rotate: [0, -10, 10, -10, 10, 0],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{ duration: 0.5, delay: 1, repeat: 3, repeatDelay: 5 }}
                            className="text-xl sm:text-3xl filter drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                        >
                            ⚡
                        </motion.span>
                        <span
                            className={cn(
                                "italic bg-clip-text text-transparent bg-gradient-to-r",
                                isDarkMode
                                    ? "from-purple-400 to-pink-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                    : "from-purple-600 to-pink-600"
                            )}
                            style={{ transform: 'skewX(-10deg)' }}
                        >
                            {t('logo.clash')}
                        </span>
                    </motion.h1>
                </div>

                {/* Controls: Music + Auth/Settings */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Music Controls */}
                    <MusicControls />

                    {/* Auth Button (includes settings dropdown for guests) */}
                    <AuthButton />
                </div>
            </div>
        </motion.header>
    );
};

export default Header;
