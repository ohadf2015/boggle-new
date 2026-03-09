import { memo } from 'react';
import Link from 'next/link';
import { Gift } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { CoinBalance } from '../CoinBalance';
import { GiftNotificationBadge } from '../gift/GiftNotificationBadge';
import { NotificationBell } from '../notifications/NotificationBell';
import { QuickLanguageSwitcher } from '../QuickLanguageSwitcher';
import MusicControls from '../MusicControls';
import HeaderMenuDropdown from '../HeaderMenuDropdown';

interface HeaderDesktopControlsProps {
    unclaimedCount: number;
    onOpenGiftModal: () => void;
}

const HeaderDesktopControls = memo<HeaderDesktopControlsProps>(({ unclaimedCount, onOpenGiftModal }) => {
    const { t, language } = useLanguage();
    const { isAuthenticated, profile } = useAuth();

    return (
        <div className="hidden sm:flex items-center gap-3 md:gap-3 lg:gap-4 xl:gap-4 2xl:gap-5 flex-shrink-0">
            {isAuthenticated && profile && (
                <Link
                    href={`/${language}/profile`}
                    className="hover:scale-105 active:scale-95 transition-transform"
                    aria-label={t('profile.viewCoins') || `${profile.total_coins?.toLocaleString() || 0} coins - View profile`}
                >
                    <CoinBalance
                        coins={profile.total_coins || 0}
                        size="sm"
                        showAnimation={false}
                    />
                </Link>
            )}

            {isAuthenticated && unclaimedCount > 0 && (
                <button
                    onClick={onOpenGiftModal}
                    className={cn(
                        "relative flex items-center justify-center",
                        "w-10 h-10",
                        "bg-amber-400 text-neo-black",
                        "border-3 border-neo-black",
                        "rounded-neo shadow-hard-sm",
                        "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard hover:bg-amber-500",
                        "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                        "transition-all duration-100"
                    )}
                    aria-label={t('gift.youHaveGifts') || `You have ${unclaimedCount} unclaimed gift${unclaimedCount !== 1 ? 's' : ''}`}
                    title={t('gift.gifts')}
                >
                    <Gift size={20} />
                    <GiftNotificationBadge count={unclaimedCount} />
                </button>
            )}

            {isAuthenticated && <NotificationBell />}

            <QuickLanguageSwitcher compact />

            <MusicControls />

            <HeaderMenuDropdown />
        </div>
    );
});

HeaderDesktopControls.displayName = 'HeaderDesktopControls';

export default HeaderDesktopControls;
