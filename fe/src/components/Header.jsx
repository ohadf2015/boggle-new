import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { FaSun, FaMoon, FaGlobe, FaChevronDown } from 'react-icons/fa';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const Header = ({ className = '' }) => {
    const { theme, toggleTheme } = useTheme();
    const { t, language, setLanguage } = useLanguage();
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const isDarkMode = theme === 'dark';

    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'he', name: 'עברית', flag: '🇮🇱' }
    ];

    const currentLang = languages.find(l => l.code === language) || languages[0];

    // Neon Dice Icon SVG
    const DiceIcon = () => (
        <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-all duration-300"
        >
            <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="3"
                className={isDarkMode
                    ? "stroke-cyan-400 fill-slate-800/50"
                    : "stroke-cyan-600 fill-gray-100/50"
                }
                strokeWidth="1.5"
            />
            <circle cx="8" cy="8" r="1.5" className={isDarkMode ? "fill-cyan-400" : "fill-cyan-600"} />
            <circle cx="16" cy="8" r="1.5" className={isDarkMode ? "fill-purple-400" : "fill-purple-600"} />
            <circle cx="8" cy="16" r="1.5" className={isDarkMode ? "fill-purple-400" : "fill-purple-600"} />
            <circle cx="16" cy="16" r="1.5" className={isDarkMode ? "fill-cyan-400" : "fill-cyan-600"} />
            <circle cx="12" cy="12" r="1.5" className={isDarkMode ? "fill-teal-400" : "fill-teal-600"} />
        </svg>
    );

    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`w-full max-w-6xl mx-auto mb-6 px-4 pt-4 ${className}`}
        >
            <div className="flex items-center justify-between">
                {/* Logo */}
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => window.location.href = '/'}
                >
                    <motion.div
                        whileHover={{
                            filter: isDarkMode
                                ? "drop-shadow(0 0 15px rgba(6,182,212,0.7))"
                                : "drop-shadow(0 0 12px rgba(6,182,212,0.5))"
                        }}
                    >
                        <DiceIcon />
                    </motion.div>
                    <h1
                        className={`
              text-2xl sm:text-3xl font-bold tracking-wider
              ${isDarkMode
                                ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                : "text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-teal-500 to-purple-600 drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                            }
            `}
                        style={{ fontFamily: "'Rubik', 'Inter', sans-serif" }}
                    >
                        {t('joinView.title')}
                    </h1>
                </div>

                {/* Controls: Language Selector + Theme Toggle */}
                <div className="flex items-center gap-3">
                    {/* Language Selector */}
                    <div className="relative">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                            onBlur={() => setTimeout(() => setShowLanguageMenu(false), 200)}
                            className={cn(
                                "flex items-center gap-2 rounded-full transition-all duration-300",
                                isDarkMode
                                    ? "bg-slate-800 text-cyan-300 hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] border-slate-700"
                                    : "bg-white text-cyan-600 hover:bg-gray-50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] border-gray-200"
                            )}
                            aria-label={t('common.selectUILanguage')}
                        >
                            <FaGlobe size={18} />
                            <span className="text-xl">{currentLang.flag}</span>
                            <FaChevronDown size={12} className={showLanguageMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        </Button>

                        {/* Language Dropdown */}
                        <AnimatePresence>
                            {showLanguageMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className={`
                                        absolute top-full right-0 mt-2 min-w-[160px] rounded-lg shadow-xl z-50
                                        ${isDarkMode
                                            ? "bg-slate-800 border border-slate-700"
                                            : "bg-white border border-gray-200"
                                        }
                                    `}
                                >
                                    {languages.map((lang) => (
                                        <Button
                                            key={lang.code}
                                            variant="ghost"
                                            onClick={() => {
                                                setLanguage(lang.code);
                                                setShowLanguageMenu(false);
                                            }}
                                            className={cn(
                                                "w-full justify-start gap-3 transition-colors",
                                                language === lang.code
                                                    ? isDarkMode
                                                        ? "bg-cyan-500/20 text-cyan-300"
                                                        : "bg-cyan-50 text-cyan-700"
                                                    : isDarkMode
                                                        ? "text-gray-300 hover:bg-slate-700 hover:text-gray-300"
                                                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-700",
                                                lang.code === languages[0].code ? 'rounded-t-lg' : '',
                                                lang.code === languages[languages.length - 1].code ? 'rounded-b-lg' : ''
                                            )}
                                        >
                                            <span className="text-2xl">{lang.flag}</span>
                                            <span className="font-medium">{lang.name}</span>
                                        </Button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Theme Toggle */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleTheme}
                        className={cn(
                            "rounded-full transition-all duration-300",
                            isDarkMode
                                ? "bg-slate-800 text-yellow-400 hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(250,204,21,0.4)] border-slate-700"
                                : "bg-white text-orange-500 hover:bg-gray-50 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] border-gray-200"
                        )}
                        aria-label="Toggle theme"
                    >
                        {isDarkMode ? <FaMoon size={20} /> : <FaSun size={20} />}
                    </Button>
                </div>
            </div>
        </motion.header>
    );
};

export default Header;
