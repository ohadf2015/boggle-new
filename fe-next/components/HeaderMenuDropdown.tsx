import { memo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, User, Brain, Accessibility, Settings, Volume2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import AuthButton from './auth/AuthButton';
import MusicControls from './MusicControls';

/**
 * HeaderMenuDropdown - Enhanced Neo-Brutalist styled dropdown menu
 * Premium design with better visual hierarchy, animations, and section organization
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

            {/* Dropdown Content - Enhanced Premium Design */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -12, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{
                            duration: 0.2,
                            ease: [0.16, 1, 0.3, 1] // Custom easing for smooth feel
                        }}
                        className={cn(
                            "absolute top-full mt-3 w-72",
                            language === 'he' ? 'left-0' : 'right-0',
                            "bg-gradient-to-br from-neo-cream via-neo-cream to-neo-cream/95 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900",
                            "border-4 border-neo-black dark:border-slate-600",
                            "rounded-neo-lg shadow-hard-xl",
                            "p-4 space-y-3",
                            "z-50",
                            "overflow-hidden"
                        )}
                    >
                        {/* Decorative header stripe */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neo-lime via-neo-cyan to-neo-purple" />

                        {/* My Account Section - Only for authenticated users */}
                        {isAuthenticated && (
                            <>
                                <div className="flex items-center gap-2 px-2 mb-1">
                                    <Sparkles size={14} className="text-neo-purple" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-neo-black/60 dark:text-slate-400">
                                        {t('common.account') || 'My Account'}
                                    </span>
                                </div>

                                {/* Profile Link */}
                                <Link
                                    href={`/${language}/profile`}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "group flex items-center gap-3 px-4 py-3",
                                        "bg-white dark:bg-slate-700/80 text-neo-black dark:text-white",
                                        "border-3 border-neo-black dark:border-slate-500",
                                        "rounded-neo shadow-hard-sm",
                                        "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard",
                                        "hover:bg-gradient-to-br hover:from-neo-cyan/20 hover:to-neo-lime/20 dark:hover:bg-slate-600",
                                        "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                                        "transition-all duration-150",
                                        "font-bold text-sm"
                                    )}
                                >
                                    <div className={cn(
                                        "flex items-center justify-center w-8 h-8 rounded-md",
                                        "bg-neo-cyan/30 border-2 border-neo-black dark:border-slate-400",
                                        "group-hover:bg-neo-cyan/50 group-hover:scale-110",
                                        "transition-all duration-150"
                                    )}>
                                        <User size={16} className="text-neo-black dark:text-white" />
                                    </div>
                                    <span className="group-hover:translate-x-0.5 transition-transform duration-150">
                                        {t('brain.nav.profile') || 'Profile'}
                                    </span>
                                </Link>

                                {/* Brain Training */}
                                <Link
                                    href={`/${language}/brain`}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "group flex items-center gap-3 px-4 py-3",
                                        "bg-gradient-to-br from-neo-purple/80 to-purple-400/80 text-neo-black",
                                        "border-3 border-neo-black",
                                        "rounded-neo shadow-hard-sm",
                                        "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard",
                                        "hover:from-neo-purple hover:to-purple-400",
                                        "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                                        "transition-all duration-150",
                                        "font-bold text-sm",
                                        "relative overflow-hidden"
                                    )}
                                >
                                    {/* Shine effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                                    <div className={cn(
                                        "relative flex items-center justify-center w-8 h-8 rounded-md",
                                        "bg-neo-black/20 border-2 border-neo-black",
                                        "group-hover:scale-110 group-hover:rotate-6",
                                        "transition-all duration-150"
                                    )}>
                                        <Brain size={16} className="text-neo-white" />
                                    </div>
                                    <span className="relative group-hover:translate-x-0.5 transition-transform duration-150">
                                        {t('landing.brainTraining') || 'Brain Training'}
                                    </span>
                                </Link>

                                {/* Decorative divider */}
                                <div className="flex items-center gap-2 px-2">
                                    <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-neo-black/20 to-transparent dark:via-slate-600" />
                                </div>
                            </>
                        )}

                        {/* Settings Section */}
                        <div className="flex items-center gap-2 px-2 mb-1">
                            <Settings size={14} className="text-neo-orange" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-neo-black/60 dark:text-slate-400">
                                {t('settings.title') || 'Settings'}
                            </span>
                        </div>

                        {/* Accessibility */}
                        <Link
                            href={`/${language}/settings#accessibility`}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                                "group flex items-center gap-3 px-4 py-3",
                                "bg-white dark:bg-slate-700/80 text-neo-black dark:text-white",
                                "border-3 border-neo-black dark:border-slate-500",
                                "rounded-neo shadow-hard-sm",
                                "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard",
                                "hover:bg-gradient-to-br hover:from-neo-cyan/20 hover:to-blue-200/30 dark:hover:bg-slate-600",
                                "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                                "transition-all duration-150",
                                "font-bold text-sm"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-md",
                                "bg-neo-cyan/30 border-2 border-neo-black dark:border-slate-400",
                                "group-hover:bg-neo-cyan/50 group-hover:scale-110",
                                "transition-all duration-150"
                            )}>
                                <Accessibility size={16} className="text-neo-black dark:text-white" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform duration-150">
                                {t('settings.accessibility') || 'Accessibility'}
                            </span>
                        </Link>

                        {/* General Settings */}
                        <Link
                            href={`/${language}/settings`}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                                "group flex items-center gap-3 px-4 py-3",
                                "bg-white dark:bg-slate-700/80 text-neo-black dark:text-white",
                                "border-3 border-neo-black dark:border-slate-500",
                                "rounded-neo shadow-hard-sm",
                                "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard",
                                "hover:bg-gradient-to-br hover:from-neo-orange/20 hover:to-amber-200/30 dark:hover:bg-slate-600",
                                "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                                "transition-all duration-150",
                                "font-bold text-sm"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-md",
                                "bg-neo-orange/30 border-2 border-neo-black dark:border-slate-400",
                                "group-hover:bg-neo-orange/50 group-hover:scale-110 group-hover:rotate-45",
                                "transition-all duration-150"
                            )}>
                                <Settings size={16} className="text-neo-black dark:text-white" />
                            </div>
                            <span className="group-hover:translate-x-0.5 transition-transform duration-150">
                                {t('settings.moreSettings') || 'More Settings'}
                            </span>
                        </Link>

                        {/* Decorative divider */}
                        <div className="flex items-center gap-2 px-2">
                            <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-neo-black/20 to-transparent dark:via-slate-600" />
                        </div>

                        {/* Sound & Music Section */}
                        <div className="flex items-center gap-2 px-2 mb-1">
                            <Volume2 size={14} className="text-neo-pink" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-neo-black/60 dark:text-slate-400">
                                {t('settings.music') || 'Sound & Music'}
                            </span>
                        </div>

                        {/* Music Controls */}
                        <div className={cn(
                            "flex items-center justify-center px-4 py-3",
                            "bg-gradient-to-br from-neo-pink/10 to-neo-pink/5 dark:from-slate-700/80 dark:to-slate-700/60",
                            "border-3 border-neo-black dark:border-slate-500",
                            "rounded-neo shadow-hard-sm"
                        )}>
                            <MusicControls />
                        </div>

                        {/* Decorative divider */}
                        <div className="flex items-center gap-2 px-2">
                            <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-neo-black/20 to-transparent dark:via-slate-600" />
                        </div>

                        {/* Auth Button */}
                        <div className="pt-1">
                            <AuthButton
                                inline
                                onClose={() => setIsOpen(false)}
                            />
                        </div>

                        {/* Decorative footer stripe */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-neo-purple via-neo-cyan to-neo-lime" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

HeaderMenuDropdown.displayName = 'HeaderMenuDropdown';

export default HeaderMenuDropdown;
