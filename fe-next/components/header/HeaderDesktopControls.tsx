import { memo } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import Avatar from '../Avatar';
import HeaderMenuDropdown from '../HeaderMenuDropdown';
import AuthButton from '../auth/AuthButton';
import { QuickLanguageSwitcher } from '../QuickLanguageSwitcher';
import { getStoredCustomAvatar } from '../../utils/profileStorage';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';

interface HeaderDesktopControlsProps {
    unclaimedCount: number;
    onOpenGiftModal: () => void;
    onSignIn: () => void;
    onSignUp: () => void;
}

const HeaderDesktopControls = memo<HeaderDesktopControlsProps>(({ unclaimedCount, onOpenGiftModal, onSignIn, onSignUp }) => {
    const { t, language } = useLanguage();
    const { isAuthenticated, profile, user, loading } = useAuth();

    const guestAvatar = !isAuthenticated ? getStoredCustomAvatar() : null;
    const avatarConfig = profile?.avatar_config ?? guestAvatar;
    const engagementStatus = useEngagementStatus();

    return (
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
            {/* User Avatar + Streak (minimal) */}
            <Link
                href={`/${language}/profile`}
                className={cn(
                    "flex items-center gap-2",
                    "hover:scale-105 active:scale-95",
                    "transition-all duration-100"
                )}
                aria-label={t('profile.viewProfile')}
            >
                <div className={cn(
                    "rounded-full border-3 border-neo-black",
                    "shadow-hard-sm"
                )}>
                    <Avatar
                        customAvatar={avatarConfig}
                        avatarImage={profile?.avatar_image}
                        userId={user?.id}
                        size="md"
                    />
                </div>
                {isAuthenticated && engagementStatus.streak > 0 && (
                    <div className="flex items-center gap-1">
                        <Flame className="w-4 h-4 text-neo-orange fill-current" />
                        <span className="text-xs font-black text-neo-orange">{engagementStatus.streak}</span>
                    </div>
                )}
            </Link>

            {/* Language switcher — always visible */}
            <QuickLanguageSwitcher compact />

            {/* Auth button for guests */}
            {!isAuthenticated && !loading && (
                <AuthButton
                    onSignInClick={onSignIn}
                    onSignUpClick={onSignUp}
                />
            )}

            {/* Unified menu — all actions live here */}
            <HeaderMenuDropdown
                unclaimedCount={unclaimedCount}
                onOpenGiftModal={onOpenGiftModal}
            />
        </div>
    );
});

HeaderDesktopControls.displayName = 'HeaderDesktopControls';

export default HeaderDesktopControls;
