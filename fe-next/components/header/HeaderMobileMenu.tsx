import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { Menu, X, Settings, Trophy, ScrollText, Coffee, Accessibility, Info, HelpCircle, Mail, Cookie, Gift, Users, ChevronRight, Sparkles, User } from 'lucide-react';
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

// --- Animation config ---
const SWIPE_CLOSE_THRESHOLD = 80;

const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

const staggerContainer = {
    visible: {
        transition: { staggerChildren: 0.04, delayChildren: 0.1 },
    },
    exit: {
        transition: { staggerChildren: 0.02, staggerDirection: -1 },
    },
};

const staggerItem = {
    hidden: { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 260 } },
    exit: { opacity: 0, x: 24, transition: { duration: 0.12 } },
};

const staggerItemRtl = {
    hidden: { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 260 } },
    exit: { opacity: 0, x: -24, transition: { duration: 0.12 } },
};

const HeaderMobileMenu = memo<HeaderMobileMenuProps>(({ unclaimedCount, onOpenGiftModal, onSignIn, onSignUp }) => {
    const { t, language } = useLanguage();
    const { isAuthenticated, isAdmin, profile, user } = useAuth();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [mounted, setMounted] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const isRtl = language === 'he';

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

    // Close on escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setShowMobileMenu(false);
        };
        if (showMobileMenu) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showMobileMenu]);

    // Lock body scroll when menu is open
    useEffect(() => {
        if (showMobileMenu) {
            document.body.style.overflow = 'hidden';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showMobileMenu]);

    const closeMenu = useCallback(() => setShowMobileMenu(false), []);

    const handleSignIn = useCallback(() => { closeMenu(); onSignIn(); }, [closeMenu, onSignIn]);
    const handleSignUp = useCallback(() => { closeMenu(); onSignUp(); }, [closeMenu, onSignUp]);
    const handleOpenGift = useCallback(() => { closeMenu(); onOpenGiftModal(); }, [closeMenu, onOpenGiftModal]);

    // Swipe-to-close handler (RTL-aware)
    const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const shouldClose = isRtl
            ? info.offset.x < -SWIPE_CLOSE_THRESHOLD
            : info.offset.x > SWIPE_CLOSE_THRESHOLD;
        if (shouldClose) setShowMobileMenu(false);
    }, [isRtl]);

    const guestAvatar = !isAuthenticated ? getStoredCustomAvatar() : null;
    const avatarConfig = profile?.avatar_config ?? guestAvatar;
    const itemVariants = isRtl ? staggerItemRtl : staggerItem;

    return (
        <>
            {/* Mobile: Avatar + Volume + Notifications + Hamburger */}
            <div className="sm:hidden flex items-center gap-2 min-w-0 flex-shrink-0">
                <Link
                    href={`/${language}/profile`}
                    className="flex-shrink-0 rounded-full border-2 border-neo-black shadow-hard-sm"
                    aria-label={t('profile.viewProfile')}
                >
                    <Avatar
                        customAvatar={avatarConfig}
                        avatarImage={profile?.avatar_image}
                        userId={user?.id}
                        size="md"
                    />
                </Link>
                <MusicControls />
                {isAuthenticated && <NotificationBell />}

                {/* Sign In button for guests */}
                {!isAuthenticated && (
                    <button
                        onClick={onSignIn}
                        className={cn(
                            "flex items-center gap-1.5 flex-shrink-0",
                            "px-3 h-11 min-h-[44px]",
                            "bg-neo-cyan text-neo-black",
                            "border-3 border-neo-black",
                            "rounded-neo shadow-hard-sm",
                            "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard",
                            "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                            "transition-all duration-100",
                            "text-xs font-bold"
                        )}
                        aria-label={t('auth.signIn')}
                    >
                        <User size={14} aria-hidden="true" />
                        <span>{t('auth.signIn')}</span>
                    </button>
                )}

                {/* Animated Hamburger Button */}
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
                    aria-expanded={showMobileMenu}
                >
                    <motion.div
                        animate={{ rotate: showMobileMenu ? 90 : 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                    >
                        {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
                    </motion.div>
                </button>
            </div>

            {/* Mobile Menu Slide-out Pane */}
            {mounted && createPortal(
                <AnimatePresence>
                    {showMobileMenu && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                variants={backdropVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 bg-neo-black/60 backdrop-blur-[2px] z-70 sm:hidden"
                                onClick={closeMenu}
                            />

                            {/* Slide-out pane with swipe-to-close */}
                            <motion.div
                                ref={mobileMenuRef}
                                initial={{ x: isRtl ? '-100%' : '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: isRtl ? '-100%' : '100%' }}
                                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                                drag="x"
                                dragConstraints={{ left: isRtl ? -200 : 0, right: isRtl ? 0 : 200 }}
                                dragElastic={0.15}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                    "fixed top-0 bottom-0 w-[300px] max-w-[88vw] z-80 sm:hidden",
                                    "bg-neo-navy border-neo-black",
                                    "shadow-hard-xl overflow-y-auto overflow-x-hidden",
                                    "pb-[max(env(safe-area-inset-bottom),1rem)]",
                                    isRtl
                                        ? "left-0 border-r-4 rounded-r-neo-lg"
                                        : "right-0 border-l-4 rounded-l-neo-lg"
                                )}
                                style={{ touchAction: 'pan-y' }}
                            >
                                {/* ── Close button (top corner) ── */}
                                <div className={cn(
                                    "absolute top-3 z-10",
                                    isRtl ? "right-3" : "left-3"
                                )}>
                                    <button
                                        onClick={closeMenu}
                                        className={cn(
                                            "flex items-center justify-center",
                                            "w-9 h-9",
                                            "bg-neo-white/10 text-neo-white/70",
                                            "border-2 border-neo-white/20",
                                            "rounded-full",
                                            "hover:bg-neo-white/20 hover:text-neo-white",
                                            "active:scale-90",
                                            "transition-all duration-100"
                                        )}
                                        aria-label={t('common.closeMenu')}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* ── Profile Hero Section ── */}
                                <div className={cn(
                                    "relative px-5 pt-12 pb-5",
                                    "bg-gradient-to-b from-neo-purple/30 via-neo-navy to-neo-navy",
                                    "border-b-3 border-neo-black/40"
                                )}>
                                    {/* Decorative dots */}
                                    <div className="absolute top-2 right-4 flex gap-1 opacity-30">
                                        <div className="w-1.5 h-1.5 rounded-full bg-neo-pink" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-neo-cyan" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-neo-lime" />
                                    </div>

                                    {isAuthenticated && profile ? (
                                        <Link href={`/${language}/profile`} onClick={closeMenu} className="block group">
                                            <div className="flex items-center gap-3.5">
                                                <div className="relative flex-shrink-0">
                                                    <div className="rounded-full border-3 border-neo-lime shadow-hard-sm p-0.5 bg-neo-navy group-hover:border-neo-cyan transition-colors">
                                                        <Avatar
                                                            customAvatar={avatarConfig}
                                                            avatarImage={profile.avatar_image}
                                                            userId={user?.id}
                                                            size="lg"
                                                        />
                                                    </div>
                                                    {/* Level badge */}
                                                    {profile.current_level != null && (
                                                        <div className="absolute -bottom-1 -right-1 bg-neo-lime text-neo-black text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-neo-black shadow-hard-sm">
                                                            {profile.current_level}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-base font-black text-neo-white truncate">
                                                        {profile.display_name || profile.username}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <CoinBalance coins={profile.total_coins || 0} size="sm" showAnimation={false} />
                                                    </div>
                                                    {profile.total_games != null && profile.total_games > 0 && (
                                                        <span className="text-[10px] text-neo-white/40 mt-0.5 font-bold">
                                                            {profile.total_games} {t('profile.gamesPlayed')}
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronRight className={cn(
                                                    "ms-auto w-4 h-4 text-neo-white/30 group-hover:text-neo-white/60 transition-colors flex-shrink-0",
                                                    isRtl && "rotate-180"
                                                )} />
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-full border-3 border-neo-white/20 shadow-hard-sm p-0.5 bg-neo-navy">
                                                    <Avatar
                                                        customAvatar={avatarConfig}
                                                        userId="guest"
                                                        size="lg"
                                                    />
                                                </div>
                                                <span className="text-base font-black text-neo-white/60">
                                                    {t('common.guest')}
                                                </span>
                                            </div>
                                            <AuthButton
                                                inline
                                                onClose={closeMenu}
                                                onSignInClick={handleSignIn}
                                                onSignUpClick={handleSignUp}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* ── Menu Items (Staggered) ── */}
                                <motion.div
                                    className="flex flex-col gap-1.5 p-4"
                                    variants={staggerContainer}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                >
                                    {/* Gift Notification - highlighted */}
                                    {isAuthenticated && unclaimedCount > 0 && (
                                        <motion.div variants={itemVariants}>
                                            <button
                                                onClick={handleOpenGift}
                                                className={cn(
                                                    "relative flex items-center gap-3 w-full px-4 py-3 text-sm font-bold rounded-neo",
                                                    "bg-gradient-to-r from-amber-500/90 to-amber-400/90 text-neo-black",
                                                    "border-3 border-neo-black shadow-hard-sm",
                                                    "hover:shadow-hard hover:translate-y-[-1px]",
                                                    "active:translate-y-[1px] active:shadow-none",
                                                    "transition-all duration-100"
                                                )}
                                            >
                                                <MenuIcon className="bg-white/30 border-neo-black/30">
                                                    <Gift className="w-4 h-4" aria-hidden="true" />
                                                </MenuIcon>
                                                <span>{t('gift.youHaveGifts') || `You have ${unclaimedCount} gift${unclaimedCount !== 1 ? 's' : ''}`}</span>
                                                <GiftNotificationBadge count={unclaimedCount} className="relative top-0 right-0" />
                                                <Sparkles className="absolute top-1 right-2 w-3 h-3 text-white/50 animate-pulse" aria-hidden="true" />
                                            </button>
                                        </motion.div>
                                    )}

                                    {/* ─ Settings Section ─ */}
                                    <motion.div variants={itemVariants}>
                                        <SectionLabel>{t('settings.title')}</SectionLabel>
                                    </motion.div>

                                    <motion.div variants={itemVariants}>
                                        <div className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-neo",
                                            "bg-neo-white/5 border-2 border-neo-white/10"
                                        )}>
                                            <span className="text-sm font-bold text-neo-white/80">
                                                {t('settings.language')}
                                            </span>
                                            <div className="ms-auto">
                                                <QuickLanguageSwitcher showLabel />
                                            </div>
                                        </div>
                                    </motion.div>

                                    <motion.div variants={itemVariants}>
                                        <MenuLink href={`/${language}/settings#accessibility`} onClick={closeMenu} accentColor="cyan">
                                            <MenuIcon className="bg-neo-cyan/20 border-neo-cyan/40">
                                                <Accessibility className="w-4 h-4 text-neo-cyan" aria-hidden="true" />
                                            </MenuIcon>
                                            <span>{t('settings.accessibility')}</span>
                                        </MenuLink>
                                    </motion.div>

                                    <motion.div variants={itemVariants}>
                                        <MenuLink href={`/${language}/settings`} onClick={closeMenu} accentColor="cyan">
                                            <MenuIcon className="bg-neo-cyan/20 border-neo-cyan/40">
                                                <Settings className="w-4 h-4 text-neo-cyan" aria-hidden="true" />
                                            </MenuIcon>
                                            <span>{t('settings.moreSettings')}</span>
                                        </MenuLink>
                                    </motion.div>

                                    {/* ─ Community ─ */}
                                    <motion.div variants={itemVariants}>
                                        <SectionLabel>{t('ugc.nav.community')}</SectionLabel>
                                    </motion.div>

                                    <motion.div variants={itemVariants}>
                                        <MenuLink href={`/${language}/community`} onClick={closeMenu} accentColor="pink">
                                            <MenuIcon className="bg-neo-pink/20 border-neo-pink/40">
                                                <Users className="w-4 h-4 text-neo-pink" aria-hidden="true" />
                                            </MenuIcon>
                                            <span>{t('ugc.nav.community')}</span>
                                        </MenuLink>
                                    </motion.div>

                                    {/* ─ Admin ─ */}
                                    {isAdmin && (
                                        <>
                                            <motion.div variants={itemVariants}>
                                                <SectionLabel>{t('common.admin')}</SectionLabel>
                                            </motion.div>
                                            <motion.div variants={itemVariants}>
                                                <Link
                                                    href={`/${language}/admin`}
                                                    onClick={closeMenu}
                                                    className={cn(
                                                        "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo w-full",
                                                        "bg-gradient-to-r from-neo-pink/30 to-neo-pink/10 text-neo-white",
                                                        "border-2 border-neo-pink/40",
                                                        "hover:border-neo-pink/60 hover:from-neo-pink/40",
                                                        "active:scale-[0.98]",
                                                        "transition-all duration-100"
                                                    )}
                                                >
                                                    <MenuIcon className="bg-neo-pink/30 border-neo-pink/50">
                                                        <Sparkles className="w-4 h-4 text-neo-pink" aria-hidden="true" />
                                                    </MenuIcon>
                                                    <span>{t('common.adminDashboard')}</span>
                                                </Link>
                                            </motion.div>
                                        </>
                                    )}

                                    {/* ─ Info Links ─ */}
                                    <motion.div variants={itemVariants}>
                                        <SectionLabel>{t('common.info')}</SectionLabel>
                                    </motion.div>

                                    <motion.div variants={itemVariants}>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <InfoLink href={`/${language}/about`} onClick={closeMenu} icon={<Info className="w-3.5 h-3.5" />} color="bg-neo-cyan/20 text-neo-cyan">{t('footer.about')}</InfoLink>
                                            <InfoLink href={`/${language}/faq`} onClick={closeMenu} icon={<HelpCircle className="w-3.5 h-3.5" />} color="bg-neo-yellow/20 text-neo-yellow">{t('footer.faq')}</InfoLink>
                                            <InfoLink href={`/${language}/leaderboard`} onClick={closeMenu} icon={<Trophy className="w-3.5 h-3.5" />} color="bg-neo-lime/20 text-neo-lime">{t('footer.leaderboard')}</InfoLink>
                                            <InfoLink href={`/${language}/contact`} onClick={closeMenu} icon={<Mail className="w-3.5 h-3.5" />} color="bg-neo-white/10 text-neo-white/60">{t('footer.contact')}</InfoLink>
                                            <InfoLink href={`/${language}/legal`} onClick={closeMenu} icon={<ScrollText className="w-3.5 h-3.5" />} color="bg-neo-pink/20 text-neo-pink-light">{t('legal.title')}</InfoLink>
                                            <InfoLinkExternal href="https://ko-fi.com/lexiclash" onClick={closeMenu} icon={<Coffee className="w-3.5 h-3.5" />} color="bg-neo-pink/30 text-neo-pink" label={t('common.opensInNewTab')}>{t('support.kofiFooter')}</InfoLinkExternal>
                                        </div>
                                    </motion.div>

                                    <motion.div variants={itemVariants}>
                                        <div className="flex items-center gap-1.5">
                                            <a
                                                href="https://www.instagram.com/lexi.clash"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={closeMenu}
                                                aria-label="Instagram"
                                                className={cn(
                                                    "flex items-center gap-2 flex-1 px-3 py-2 text-xs font-bold rounded-neo",
                                                    "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-neo-white/70",
                                                    "border-2 border-neo-white/10",
                                                    "hover:border-neo-white/20 hover:text-neo-white",
                                                    "transition-all duration-100"
                                                )}
                                            >
                                                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                                    <InstagramIcon className="w-3 h-3" size="0.75em" />
                                                </span>
                                                <span>Instagram</span>
                                            </a>
                                            <div
                                                onClick={closeMenu}
                                                className={cn(
                                                    "flex items-center gap-2 flex-1 px-3 py-2 text-xs font-bold rounded-neo cursor-pointer",
                                                    "bg-neo-white/5 text-neo-white/70",
                                                    "border-2 border-neo-white/10",
                                                    "hover:border-neo-white/20 hover:text-neo-white",
                                                    "transition-all duration-100"
                                                )}
                                            >
                                                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-neo-lime/20 text-neo-lime">
                                                    <Cookie className="w-3 h-3" aria-hidden="true" />
                                                </span>
                                                <ManageCookiesButton />
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* ─ Account (Login/Logout) ─ */}
                                    <motion.div variants={itemVariants}>
                                        <SectionLabel>{t('common.account')}</SectionLabel>
                                    </motion.div>
                                    <motion.div variants={itemVariants}>
                                        <AuthButton
                                            inline
                                            onClose={closeMenu}
                                            onSignInClick={handleSignIn}
                                            onSignUpClick={handleSignUp}
                                        />
                                    </motion.div>

                                    {/* Swipe hint */}
                                    <motion.div variants={itemVariants} className="flex justify-center pt-2 pb-1">
                                        <span className="text-[10px] text-neo-white/20 font-bold">
                                            {isRtl ? '← ' : ''}
                                            {t('common.swipeToClose') || 'Swipe to close'}
                                            {!isRtl ? ' →' : ''}
                                        </span>
                                    </motion.div>
                                </motion.div>
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

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 pt-3 pb-1 px-1">
            <span className="text-[10px] font-black text-neo-white/30 uppercase tracking-widest">
                {children}
            </span>
            <div className="flex-1 h-px bg-neo-white/10" />
        </div>
    );
}

function MenuIcon({ className, children }: { className: string; children: React.ReactNode }) {
    return (
        <span className={cn(
            "flex items-center justify-center w-7 h-7 rounded-lg border-2 flex-shrink-0",
            className
        )}>
            {children}
        </span>
    );
}

function MenuLink({ href, onClick, accentColor, children }: {
    href: string;
    onClick: () => void;
    accentColor: 'cyan' | 'pink' | 'lime' | 'purple';
    children: React.ReactNode;
}) {
    const hoverColors = {
        cyan: 'hover:border-neo-cyan/40',
        pink: 'hover:border-neo-pink/40',
        lime: 'hover:border-neo-lime/40',
        purple: 'hover:border-neo-purple/40',
    };

    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo w-full",
                "bg-neo-white/5 text-neo-white/90",
                "border-2 border-neo-white/10",
                hoverColors[accentColor],
                "hover:bg-neo-white/8",
                "active:scale-[0.98]",
                "transition-all duration-100"
            )}
        >
            {children}
        </Link>
    );
}

function InfoLink({ href, onClick, icon, color, children }: {
    href: string;
    onClick: () => void;
    icon: React.ReactNode;
    color: string;
    children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-xs font-bold rounded-neo",
                "bg-neo-white/5 text-neo-white/70",
                "border-2 border-neo-white/10",
                "hover:border-neo-white/20 hover:text-neo-white",
                "active:scale-[0.97]",
                "transition-all duration-100"
            )}
        >
            <span className={cn("flex items-center justify-center w-5 h-5 rounded-md", color)}>
                {icon}
            </span>
            <span className="truncate">{children}</span>
        </Link>
    );
}

function InfoLinkExternal({ href, onClick, icon, color, label, children }: {
    href: string;
    onClick: () => void;
    icon: React.ReactNode;
    color: string;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            aria-label={`${children} (${label})`}
            className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-xs font-bold rounded-neo",
                "bg-neo-white/5 text-neo-white/70",
                "border-2 border-neo-white/10",
                "hover:border-neo-white/20 hover:text-neo-white",
                "active:scale-[0.97]",
                "transition-all duration-100"
            )}
        >
            <span className={cn("flex items-center justify-center w-5 h-5 rounded-md", color)}>
                {icon}
            </span>
            <span className="truncate">{children}</span>
        </a>
    );
}
