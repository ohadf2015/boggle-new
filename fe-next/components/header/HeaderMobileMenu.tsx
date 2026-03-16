import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Settings, Trophy, ScrollText, Coffee, Accessibility, Brain, BarChart3, Info, HelpCircle, Mail, Cookie, Gift, Newspaper, Users } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import AuthButton from '../auth/AuthButton';
import MusicControls from '../MusicControls';
import { CoinBalance } from '../CoinBalance';
import { GiftNotificationBadge } from '../gift/GiftNotificationBadge';
import { QuickLanguageSwitcher } from '../QuickLanguageSwitcher';
import { NotificationBell } from '../notifications/NotificationBell';
import { InstagramIcon } from '@/components/icons/SocialIcons';
import { ManageCookiesButton } from '@/components/CookieConsent';
import Avatar from '../Avatar';
import { getStoredCustomAvatar } from '../../utils/profileStorage';

interface HeaderMobileMenuProps {
    unclaimedCount: number;
    onOpenGiftModal: () => void;
    onSignIn: () => void;
    onSignUp: () => void;
}

const HeaderMobileMenu = memo<HeaderMobileMenuProps>(({ unclaimedCount, onOpenGiftModal, onSignIn, onSignUp }) => {
    const { t, language } = useLanguage();
    const { isAuthenticated, isAdmin, profile } = useAuth();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [mounted, setMounted] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setMounted(true); }, []);

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
            if (event.key === 'Escape') setShowMobileMenu(false);
        };
        if (showMobileMenu) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showMobileMenu]);

    const closeMenu = useCallback(() => setShowMobileMenu(false), []);

    const handleSignIn = useCallback(() => { closeMenu(); onSignIn(); }, [closeMenu, onSignIn]);
    const handleSignUp = useCallback(() => { closeMenu(); onSignUp(); }, [closeMenu, onSignUp]);
    const handleOpenGift = useCallback(() => { closeMenu(); onOpenGiftModal(); }, [closeMenu, onOpenGiftModal]);

    const guestAvatar = !isAuthenticated ? getStoredCustomAvatar() : null;
    const avatarConfig = profile?.avatar_config ?? guestAvatar;

    return (
        <>
            {/* Mobile: Avatar + Volume + Notifications + Hamburger */}
            <div className="sm:hidden flex items-center gap-2 min-w-0 flex-shrink-0" ref={mobileMenuRef}>
                <Link
                    href={`/${language}/profile`}
                    className="flex-shrink-0 rounded-full border-2 border-neo-black shadow-hard-sm"
                    aria-label={t('profile.viewProfile')}
                >
                    <Avatar
                        customAvatar={avatarConfig}
                        avatarImage={profile?.avatar_image}
                        profilePictureUrl={profile?.profile_picture_url}
                        size="md"
                    />
                </Link>
                <MusicControls />
                {isAuthenticated && <NotificationBell />}
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
                    aria-label={showMobileMenu ? t('common.closeMenu') : t('common.openMenu')}
                    title={showMobileMenu ? t('common.closeMenu') : t('common.openMenu')}
                    aria-expanded={showMobileMenu}
                >
                    {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
                </button>
            </div>

            {/* Mobile Menu Slide-out Pane */}
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
                                onClick={closeMenu}
                            />
                            {/* Slide-out pane */}
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
                                {/* Pane Header */}
                                <div className="flex items-center justify-between p-4 border-b-3 border-neo-black/20 dark:border-slate-600">
                                    <span className="text-lg font-bold text-neo-black dark:text-white">
                                        {t('common.menu')}
                                    </span>
                                    <button
                                        onClick={closeMenu}
                                        className={cn(
                                            "flex items-center justify-center",
                                            "min-w-[48px] min-h-[48px] w-12 h-12",
                                            "bg-white dark:bg-slate-700 text-neo-black dark:text-white",
                                            "border-3 border-neo-black dark:border-slate-500",
                                            "rounded-neo shadow-hard-sm",
                                            "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                                            "transition-all duration-100"
                                        )}
                                        aria-label={t('common.closeMenu')}
                                    >
                                        <X className="text-xl" size={20} />
                                    </button>
                                </div>

                                {/* Menu content */}
                                <div className="flex flex-col gap-3 p-4">
                                    {/* Coin Balance */}
                                    {isAuthenticated && profile && (
                                        <>
                                            <MobileMenuSection label={t('profile.coins')}>
                                                <MobileMenuLink href={`/${language}/profile`} onClick={closeMenu}>
                                                    <CoinBalance coins={profile.total_coins || 0} size="sm" showAnimation={false} />
                                                    <span className="ms-auto text-neo-black/60 dark:text-slate-400">
                                                        {t('profile.viewProfile')}
                                                    </span>
                                                </MobileMenuLink>
                                            </MobileMenuSection>
                                            <MenuDivider />
                                        </>
                                    )}

                                    {/* Gift Notification */}
                                    {isAuthenticated && unclaimedCount > 0 && (
                                        <>
                                            <MobileMenuSection label={t('gift.rewards')}>
                                                <button
                                                    onClick={handleOpenGift}
                                                    className={cn(
                                                        "relative flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                                                        "bg-amber-400 hover:bg-amber-500 text-neo-black",
                                                        "shadow-hard-sm hover:shadow-hard"
                                                    )}
                                                >
                                                    <MobileMenuIcon className="bg-white/30">
                                                        <Gift className="w-4 h-4" aria-hidden="true" />
                                                    </MobileMenuIcon>
                                                    <span>{t('gift.youHaveGifts') || `You have ${unclaimedCount} gift${unclaimedCount !== 1 ? 's' : ''}`}</span>
                                                    <GiftNotificationBadge count={unclaimedCount} className="relative top-0 right-0" />
                                                </button>
                                            </MobileMenuSection>
                                            <MenuDivider />
                                        </>
                                    )}

                                    {/* Account Section */}
                                    <MobileMenuSection label={t('common.account')}>
                                        <AuthButton
                                            inline
                                            onClose={closeMenu}
                                            onSignInClick={handleSignIn}
                                            onSignUpClick={handleSignUp}
                                        />
                                    </MobileMenuSection>

                                    <MenuDivider />

                                    {/* Settings Section */}
                                    <MobileMenuSection label={t('settings.title')}>
                                        <div className="flex items-center gap-3 px-4 py-3 rounded-neo border-3 border-neo-black dark:border-slate-500 bg-white dark:bg-slate-700">
                                            <span className="text-sm font-bold text-neo-black dark:text-white">
                                                {t('settings.language')}
                                            </span>
                                            <div className="ms-auto">
                                                <QuickLanguageSwitcher showLabel />
                                            </div>
                                        </div>

                                        <MobileMenuLink href={`/${language}/settings#accessibility`} onClick={closeMenu}>
                                            <MobileMenuIcon className="bg-neo-cyan/50">
                                                <Accessibility className="w-4 h-4" aria-hidden="true" />
                                            </MobileMenuIcon>
                                            <span>{t('settings.accessibility')}</span>
                                        </MobileMenuLink>

                                        <MobileMenuLink href={`/${language}/settings`} onClick={closeMenu}>
                                            <MobileMenuIcon className="bg-neo-cyan/50">
                                                <Settings className="w-4 h-4" aria-hidden="true" />
                                            </MobileMenuIcon>
                                            <span>{t('settings.moreSettings')}</span>
                                        </MobileMenuLink>
                                    </MobileMenuSection>

                                    <MenuDivider />

                                    {/* Community */}
                                    <MobileMenuSection label={t('ugc.nav.community')}>
                                        <MobileMenuLink href={`/${language}/community`} onClick={closeMenu}>
                                            <MobileMenuIcon className="bg-neo-pink/50">
                                                <Users className="w-4 h-4" aria-hidden="true" />
                                            </MobileMenuIcon>
                                            <span>{t('ugc.nav.community')}</span>
                                        </MobileMenuLink>
                                    </MobileMenuSection>

                                    <MenuDivider />

                                    {/* Brain Training - hidden, feature temporarily disabled */}
                                    {false && isAuthenticated && (
                                        <MobileMenuSection label={t('landing.brainTraining')}>
                                            <Link
                                                href={`/${language}/brain`}
                                                onClick={closeMenu}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                                                    "bg-gradient-to-r from-neo-purple/80 to-purple-400/80 hover:from-neo-purple hover:to-purple-400 text-neo-black",
                                                    "shadow-hard-sm hover:shadow-hard"
                                                )}
                                            >
                                                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-navy border-3 border-neo-black text-neo-purple-light">
                                                    <Brain className="w-4 h-4" aria-hidden="true" />
                                                </span>
                                                <span>{t('brain.nav.dashboard')}</span>
                                            </Link>
                                        </MobileMenuSection>
                                    )}

                                    {/* Admin Controls */}
                                    {isAdmin && (
                                        <>
                                            <MenuDivider />
                                            <MobileMenuSection label={t('common.admin')}>
                                                <Link
                                                    href={`/${language}/admin`}
                                                    onClick={closeMenu}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                                                        "bg-gradient-to-r from-neo-pink to-pink-400 hover:from-neo-pink/90 hover:to-pink-400/90 text-white",
                                                        "shadow-hard-sm hover:shadow-hard"
                                                    )}
                                                >
                                                    <span className="flex items-center justify-center w-7 h-7 rounded-md bg-neo-navy border-3 border-neo-black text-neo-pink">
                                                        <BarChart3 className="w-4 h-4" aria-hidden="true" />
                                                    </span>
                                                    <span>{t('common.adminDashboard')}</span>
                                                </Link>
                                            </MobileMenuSection>
                                        </>
                                    )}

                                    <MenuDivider />

                                    {/* Info Links */}
                                    <MobileInfoLinks language={language} t={t} onClose={closeMenu} />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
});

HeaderMobileMenu.displayName = 'HeaderMobileMenu';

export default HeaderMobileMenu;

// --- Helper sub-components ---

function MenuDivider() {
    return <div className="h-0.5 bg-neo-black/20 dark:bg-slate-600 rounded-full" />;
}

function MobileMenuSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-neo-black/80 dark:text-slate-300 uppercase tracking-wide">
                {label}
            </span>
            {children}
        </div>
    );
}

function MobileMenuIcon({ className, children }: { className: string; children: React.ReactNode }) {
    return (
        <span className={cn("flex items-center justify-center w-7 h-7 rounded-md border-3 border-neo-black text-neo-black dark:text-white", className)}>
            {children}
        </span>
    );
}

function MobileMenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full",
                "bg-white dark:bg-slate-700 hover:bg-neo-lime/30 dark:hover:bg-slate-600 text-neo-black dark:text-white",
                "shadow-hard-sm hover:shadow-hard"
            )}
        >
            {children}
        </Link>
    );
}

const infoLinkClass = cn(
    "flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-neo border-2 border-neo-black dark:border-slate-500 transition-all w-full",
    "bg-white dark:bg-slate-700 hover:bg-neo-cyan/50 dark:hover:bg-slate-600 text-neo-black dark:text-white",
    "shadow-hard-sm hover:shadow-hard"
);

function SmallIcon({ className, children }: { className: string; children: React.ReactNode }) {
    return (
        <span className={cn("flex items-center justify-center w-6 h-6 rounded-md border-2 border-neo-black text-neo-black", className)}>
            {children}
        </span>
    );
}

function MobileInfoLinks({ language, t, onClose }: { language: string; t: (key: string) => string; onClose: () => void }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neo-black/80 dark:text-slate-300 uppercase tracking-wide">
                {t('common.info')}
            </span>
            <div className="flex flex-col gap-1.5">
                <Link href={`/${language}/about`} onClick={onClose} className={infoLinkClass}>
                    <SmallIcon className="bg-neo-cyan"><Info className="w-3.5 h-3.5" aria-hidden="true" /></SmallIcon>
                    <span>{t('footer.about')}</span>
                </Link>
                <Link href={`/${language}/faq`} onClick={onClose} className={infoLinkClass}>
                    <SmallIcon className="bg-neo-yellow"><HelpCircle className="w-3.5 h-3.5" aria-hidden="true" /></SmallIcon>
                    <span>{t('footer.faq')}</span>
                </Link>
                <Link href={`/${language}/blog`} onClick={onClose} className={infoLinkClass}>
                    <SmallIcon className="bg-neo-orange"><Newspaper className="w-3.5 h-3.5" aria-hidden="true" /></SmallIcon>
                    <span>{t('footer.blog')}</span>
                </Link>
                <Link href={`/${language}/leaderboard`} onClick={onClose} className={infoLinkClass}>
                    <SmallIcon className="bg-neo-lime"><Trophy className="w-3.5 h-3.5" aria-hidden="true" /></SmallIcon>
                    <span>{t('footer.leaderboard')}</span>
                </Link>
                <Link href={`/${language}/contact`} onClick={onClose} className={infoLinkClass}>
                    <SmallIcon className="bg-neo-cream"><Mail className="w-3.5 h-3.5" aria-hidden="true" /></SmallIcon>
                    <span>{t('footer.contact')}</span>
                </Link>
                <Link href={`/${language}/legal`} onClick={onClose} className={cn(infoLinkClass, "hover:bg-neo-lime/50")}>
                    <SmallIcon className="bg-neo-pink-light"><ScrollText className="w-3.5 h-3.5 text-neo-black" aria-hidden="true" /></SmallIcon>
                    <span>{t('legal.title')}</span>
                </Link>
                <a
                    href="https://ko-fi.com/lexiclash"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    aria-label={`${t('support.kofiFooter')} (${t('common.opensInNewTab')})`}
                    className={cn(infoLinkClass, "bg-neo-pink/20 hover:bg-neo-pink/40")}
                >
                    <SmallIcon className="bg-neo-pink text-white"><Coffee className="w-3.5 h-3.5" aria-hidden="true" /></SmallIcon>
                    <span>{t('support.kofiFooter')}</span>
                    <span className="sr-only">({t('common.opensInNewTab')})</span>
                </a>
                <a
                    href="https://www.instagram.com/lexi.clash"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    aria-label="Instagram"
                    className={cn(infoLinkClass, "hover:bg-neo-pink/30")}
                >
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-neo-black text-white">
                        <InstagramIcon className="w-3.5 h-3.5" size="0.875em" />
                    </span>
                    <span>Instagram</span>
                    <span className="sr-only">({t('common.opensInNewTab')})</span>
                </a>
                <div
                    onClick={onClose}
                    className={infoLinkClass}
                >
                    <SmallIcon className="bg-neo-lime"><Cookie className="w-3.5 h-3.5" aria-hidden="true" /></SmallIcon>
                    <ManageCookiesButton />
                </div>
            </div>
        </div>
    );
}
