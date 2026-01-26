import { memo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, User, Brain, Accessibility, Settings, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import AuthButton from './auth/AuthButton';
import MusicControls from './MusicControls';

/**
 * HeaderMenuDropdown - Neo-Brutalist styled dropdown menu
 * Contains profile, brain training, accessibility, settings, music, and auth
 */
const HeaderMenuDropdown = memo(() => {
    const { t, language } = useLanguage();
    const { isAuthenticated } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-center gap-1.5",
                    "px-3 h-10",
                    "bg-neo-cream text-neo-black",
                    "border-3 border-neo-black",
                    "rounded-neo shadow-hard-sm",
                    "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard hover:bg-neo-lime/40",
                    "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                    "transition-all duration-100",
                    "font-bold text-sm"
                )}
                aria-label={isOpen ? (t('common.closeMenu') || 'Close menu') : (t('common.openMenu') || 'Open menu')}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <span className="hidden md:inline">{t('common.menu') || 'Menu'}</span>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {/* Dropdown Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className={cn(
                            "absolute top-full mt-2 w-64",
                            language === 'he' ? 'left-0' : 'right-0',
                            "bg-neo-cream dark:bg-slate-800",
                            "border-3 border-neo-black",
                            "rounded-neo shadow-hard-lg",
                            "p-3 space-y-2",
                            "z-50"
                        )}
                    >
                        {/* Profile Link - authenticated users only */}
                        {isAuthenticated && (
                            <Link
                                href={`/${language}/profile`}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5",
                                    "bg-white dark:bg-slate-700 text-neo-black dark:text-white",
                                    "border-2 border-neo-black dark:border-slate-500",
                                    "rounded-neo shadow-hard-sm",
                                    "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard hover:bg-neo-cyan/30 dark:hover:bg-slate-600",
                                    "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                                    "transition-all duration-100",
                                    "font-bold text-sm"
                                )}
                            >
                                <User size={18} />
                                <span>{t('brain.nav.profile') || 'Profile'}</span>
                            </Link>
                        )}

                        {/* Brain Training - authenticated users only */}
                        {isAuthenticated && (
                            <Link
                                href={`/${language}/brain`}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5",
                                    "bg-gradient-to-br from-neo-purple to-purple-400 text-neo-black",
                                    "border-2 border-neo-black",
                                    "rounded-neo shadow-hard-sm",
                                    "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard hover:from-neo-purple-light hover:to-neo-purple",
                                    "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                                    "transition-all duration-100",
                                    "font-bold text-sm"
                                )}
                            >
                                <Brain size={18} />
                                <span>{t('landing.brainTraining') || 'Brain Training'}</span>
                            </Link>
                        )}

                        {/* Divider - only if authenticated items shown */}
                        {isAuthenticated && (
                            <div className="h-0.5 bg-neo-black/20 dark:bg-slate-600 rounded-full" />
                        )}

                        {/* Accessibility */}
                        <Link
                            href={`/${language}/settings#accessibility`}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5",
                                "bg-white dark:bg-slate-700 text-neo-black dark:text-white",
                                "border-2 border-neo-black dark:border-slate-500",
                                "rounded-neo shadow-hard-sm",
                                "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard hover:bg-neo-cyan/30 dark:hover:bg-slate-600",
                                "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                                "transition-all duration-100",
                                "font-bold text-sm"
                            )}
                        >
                            <Accessibility size={18} />
                            <span>{t('settings.accessibility') || 'Accessibility'}</span>
                        </Link>

                        {/* Settings */}
                        <Link
                            href={`/${language}/settings`}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5",
                                "bg-white dark:bg-slate-700 text-neo-black dark:text-white",
                                "border-2 border-neo-black dark:border-slate-500",
                                "rounded-neo shadow-hard-sm",
                                "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard hover:bg-neo-cyan/30 dark:hover:bg-slate-600",
                                "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                                "transition-all duration-100",
                                "font-bold text-sm"
                            )}
                        >
                            <Settings size={18} />
                            <span>{t('settings.title') || 'Settings'}</span>
                        </Link>

                        {/* Divider */}
                        <div className="h-0.5 bg-neo-black/20 dark:bg-slate-600 rounded-full" />

                        {/* Music Controls */}
                        <div className="flex items-center justify-center px-3 py-2.5 bg-white dark:bg-slate-700 border-2 border-neo-black dark:border-slate-500 rounded-neo">
                            <MusicControls />
                        </div>

                        {/* Divider */}
                        <div className="h-0.5 bg-neo-black/20 dark:bg-slate-600 rounded-full" />

                        {/* Auth Button */}
                        <div className="pt-1">
                            <AuthButton
                                inline
                                onClose={() => setIsOpen(false)}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

HeaderMenuDropdown.displayName = 'HeaderMenuDropdown';

export default HeaderMenuDropdown;
