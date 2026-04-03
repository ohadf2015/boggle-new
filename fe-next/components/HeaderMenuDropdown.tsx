import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import {
    Menu, X, Accessibility, Settings, Sparkles, BarChart3,
    Gift, Users, Flame, Trophy, HelpCircle, Mail, Coffee, Info
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import AuthButton from './auth/AuthButton';
import Avatar from './Avatar';
import { CoinBalance } from './CoinBalance';
import { GiftNotificationBadge } from './gift/GiftNotificationBadge';
import { NotificationBell } from './notifications/NotificationBell';
import { QuickLanguageSwitcher } from './QuickLanguageSwitcher';
import MusicControls from './MusicControls';
import { getStoredCustomAvatar } from '../utils/profileStorage';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import { useDailyMissions } from '@/hooks/useDailyMissions';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface HeaderMenuDropdownProps {
    unclaimedCount?: number;
    onOpenGiftModal?: () => void;
}

const HeaderMenuDropdown = memo<HeaderMenuDropdownProps>(({
    unclaimedCount = 0,
    onOpenGiftModal,
}) => {
    const { t, language } = useLanguage();
    const { isAuthenticated, isAdmin, profile, user } = useAuth();
    const engagementStatus = useEngagementStatus();
    const { missions, completedCount, isGrandSlam } = useDailyMissions();
    const { unreadCount: notificationCount } = useRealtimeNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const [badgeSeen, setBadgeSeen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isRtl = language === 'he';

    const guestAvatar = !isAuthenticated ? getStoredCustomAvatar() : null;
    const avatarConfig = profile?.avatar_config ?? guestAvatar;

    // Aggregate badge: gifts + notifications + completed quests
    const badgeCount = unclaimedCount + (isAuthenticated ? notificationCount : 0) + completedCount;

    // Reset "seen" when badge count increases (new notifications arrived)
    const prevBadgeCount = useRef(badgeCount);
    if (badgeCount > prevBadgeCount.current) {
        setBadgeSeen(false);
    }
    prevBadgeCount.current = badgeCount;

    const closeMenu = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleOpenGift = useCallback(() => {
        closeMenu();
        onOpenGiftModal?.();
    }, [closeMenu, onOpenGiftModal]);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Hamburger Trigger */}
            <button
                onClick={() => {
                    if (!isOpen) setBadgeSeen(true);
                    setIsOpen(!isOpen);
                }}
                className={cn(
                    "flex items-center justify-center",
                    "w-10 h-10",
                    "bg-neo-cream text-neo-black",
                    "border-3 border-neo-black",
                    "rounded-neo shadow-hard-sm",
                    "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard hover:bg-neo-lime/40",
                    "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                    "transition-all duration-100"
                )}
                aria-label={isOpen ? t('common.closeMenu') : t('common.openMenu')}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <m.div
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                >
                    {isOpen ? <X size={18} /> : <Menu size={18} />}
                </m.div>
                {/* Aggregated badge: gifts + notifications + completed quests */}
                {badgeCount > 0 && !badgeSeen && (
                    <div className={cn(
                        "absolute -top-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-neo-red rounded-full border-2 border-neo-cream text-[10px] font-black text-white leading-none",
                        isRtl ? '-left-1.5' : '-right-1.5'
                    )}>{badgeCount}</div>
                )}
            </button>

            <LazyMotion features={domAnimation}>
            <AnimatePresence>
                {isOpen && (
                    <m.div
                        initial={{ opacity: 0, y: -12, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className={cn(
                            "absolute top-full mt-3 w-80",
                            isRtl ? 'left-0' : 'right-0',
                            "bg-neo-navy",
                            "border-4 border-neo-black",
                            "rounded-neo-lg shadow-hard-xl",
                            "z-60 overflow-y-auto max-h-[calc(100dvh-5rem)]"
                        )}
                    >
                        {/* Decorative top stripe */}
                        <div className="h-1 bg-gradient-to-r from-neo-lime via-neo-cyan to-neo-purple" />

                        {/* ── Profile Hero ── */}
                        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-neo-purple/20 to-transparent border-b-2 border-neo-white/10">
                            {isAuthenticated && profile ? (
                                <Link href={`/${language}/profile`} onClick={closeMenu} className="block group">
                                    <div className="flex items-center gap-3.5">
                                        <div className="relative flex-shrink-0">
                                            <div className="rounded-full border-3 border-neo-lime shadow-hard-sm p-0.5 bg-neo-navy group-hover:border-neo-cyan transition-colors">
                                                <Avatar
                                                    customAvatar={avatarConfig}
                                                    userId={user?.id}
                                                    size="lg"
                                                />
                                            </div>
                                            {profile.current_level != null && (
                                                <div className="absolute -bottom-1 -right-1 bg-neo-lime text-neo-black text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-neo-black shadow-hard-sm">
                                                    {profile.current_level}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-base font-black text-neo-white truncate group-hover:text-neo-cyan transition-colors">
                                                {profile.display_name || profile.username}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <CoinBalance coins={profile.total_coins || 0} size="sm" showAnimation={false} />
                                            </div>
                                            {engagementStatus.streak > 0 && (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Flame className="w-3.5 h-3.5 text-neo-orange fill-current" />
                                                    <span className="text-[10px] font-black text-neo-orange">{engagementStatus.streak}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full border-3 border-neo-white/30 shadow-hard-sm p-0.5 bg-neo-navy">
                                        <Avatar
                                            customAvatar={avatarConfig}
                                            userId={undefined}
                                            size="lg"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-black text-neo-white/60">{t('common.guest')}</span>
                                        <AuthButton
                                            onClose={closeMenu}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Daily Missions ── */}
                        {isAuthenticated && missions.length > 0 && (
                            <Link
                                href={`/${language}/daily`}
                                onClick={closeMenu}
                                className={cn(
                                    "flex items-center gap-3 px-5 py-2.5",
                                    "bg-neo-navy-light/30 border-b-2 border-neo-white/10",
                                    "hover:bg-neo-lime/10 transition-colors"
                                )}
                            >
                                <Trophy className="w-4 h-4 text-neo-lime flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-neo-white/50 mb-1">
                                        {t('dailyMissions.title')}
                                    </div>
                                    <div className="flex gap-1">
                                        {missions.map((m) => (
                                            <div
                                                key={m.type}
                                                className={cn(
                                                    "h-1.5 flex-1 rounded-full",
                                                    m.completed ? "bg-neo-lime" : "bg-neo-white/15"
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <span className={cn(
                                    "text-xs font-black",
                                    isGrandSlam ? "text-neo-lime" : "text-neo-white/40"
                                )}>
                                    {completedCount}/{missions.length}
                                </span>
                            </Link>
                        )}

                        {/* ── Quick Actions ── */}
                        <div className="px-4 py-3 space-y-2">
                            {/* Gift notification (only when there are unclaimed gifts) */}
                            {isAuthenticated && unclaimedCount > 0 && (
                                <button
                                    onClick={handleOpenGift}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5",
                                        "bg-amber-400/20 text-amber-300",
                                        "border-2 border-amber-400/40",
                                        "rounded-neo",
                                        "hover:bg-amber-400/30 hover:border-amber-400/60",
                                        "active:scale-[0.98]",
                                        "transition-all duration-100",
                                        "font-bold text-sm"
                                    )}
                                >
                                    <Gift size={18} />
                                    <span className="flex-1 text-start">{t('gift.youHaveGifts')}</span>
                                    <GiftNotificationBadge count={unclaimedCount} />
                                </button>
                            )}

                            {/* Notifications */}
                            {isAuthenticated && (
                                <div className="flex items-center justify-between px-1">
                                    <NotificationBell />
                                </div>
                            )}
                        </div>

                        {/* ── Navigation ── */}
                        <div className="px-4 pb-3 space-y-1">
                            <SectionLabel icon={<Sparkles size={12} />} label={t('common.info')} />

                            <MenuLink
                                href={`/${language}/community`}
                                icon={<Users size={16} />}
                                label={t('ugc.nav.community')}
                                onClick={closeMenu}
                            />
                            <MenuLink
                                href={`/${language}/leaderboard`}
                                icon={<Trophy size={16} />}
                                label={t('footer.leaderboard')}
                                onClick={closeMenu}
                            />
                        </div>

                        {/* Divider */}
                        <div className="mx-4 h-[2px] bg-gradient-to-r from-transparent via-neo-white/15 to-transparent" />

                        {/* ── Settings ── */}
                        <div className="px-4 py-3 space-y-2">
                            <SectionLabel icon={<Settings size={12} />} label={t('settings.title')} />

                            <div className="flex items-center justify-between px-3 py-2">
                                <span className="text-sm font-bold text-neo-white/70">{t('settings.language')}</span>
                                <QuickLanguageSwitcher compact />
                            </div>

                            <div className="flex items-center justify-between px-3 py-2">
                                <span className="text-sm font-bold text-neo-white/70">{t('settings.sound')}</span>
                                <MusicControls />
                            </div>

                            <MenuLink
                                href={`/${language}/settings#accessibility`}
                                icon={<Accessibility size={16} />}
                                label={t('settings.accessibility')}
                                onClick={closeMenu}
                            />
                            <MenuLink
                                href={`/${language}/settings`}
                                icon={<Settings size={16} />}
                                label={t('settings.moreSettings')}
                                onClick={closeMenu}
                            />
                        </div>

                        {/* ── Admin (if admin) ── */}
                        {isAdmin && (
                            <>
                                <div className="mx-4 h-[2px] bg-gradient-to-r from-transparent via-neo-white/15 to-transparent" />
                                <div className="px-4 py-3">
                                    <SectionLabel icon={<BarChart3 size={12} />} label={t('common.admin')} />
                                    <Link
                                        href={`/${language}/admin`}
                                        onClick={closeMenu}
                                        className={cn(
                                            "group flex items-center gap-3 px-3 py-2.5",
                                            "bg-gradient-to-r from-neo-pink/20 to-neo-pink/10",
                                            "border-2 border-neo-pink/30",
                                            "rounded-neo",
                                            "hover:from-neo-pink/30 hover:to-neo-pink/20 hover:border-neo-pink/50",
                                            "active:scale-[0.98]",
                                            "transition-all duration-100",
                                            "font-bold text-sm text-neo-pink"
                                        )}
                                    >
                                        <BarChart3 size={16} />
                                        <span>{t('common.adminDashboard')}</span>
                                    </Link>
                                </div>
                            </>
                        )}

                        {/* ── Info ── */}
                        <div className="mx-4 h-[2px] bg-gradient-to-r from-transparent via-neo-white/15 to-transparent" />
                        <div className="px-4 py-3 grid grid-cols-2 gap-1.5">
                            <InfoLink href={`/${language}/about`} icon={<Info size={14} />} label={t('footer.about')} onClick={closeMenu} />
                            <InfoLink href={`/${language}/faq`} icon={<HelpCircle size={14} />} label={t('footer.faq')} onClick={closeMenu} />
                            <InfoLink href={`/${language}/contact`} icon={<Mail size={14} />} label={t('footer.contact')} onClick={closeMenu} />
                            <InfoLink href="https://ko-fi.com/lexiclash" icon={<Coffee size={14} />} label="Ko-fi" onClick={closeMenu} external />
                        </div>

                        {/* ── Auth footer ── */}
                        {isAuthenticated && (
                            <>
                                <div className="mx-4 h-[2px] bg-gradient-to-r from-transparent via-neo-white/15 to-transparent" />
                                <div className="px-4 py-3">
                                    <AuthButton inline onClose={closeMenu} />
                                </div>
                            </>
                        )}

                        {/* Decorative bottom stripe */}
                        <div className="h-1 bg-gradient-to-r from-neo-purple via-neo-cyan to-neo-lime" />
                    </m.div>
                )}
            </AnimatePresence>
            </LazyMotion>
        </div>
    );
});

HeaderMenuDropdown.displayName = 'HeaderMenuDropdown';

/* ── Helper sub-components ── */

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-2 px-1 pb-1">
            <span className="text-neo-white/40">{icon}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-neo-white/40">
                {label}
            </span>
        </div>
    );
}

function MenuLink({ href, icon, label, onClick }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5",
                "text-neo-white/80",
                "rounded-neo",
                "hover:bg-neo-white/10 hover:text-neo-white",
                "active:scale-[0.98]",
                "transition-all duration-100",
                "font-bold text-sm"
            )}
        >
            <span className="text-neo-white/50">{icon}</span>
            <span>{label}</span>
        </Link>
    );
}

function InfoLink({ href, icon, label, onClick, external }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    external?: boolean;
}) {
    const cls = cn(
        "flex items-center gap-2 px-2.5 py-2",
        "text-neo-white/50",
        "rounded-neo",
        "hover:bg-neo-white/5 hover:text-neo-white/70",
        "transition-all duration-100",
        "text-xs font-bold"
    );

    if (external) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={cls}>
                {icon}
                <span>{label}</span>
            </a>
        );
    }

    return (
        <Link href={href} onClick={onClick} className={cls}>
            {icon}
            <span>{label}</span>
        </Link>
    );
}

export default HeaderMenuDropdown;
