'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Loader } from '@/components/ui/Loader';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../lib/supabase';
import dynamic from 'next/dynamic';
const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false });
import Avatar from '../Avatar';
import LevelBadge from '../LevelBadge';
import { getLevelFromXp } from '../XpProgressBar';
import { cn } from '../../lib/utils';
import { useRouter } from 'next/navigation';
import { useCrazyGamesAuth } from '@/hooks/useCrazyGamesAuth';
import { CalendarRewardsModal } from '../engagement/CalendarRewardsModal';
import { AuthButtonDropdownMenu } from './AuthButtonDropdownMenu';
import type { Language as LanguageType } from '@/shared/types';

interface LanguageItem {
  code: LanguageType;
  name: string;
  flag: string;
}

const languages: LanguageItem[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

interface AuthButtonProps {
  inline?: boolean;
  onClose?: () => void;
  onSignInClick?: () => void;
  onSignUpClick?: () => void;
}

const AuthButton = ({ inline = false, onClose, onSignInClick, onSignUpClick }: AuthButtonProps = {}): React.ReactElement | null => {
  const { t, language, setLanguage, dir } = useLanguage();
  const { isAuthenticated, profile, isSupabaseEnabled, loading, isAdmin, user } = useAuth();
  const router = useRouter();
  const isDarkMode = true;
  const isRTL = dir === 'rtl';

  const {
    isCrazyGames,
    isReady,
    user: crazyGamesUser,
    isLoggedIn: isCrazyGamesLoggedIn,
    isLoggingIn: isCrazyGamesLoggingIn,
    login: loginWithCrazyGames,
    isAccountAvailable: isCrazyGamesAccountAvailable,
  } = useCrazyGamesAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [hasUnclaimedReward, setHasUnclaimedReward] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rewardCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; right: number } | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  // Calculate dropdown position for portal rendering
  useEffect(() => {
    const updatePosition = () => {
      if (buttonRef.current && showUserMenu) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          left: isRTL ? rect.left : undefined!,
          right: isRTL ? undefined! : window.innerWidth - rect.right,
        });
      }
    };
    if (showUserMenu) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showUserMenu, isRTL]);

  // Check for unclaimed calendar rewards
  const checkUnclaimedReward = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { fetchWithAuth } = await import('@/utils/authFetch');
      const response = await fetchWithAuth('/api/engagement/calendar');
      if (response.ok) {
        const data = await response.json();
        setHasUnclaimedReward(data.canClaimToday);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Supabase auth-lock contention is a benign retry signal, not a bug. Skip console.error
      // to keep it out of Sentry's captureConsole funnel (JAVASCRIPT-NEXTJS-147).
      if (/Lock (was stolen|.*was not released|broken)/i.test(errorMessage)) return;
      console.warn('[AuthButton] Error checking reward:', errorMessage);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    checkUnclaimedReward();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkUnclaimedReward();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (rewardCheckTimeoutRef.current) { clearTimeout(rewardCheckTimeoutRef.current); rewardCheckTimeoutRef.current = null; }
    };
  }, [user?.id, checkUnclaimedReward]);

  const handleCalendarClose = () => {
    setShowCalendarModal(false);
    setShowUserMenu(false);
    if (rewardCheckTimeoutRef.current) clearTimeout(rewardCheckTimeoutRef.current);
    rewardCheckTimeoutRef.current = setTimeout(checkUnclaimedReward, 500);
  };

  const openSignIn = () => {
    if (onSignInClick) { onSignInClick(); }
    else { setAuthModalMode('signin'); setShowAuthModal(true); }
  };

  const openSignUp = () => {
    if (onSignUpClick) { onSignUpClick(); }
    else { setAuthModalMode('signup'); setShowAuthModal(true); }
  };

  const currentLang = languages.find(l => l.code === language) ?? languages[0] ?? { code: 'en' as LanguageType, flag: '🇺🇸', name: 'English' };

  if (!isSupabaseEnabled) return null;

  // While Supabase auth or CrazyGames SDK is still resolving, show skeleton.
  // Without this guard, standard auth buttons flash for ~5s before SDK detects CrazyGames.
  if (loading || !isReady) {
    return (
      <div className={cn('w-24 h-9 rounded-full animate-pulse', isDarkMode ? 'bg-neo-navy-elevated' : 'bg-gray-200')} />
    );
  }

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);
    await signOut();
    setShowUserMenu(false);
    setIsSigningOut(false);
  };

  // Authenticated user
  if (isAuthenticated && profile) {
    // Inline variant for mobile menu
    if (inline) {
      return (
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={cn("flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black transition-all w-full", "bg-red-100 hover:bg-red-200 text-red-600", "disabled:opacity-50 disabled:cursor-not-allowed")}
          >
            {isSigningOut ? <Loader size="sm" /> : <LogOut size={14} aria-hidden="true" />}
            <span>{t('auth.signOut')}</span>
          </button>
        </div>
      );
    }

    // Default dropdown variant
    return (
      <div className="relative shrink-0" ref={dropdownRef}>
        <Button
          ref={buttonRef}
          variant="outline"
          size="sm"
          onClick={() => setShowUserMenu(!showUserMenu)}
          aria-haspopup="menu"
          aria-expanded={showUserMenu}
          aria-label={t('auth.userMenu')}
          className={cn(
            'flex items-center gap-1 sm:gap-2 rounded-full transition-all duration-300 px-2 sm:px-3 min-h-[44px]',
            isDarkMode
              ? 'bg-neo-navy-light text-cyan-300 hover:bg-neo-navy-elevated hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] border-slate-700'
              : 'bg-white text-cyan-600 hover:bg-gray-50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] border-gray-200'
          )}
        >
          <Avatar customAvatar={profile.avatar_config} avatarImage={profile.avatar_image} userId={user?.id} size="sm" />
          <span className="hidden sm:inline max-w-[80px] truncate font-medium">{profile.display_name || profile.username}</span>
          {profile.total_xp !== undefined && (
            <LevelBadge level={getLevelFromXp(profile.total_xp || 0)} size="sm" animate={false} />
          )}
          <ChevronDown size={10} className={showUserMenu ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden="true" />
        </Button>

        {showUserMenu && dropdownPosition && typeof document !== 'undefined' && createPortal(
          <AuthButtonDropdownMenu
            dropdownRef={dropdownRef}
            dropdownPosition={dropdownPosition}
            isRTL={isRTL}
            isDarkMode={isDarkMode}
            language={language}
            currentLang={currentLang}
            isAdmin={isAdmin}
            isSigningOut={isSigningOut}
            hasUnclaimedReward={hasUnclaimedReward}
            t={t}
            router={router}
            setLanguage={setLanguage}
            setShowUserMenu={setShowUserMenu}
            setShowCalendarModal={setShowCalendarModal}
            onSignOut={handleSignOut}
            isCrazyGames={isCrazyGames}
          />,
          document.body
        )}

        <CalendarRewardsModal isOpen={showCalendarModal} onClose={handleCalendarClose} />
      </div>
    );
  }

  // Guest user
  const hideLogin = isCrazyGames;

  // Inline variant for mobile menu
  if (inline) {
    return (
      <>
        <div className="flex flex-col gap-2 w-full">
          {hideLogin ? (
            <>
              {isCrazyGamesLoggedIn && crazyGamesUser ? (
                <div className={cn("flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black w-full", "bg-neo-cyan shadow-hard-sm")}>
                  {crazyGamesUser.profilePictureUrl ? (
                    <Image src={crazyGamesUser.profilePictureUrl} alt={crazyGamesUser.username} width={24} height={24} className="w-6 h-6 rounded-full object-cover" unoptimized />
                  ) : (
                    <User size={14} className="text-neo-black" />
                  )}
                  <span className="text-neo-black truncate flex-1">{crazyGamesUser.username}</span>
                </div>
              ) : isCrazyGamesAccountAvailable ? (
                <button
                  onClick={loginWithCrazyGames}
                  disabled={isCrazyGamesLoggingIn}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black transition-all w-full",
                    "bg-neo-cyan shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard",
                    isCrazyGamesLoggingIn && "opacity-70 cursor-wait"
                  )}
                >
                  {isCrazyGamesLoggingIn ? <Loader size="sm" /> : <User size={14} className="text-neo-black" />}
                  <span className="text-neo-black">{t('auth.loginCrazyGames')}</span>
                </button>
              ) : null}
            </>
          ) : (
            <>
              <button
                onClick={openSignIn}
                className={cn("flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black transition-all w-full", "bg-neo-cyan shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard")}
              >
                <User size={14} className="text-neo-black" aria-hidden="true" />
                <span className="text-neo-black">{t('auth.signIn')}</span>
              </button>
              <button
                onClick={openSignUp}
                className={cn("flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black transition-all w-full", "bg-neo-pink text-white shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard")}
              >
                <User size={14} aria-hidden="true" />
                <span>{t('auth.signUp')}</span>
              </button>
            </>
          )}
        </div>
        {!hideLogin && (
          <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} showGuestStats={true} initialMode={authModalMode} />
        )}
      </>
    );
  }

  // Default dropdown variant - guest
  if (hideLogin) {
    if (isCrazyGamesLoggedIn && crazyGamesUser) {
      return (
        <div className="flex items-center gap-1 sm:gap-2 rounded-full px-2 sm:px-3 min-h-[44px] bg-neo-navy-light text-cyan-300 border border-slate-700">
          {crazyGamesUser.profilePictureUrl ? (
            <Image src={crazyGamesUser.profilePictureUrl} alt={crazyGamesUser.username} width={24} height={24} className="w-6 h-6 rounded-full object-cover" unoptimized />
          ) : (
            <User size={16} />
          )}
          <span className="hidden sm:inline max-w-[80px] truncate font-medium">{crazyGamesUser.username}</span>
        </div>
      );
    }

    if (isCrazyGamesAccountAvailable) {
      return (
        <Button
          size="sm"
          onClick={loginWithCrazyGames}
          disabled={isCrazyGamesLoggingIn}
          className={cn(
            'flex items-center gap-2 rounded-full font-bold transition-all duration-300 min-h-[44px]',
            'bg-neo-cyan text-neo-black hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] border-2 border-neo-black'
          )}
        >
          {isCrazyGamesLoggingIn ? <Loader size="sm" /> : <User size={14} />}
          <span className="hidden sm:inline">{t('auth.loginCrazyGames')}</span>
        </Button>
      );
    }

    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={openSignIn}
          className={cn(
            'flex items-center gap-2 rounded-full font-bold transition-all duration-300 min-h-[44px]',
            'bg-neo-cyan text-neo-black hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] border-2 border-neo-black'
          )}
        >
          <User size={14} />
          <span className="hidden min-[820px]:inline">{t('auth.signIn')}</span>
        </Button>
        <Button
          size="sm"
          onClick={openSignUp}
          className={cn(
            'flex items-center gap-2 rounded-full font-bold transition-all duration-300 min-h-[44px]',
            'bg-neo-pink text-white hover:bg-purple-500 hover:shadow-[0_0_15px_rgba(147,51,234,0.5)] border-2 border-neo-black'
          )}
        >
          <span className="hidden min-[820px]:inline">{t('auth.signUp')}</span>
          <span className="min-[820px]:hidden">+</span>
        </Button>
      </div>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} showGuestStats={true} initialMode={authModalMode} />
    </>
  );
};

export default AuthButton;
