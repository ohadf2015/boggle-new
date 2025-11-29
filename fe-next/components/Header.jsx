import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import AuthButton from './auth/AuthButton';
import MusicControls from './MusicControls';

/**
 * Header - Neo-Brutalist styled main site header
 */
const Header = ({ className = '' }) => {
    const { t, language } = useLanguage();

    // Get font family based on language
    const getFontFamily = (lang) => {
        switch (lang) {
            case 'he':
                return "'Fredoka', sans-serif";
            case 'ja':
                return "'Noto Sans JP', 'Rubik', sans-serif";
            case 'sv':
            case 'en':
            default:
                return "'Fredoka', 'Rubik', sans-serif";
        }
    };

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
                <motion.div
                    className="flex items-center gap-2 sm:gap-3 cursor-pointer"
                    onClick={() => window.location.href = '/'}
                    whileHover={{ x: -2, y: -2 }}
                    whileTap={{ x: 2, y: 2 }}
                >
                    <h1
                        className="text-2xl sm:text-4xl font-black uppercase tracking-tight flex items-center gap-1"
                        style={{ fontFamily: getFontFamily(language) }}
                    >
                        {/* LEXI - with pink text shadow */}
                        <span
                            className="text-neo-black"
                            style={{
                                textShadow: '3px 3px 0px var(--neo-pink)',
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
                            className="text-xl sm:text-3xl"
                        >
                            ⚡
                        </motion.span>
                        {/* CLASH - italic skewed with black shadow */}
                        <span
                            className="text-neo-pink italic"
                            style={{
                                transform: 'skewX(-8deg)',
                                textShadow: '3px 3px 0px var(--neo-black)',
                            }}
                        >
                            {t('logo.clash')}
                        </span>
                    </h1>
                </motion.div>

                {/* Controls: Music + Auth/Settings */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <MusicControls />
                    <AuthButton />
                </div>
            </div>
        </motion.header>
    );
};

export default Header;
