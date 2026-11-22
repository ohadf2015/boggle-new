import { useCallback, useState } from 'react';
import { Bell, BellOff, Check, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { NotificationItem } from '../../notifications/NotificationItem';
import type { NotificationData } from '../../notifications/types';
import { notificationListScrollClass } from '@/lib/header/notificationScroll';
import { DrawerSection } from './DrawerPrimitives';

interface DrawerNotificationsProps {
    notifications: NotificationData[];
    unreadCount: number;
    previous: NotificationData[];
    isLoadingPrevious: boolean;
    fetchPrevious: () => Promise<unknown>;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    dismiss: (id: string) => void;
    closeMenu: () => void;
}

const PREVIEW_COUNT = 3;

export function DrawerNotifications({
    notifications, unreadCount, previous, isLoadingPrevious, fetchPrevious,
    markAsRead, markAllAsRead, dismiss, closeMenu,
}: DrawerNotificationsProps) {
    const { t, language } = useLanguage();
    const [showAll, setShowAll] = useState(false);
    const [showPrevious, setShowPrevious] = useState(false);
    const [fetchedPrevious, setFetchedPrevious] = useState(false);

    const togglePrevious = useCallback(async () => {
        const next = !showPrevious;
        setShowPrevious(next);
        if (next && !fetchedPrevious) {
            setFetchedPrevious(true);
            await fetchPrevious();
        }
    }, [showPrevious, fetchedPrevious, fetchPrevious]);

    const open = useCallback((n: NotificationData) => {
        if (n.notification_type === 'gift') {
            closeMenu();
            window.dispatchEvent(new CustomEvent('openGiftModal', { detail: { giftId: n.related_entity_id } }));
        } else if (n.action_url) {
            closeMenu();
            window.location.href = n.action_url.startsWith('/') ? `/${language}${n.action_url}` : n.action_url;
        }
    }, [closeMenu, language]);

    const visible = showAll ? notifications : notifications.slice(0, PREVIEW_COUNT);

    return (
        <DrawerSection
            label={
                <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5 text-neo-lime" aria-hidden="true" />
                        {t('notifications.title')}
                        {unreadCount > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full border border-neo-black bg-neo-lime px-1 text-[9px] font-black text-neo-black">
                                {unreadCount}
                            </span>
                        )}
                    </span>
                    {unreadCount > 0 && (
                        <button
                            onClick={() => markAllAsRead()}
                            className="flex items-center gap-1 normal-case tracking-normal text-[11px] font-bold text-neo-cyan hover:text-neo-lime transition-colors"
                        >
                            <Check size={11} aria-hidden="true" />
                            {t('notifications.markAllRead')}
                        </button>
                    )}
                </span>
            }
        >
            {notifications.length > 0 ? (
                <div className={cn(
                    'rounded-neo border-2 border-neo-white/15 bg-neo-white/[0.04]',
                    notificationListScrollClass(visible.length, 'max-h-72'),
                )}>
                    {visible.map((n) => (
                        <NotificationItem
                            key={n.id}
                            notification={n}
                            onClick={() => open(n)}
                            onMarkAsRead={() => markAsRead(n.id)}
                            onDismiss={() => dismiss(n.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center gap-2 rounded-neo border-2 border-dashed border-neo-white/15 px-3 py-3 text-center">
                    <BellOff className="h-4 w-4 text-neo-white/50" aria-hidden="true" />
                    <span className="text-xs font-bold text-neo-white/70">{t('notifications.empty')}</span>
                </div>
            )}

            <div className="flex items-center justify-between gap-2 px-1">
                {notifications.length > PREVIEW_COUNT ? (
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-[11px] font-bold text-neo-white/80 hover:text-neo-white transition-colors"
                    >
                        {showAll ? t('common.showLess') : `${t('notifications.viewAll')} (${notifications.length})`}
                    </button>
                ) : <span />}
                <button
                    onClick={togglePrevious}
                    aria-expanded={showPrevious}
                    className="flex items-center gap-1 text-[11px] font-bold text-neo-white/80 hover:text-neo-white transition-colors"
                >
                    {showPrevious ? t('notifications.hidePrevious') : t('notifications.showPrevious')}
                    <ChevronDown
                        className={cn('h-3 w-3 transition-transform duration-200', showPrevious && 'rotate-180')}
                        aria-hidden="true"
                    />
                </button>
            </div>

            {showPrevious && (
                <div className={cn(
                    'rounded-neo border-2 border-neo-white/15 bg-neo-white/[0.04]',
                    previous.length > 0 && notificationListScrollClass(previous.length, 'max-h-64'),
                )}>
                    {isLoadingPrevious ? (
                        <div className="py-3 text-center text-[11px] font-bold text-neo-white/60">…</div>
                    ) : previous.length === 0 ? (
                        <div className="py-3 text-center text-[11px] font-bold text-neo-white/70">{t('notifications.noPrevious')}</div>
                    ) : (
                        previous.map((n) => (
                            <NotificationItem
                                key={`prev-${n.id}`}
                                notification={n}
                                onClick={() => { if (n.action_url) open(n); }}
                                onMarkAsRead={() => markAsRead(n.id)}
                                onDismiss={() => dismiss(n.id)}
                            />
                        ))
                    )}
                </div>
            )}
        </DrawerSection>
    );
}
