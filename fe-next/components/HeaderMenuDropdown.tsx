import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import {
    Menu, X, Accessibility, Settings, Sparkles, BarChart3,
    Gift, Users, Flame, Trophy, HelpCircle, Mail, Coffee, Info, Bell, Check
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import AuthButton from './auth/AuthButton';
import Avatar from './Avatar';
import { CoinBalance } from './CoinBalance';
import { GiftNotificationBadge } from './gift/GiftNotificationBadge';
import { NotificationItem } from './notifications/NotificationItem';
import type { NotificationData } from './notifications/types';
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
    const { notifications, unreadCount: notificationCount, markAsRead, markAllAsRead, dismissNotification, clearAllNotifications } = useRealtimeNotifications();
    const [showAllNotifications, setShowAllNotifications] = useState(false);
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
                {badgeCount > 0 && !isOpen && !badgeSeen && (
                    <div className={cn(
                        "absolute -top-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-neo-red rounded-full border-2 border-neo-cream text-[10px] font-black text-white leading-none",
                        isRtl ? '-left-2' : '-right-2'
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

                        {/* ── Daily Missions (expanded) ── */}
                        {isAuthenticated && missions.length > 0 && (
                            <div className="px-5 py-3 bg-neo-navy-light/30 border-b-2 border-neo-white/10 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-neo-lime flex-shrink-0" />
                                        <span className="text-[10px] font-black text-neo-white/50 uppercase tracking-widest">
                                            {t('dailyMissions.title')}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        "text-xs font-black",
                                        isGrandSlam ? "text-neo-lime" : "text-neo-white/40"
                                    )}>
                                        {completedCount}/{missions.length}
                                    </span>
                                </div>
                                {missions.map((m) => (
                                    <Link
                                        key={m.type}
                                        href={`/${language}${m.href}`}
                                        onClick={closeMenu}
                                        className={cn(
                                            "flex items-center gap-2.5 px-3 py-2 rounded-neo",
                                            m.completed
                                                ? "bg-neo-lime/10 border border-neo-lime/30"
                                                : "bg-neo-white/5 border border-neo-white/10 hover:border-neo-lime/30",
                                            "transition-colors"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                            m.completed ? "border-neo-lime bg-neo-lime/20" : "border-neo-white/20"
                                        )}>
                                            {m.completed && <Check size={10} className="text-neo-lime" />}
                                        </div>
                                        <span className={cn(
                                            "text-xs font-bold flex-1",
                                            m.completed ? "text-neo-lime/80 line-through" : "text-neo-white/70"
                                        )}>
                                            {t(`dailyMissions.${m.type}`)}
                                        </span>
                                    </Link>
                                ))}
                                <Link
                                    href={`/${language}/quests`}
                                    onClick={closeMenu}
                                    className="flex items-center justify-center gap-1.5 mt-1 text-[10px] font-bold text-neo-cyan hover:text-neo-lime transition-colors"
                                >
                                    <Sparkles size={10} />
                                    {t('quests.title')}
                                </Link>
                            </div>
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

                            {/* Notifications (inline) */}
                            {isAuthenticated && ((notifications as NotificationData[]) ?? []).length > 0 && (
                                <div className="mt-1">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <Bell className="w-3.5 h-3.5 text-neo-yellow" />
                                            <span className="text-[10px] font-black text-neo-white/30 uppercase tracking-widest">
                                                {t('notifications.title')}
                                            </span>
                                            {notificationCount > 0 && (
                                                <span className="min-w-[16px] h-4 px-1 flex items-center justify-center bg-neo-yellow rounded-full border border-black text-[9px] font-black text-black">
                                                    {notificationCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {notificationCount > 0 && (
                                                <button
                                                    onClick={() => markAllAsRead()}
                                                    className="flex items-center gap-1 text-[10px] text-neo-cyan hover:text-neo-yellow transition-colors font-bold"
                                                >
                                                    <Check size={10} />
                                                    {t('notifications.markAllRead')}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => clearAllNotifications()}
                                                className="flex items-center gap-1 text-[10px] text-neo-white/40 hover:text-neo-red transition-colors font-bold"
                                            >
                                                <X size={10} />
                                                {t('notifications.clearAll', 'Clear all')}
                                            </button>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "rounded-neo border-2 border-neo-white/10 overflow-hidden",
                                        "bg-neo-white/5"
                                    )}>
                                        {(showAllNotifications
                                            ? (notifications as NotificationData[])
                                            : (notifications as NotificationData[]).slice(0, 3)
                                        ).map((n) => (
                                            <NotificationItem
                                                key={n.id}
                                                notification={n}
                                                onClick={() => {
                                                    if (n.notification_type === 'gift') {
                                                        closeMenu();
                                                        window.dispatchEvent(new CustomEvent('openGiftModal', {
                                                            detail: { giftId: n.related_entity_id },
                                                        }));
                                                    } else if (n.action_url) {
                                                        closeMenu();
                                                        const url = n.action_url.startsWith('/') ? `/${language}${n.action_url}` : n.action_url;
                                                        window.location.href = url;
                                                    }
                                                }}
                                                onMarkAsRead={() => markAsRead(n.id)}
                                                onDismiss={() => dismissNotification(n.id)}
                                            />
                                        ))}
                                    </div>
                                    {(notifications as NotificationData[]).length > 3 && (
                                        <button
                                            onClick={() => setShowAllNotifications(!showAllNotifications)}
                                            className="w-full mt-1 text-center text-[10px] text-neo-white/40 hover:text-neo-cyan transition-colors font-bold py-1"
                                        >
                                            {showAllNotifications
                                                ? t('common.showLess')
                                                : t('notifications.viewAll') + ` (${(notifications as NotificationData[]).length})`
                                            }
                                        </button>
                                    )}
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
