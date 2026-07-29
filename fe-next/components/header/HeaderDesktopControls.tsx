import { memo } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import AuthButton from '../auth/AuthButton';
import { QuickLanguageSwitcher } from '../QuickLanguageSwitcher';
import MusicControls from '../MusicControls';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

interface HeaderDesktopControlsProps {
    unclaimedCount: number;
    onOpenGiftModal: () => void;
    onSignIn: () => void;
    onSignUp: () => void;
}

// Desktop inline strip — streak / music / lang / auth.
// The unified menu trigger now lives in HeaderMobileMenu (visible at all
// breakpoints), so this component no longer renders a dropdown.
// `unclaimedCount` + `onOpenGiftModal` props are retained for API parity
// with HeaderMobileMenu — gift surfacing happens inside the side drawer.
const HeaderDesktopControls = memo<HeaderDesktopControlsProps>(({ onSignIn, onSignUp }) => {
    const { t, language } = useLanguage();
    const { isAuthenticated, loading } = useAuth();
    const { isOnCrazyGamesPlatform, isLoading: cgLoading } = useCrazyGames();
    const engagementStatus = useEngagementStatus();

    return (
        <div className="hidden sm:flex items-center gap-3 shrink-0">
            {/* Streak indicator */}
            {isAuthenticated && engagementStatus.streak > 0 && (
                <Link
                    href={`/${language}/profile`}
                    className="flex items-center gap-1 hover:scale-105 active:scale-95 transition-all duration-100"
                    aria-label={t('profile.viewProfile')}
                >
                    <Flame className="w-4 h-4 text-neo-orange fill-current" />
                    <span className="text-xs font-black text-neo-orange">{engagementStatus.streak}</span>
                </Link>
            )}

            {/* Sound controls */}
            <MusicControls />

            {/* Language switcher — always visible */}
            <QuickLanguageSwitcher compact />

            {/* Unified auth button for guests.
                Also gated on `cgLoading`: while the CrazyGames SDK is still
                resolving its environment, hold the slot to avoid a flash of
                external Sign In/Sign Up before we know we're embedded. */}
            {!isAuthenticated && !loading && !cgLoading && !isOnCrazyGamesPlatform && (
                <AuthButton
                    onSignInClick={onSignIn}
                    onSignUpClick={onSignUp}
                />
            )}
        </div>
    );
});

HeaderDesktopControls.displayName = 'HeaderDesktopControls';

export default HeaderDesktopControls;
