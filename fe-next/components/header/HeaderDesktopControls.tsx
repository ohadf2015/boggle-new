import { memo } from 'react';
import Link from 'next/link';
import { Flame, GraduationCap } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import AuthButton from '../auth/AuthButton';
import { QuickLanguageSwitcher } from '../QuickLanguageSwitcher';
import MusicControls from '../MusicControls';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { teacherMenuEntry } from '@/lib/education/teacherRole';

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
    const { isAuthenticated, loading, profile } = useAuth();
    const teacherEntry = teacherMenuEntry(profile);
    const { isOnCrazyGamesPlatform, isLoading: cgLoading } = useCrazyGames();
    const engagementStatus = useEngagementStatus();

    return (
        <div className="hidden sm:flex items-center gap-3 shrink-0">
            {/* Persistent For Teachers — acquisition entry on every header, not
                buried in the drawer. Teachers land on their dashboard; everyone
                else on the public education page. Hidden on CrazyGames. */}
            {!cgLoading && !isOnCrazyGamesPlatform && (
                <Link
                    href={`/${language}${teacherEntry.href}`}
                    data-testid="header-for-teachers"
                    className="inline-flex items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-lime px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-neo-navy shadow-hard-sm hover:-translate-y-px hover:shadow-hard transition-all"
                >
                    <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                    {t(teacherEntry.labelKey)}
                </Link>
            )}

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
