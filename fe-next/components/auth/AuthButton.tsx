'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Trophy, ChevronDown, Sun, Moon, Users, Settings, Calendar, Gift, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../lib/supabase';
import AuthModal from './AuthModal';
import Avatar from '../Avatar';
import LevelBadge from '../LevelBadge';
import { getLevelFromXp } from '../XpProgressBar';
import { cn } from '../../lib/utils';
import { useRouter } from 'next/navigation';
import { useCrazyGamesAuth } from '@/hooks/useCrazyGamesAuth';
import { CalendarRewardsModal } from '../engagement/CalendarRewardsModal';
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
  { code: 'ja', name: '日本語', flag: '🇯🇵' }
];

interface AuthButtonProps {
  /** When true, renders items inline without dropdown (for mobile menu) */
  inline?: boolean;
  /** Callback when an action closes the menu */
  onClose?: () => void;
  /** External handler for opening sign in modal */
  onSignInClick?: () => void;
  /** External handler for opening sign up modal */
  onSignUpClick?: () => void;
}

const AuthButton = ({ inline = false, onClose, onSignInClick, onSignUpClick }: AuthButtonProps = {}): React.ReactElement | null => {
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage, dir } = useLanguage();
  const { isAuthenticated, profile, isSupabaseEnabled, loading, isAdmin, user } = useAuth();
  const router = useRouter();
  const isDarkMode = theme === 'dark';
  const isRTL = dir === 'rtl';

  // CrazyGames authentication
  const {
    isCrazyGames,
    user: crazyGamesUser,
    isLoggedIn: isCrazyGamesLoggedIn,
    isLoggingIn: isCrazyGamesLoggingIn,
    login: loginWithCrazyGames,
    isAccountAvailable: isCrazyGamesAccountAvailable,
  } = useCrazyGamesAuth();

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [isLanguageExpanded, setIsLanguageExpanded] = useState<boolean>(false);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [hasUnclaimedReward, setHasUnclaimedReward] = useState<boolean>(false);

  // Refs for click-outside detection and position tracking
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // State for dropdown position (for portal rendering)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; right: number } | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
        setIsLanguageExpanded(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Calculate dropdown position for portal rendering
  useEffect(() => {
    const updatePosition = () => {
      if (buttonRef.current && showUserMenu) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8, // 8px = mt-2
          left: isRTL ? window.innerWidth - rect.right : undefined!,
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
      const response = await fetch('/api/engagement/calendar');
      if (response.ok) {
        const data = await response.json();
        setHasUnclaimedReward(data.canClaimToday);
      }
    } catch (error) {
      console.error('[AuthButton] Error checking reward:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    checkUnclaimedReward();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUnclaimedReward();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id, checkUnclaimedReward]);

  const handleCalendarClose = () => {
    setShowCalendarModal(false);
    setShowUserMenu(false);
    setTimeout(checkUnclaimedReward, 500);
  };

  const openSignIn = () => {
    if (onSignInClick) {
      onSignInClick();
    } else {
      setAuthModalMode('signin');
      setShowAuthModal(true);
    }
  };

  const openSignUp = () => {
    if (onSignUpClick) {
      onSignUpClick();
    } else {
      setAuthModalMode('signup');
      setShowAuthModal(true);
    }
  };

  const currentLang = languages.find(l => l.code === language) ?? languages[0] ?? { code: 'en', flag: '🇺🇸', name: 'English' };

  // Don't render if Supabase is not configured
  if (!isSupabaseEnabled) return null;

  // Show loading skeleton
  if (loading) {
    return (
      <div className={cn(
        'w-24 h-9 rounded-full animate-pulse',
        isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
      )} />
    );
  }

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);
    await signOut();
    setShowUserMenu(false);
    setIsSigningOut(false);
  };

  // Authenticated user - show user menu
  if (isAuthenticated && profile) {
    // Inline variant for mobile menu - renders items directly without dropdown
    if (inline) {
      return (
        <div className="flex flex-col gap-2 w-full">
          {/* Profile Header with Avatar and Level - links to profile page */}
          <button
            onClick={() => {
              router.push(`/${language}/profile`);
              onClose?.();
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black transition-all w-full",
              "bg-neo-cyan shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard"
            )}
          >
            <Avatar
              profilePictureUrl={profile.profile_picture_url ?? undefined}
              avatarImage={profile.avatar_image}
              avatarEmoji={profile.avatar_emoji}
              avatarColor={profile.avatar_color}
              size="sm"
            />
            <span className="text-neo-black truncate flex-1">
              {profile.display_name || profile.username}
            </span>
            {profile.total_xp !== undefined && (
              <LevelBadge
                level={getLevelFromXp(profile.total_xp || 0)}
                size="sm"
                animate={false}
              />
            )}
          </button>

          {/* Friends Link */}
          <button
            onClick={() => {
              router.push(`/${language}/friends`);
              onClose?.();
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black transition-all w-full",
              "bg-white hover:bg-neo-cyan/50"
            )}
          >
            <Users size={14} className="text-neo-black" />
            <span className="text-neo-black">{t('friends.title') || 'Friends'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black transition-all w-full",
              "bg-white hover:bg-neo-cyan/50"
            )}
          >
            {isDarkMode ? <Sun size={14} className="text-yellow-500" /> : <Moon size={14} className="text-slate-600" />}
            <span className="text-neo-black">{isDarkMode ? (t('common.lightMode') || 'Light Mode') : (t('common.darkMode') || 'Dark Mode')}</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black transition-all w-full",
              "bg-red-100 hover:bg-red-200 text-red-600"
            )}
          >
            {isSigningOut ? (
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogOut size={14} />
            )}
            <span>{t('auth.signOut') || 'Sign Out'}</span>
          </button>
        </div>
      );
    }

    // Default dropdown variant
    return (
      <div className="relative flex-shrink-0" ref={dropdownRef}>
        <Button
          ref={buttonRef}
          variant="outline"
          size="sm"
          onClick={() => setShowUserMenu(!showUserMenu)}
          aria-haspopup="menu"
          aria-expanded={showUserMenu}
          aria-label={t('auth.userMenu') || 'User menu'}
          className={cn(
            'flex items-center gap-1 sm:gap-2 rounded-full transition-all duration-300 px-2 sm:px-3 min-h-[44px]',
            isDarkMode
              ? 'bg-slate-800 text-cyan-300 hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] border-slate-700'
              : 'bg-white text-cyan-600 hover:bg-gray-50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] border-gray-200'
          )}
        >
          <Avatar
            profilePictureUrl={profile.profile_picture_url ?? undefined}
            avatarEmoji={profile.avatar_emoji}
            avatarColor={profile.avatar_color}
            size="sm"
          />
          <span className="hidden sm:inline max-w-[80px] truncate font-medium">
            {profile.display_name || profile.username}
          </span>
          {profile.total_xp !== undefined && (
            <LevelBadge
              level={getLevelFromXp(profile.total_xp || 0)}
              size="sm"
              animate={false}
            />
          )}
          <ChevronDown size={10} className={showUserMenu ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden="true" />
        </Button>

        {/* User Dropdown - Portal for proper z-index layering */}
        {showUserMenu && dropdownPosition && typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onMouseDown={(e) => e.preventDefault()}
                role="menu"
                aria-label={t('auth.userMenu') || 'User menu'}
                className={cn(
                  'min-w-[180px] rounded-lg shadow-xl z-[10000]',
                  isDarkMode
                    ? 'bg-slate-800 border border-slate-700'
                    : 'bg-white border border-gray-200'
                )}
                style={{
                  position: 'fixed',
                  top: dropdownPosition.top,
                  ...(isRTL ? { left: dropdownPosition.left } : { right: dropdownPosition.right })
                }}
              >
              {/* Profile Link */}
              <Button
                role="menuitem"
                variant="ghost"
                onClick={() => {
                  router.push(`/${language}/profile`);
                  setShowUserMenu(false);
                }}
                className={cn(
                  'w-full justify-start gap-3 rounded-t-lg',
                  isDarkMode
                    ? 'text-gray-300 hover:bg-slate-700 hover:text-gray-300'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                <User size={14} />
                <span>{t('profile.title') || 'Profile'}</span>
              </Button>

              {/* Leaderboard Link */}
              <Button
                role="menuitem"
                variant="ghost"
                onClick={() => {
                  router.push(`/${language}/leaderboard`);
                  setShowUserMenu(false);
                }}
                className={cn(
                  'w-full justify-start gap-3',
                  isDarkMode
                    ? 'text-gray-300 hover:bg-slate-700 hover:text-gray-300'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                <Trophy size={14} aria-hidden="true" />
                <span>{t('leaderboard.title') || 'Leaderboard'}</span>
              </Button>

              {/* Friends Link */}
              <Button
                role="menuitem"
                variant="ghost"
                onClick={() => {
                  router.push(`/${language}/friends`);
                  setShowUserMenu(false);
                }}
                className={cn(
                  'w-full justify-start gap-3',
                  isDarkMode
                    ? 'text-gray-300 hover:bg-slate-700 hover:text-gray-300'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                <Users size={14} aria-hidden="true" />
                <span>{t('friends.title') || 'Friends'}</span>
              </Button>

              {/* Divider */}
              <div className={cn(
                'my-1 h-px',
                isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
              )} />

              {/* Settings Link */}
              <Button
                role="menuitem"
                variant="ghost"
                onClick={() => {
                  router.push(`/${language}/settings`);
                  setShowUserMenu(false);
                }}
                className={cn(
                  'w-full justify-start gap-3',
                  isDarkMode
                    ? 'text-gray-300 hover:bg-slate-700 hover:text-gray-300'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                <Settings size={14} aria-hidden="true" />
                <span>{t('settings.title') || 'Settings'}</span>
              </Button>

              {/* Daily Rewards Calendar */}
              <Button
                role="menuitem"
                variant="ghost"
                onClick={() => {
                  setShowCalendarModal(true);
                }}
                className={cn(
                  'w-full justify-start gap-3 relative',
                  isDarkMode
                    ? 'text-gray-300 hover:bg-slate-700 hover:text-gray-300'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                <div className="relative">
                  <Calendar size={14} aria-hidden="true" />
                  {hasUnclaimedReward && (
                    <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-neo-yellow rounded-full border border-neo-black" />
                  )}
                </div>
                <span>{t('calendar.title') || 'Daily Rewards'}</span>
                {hasUnclaimedReward && (
                  <Gift size={12} className="ms-auto text-neo-yellow" aria-label={t('calendar.rewardAvailable') || 'Reward available'} />
                )}
              </Button>

              {/* Admin Dashboard Link - only shown for admin users */}
              {isAdmin && (
                <Button
                  role="menuitem"
                  variant="ghost"
                  onClick={() => {
                    router.push(`/${language}/admin`);
                    setShowUserMenu(false);
                  }}
                  className={cn(
                    'w-full justify-start gap-3',
                    isDarkMode
                      ? 'text-neo-pink hover:bg-slate-700 hover:text-neo-pink'
                      : 'text-neo-pink hover:bg-gray-50 hover:text-neo-pink'
                  )}
                >
                  <Shield size={14} aria-hidden="true" />
                  <span>{t('common.adminDashboard') || 'Admin'}</span>
                </Button>
              )}

              {/* Divider */}
              <div className={cn(
                'my-1 h-px',
                isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
              )} />

              {/* Language Section - Collapsible */}
              <div>
                <Button
                  role="menuitem"
                  aria-expanded={isLanguageExpanded}
                  aria-haspopup="true"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLanguageExpanded(!isLanguageExpanded);
                  }}
                  className={cn(
                    'w-full justify-between gap-3',
                    isDarkMode
                      ? 'text-gray-300 hover:bg-slate-700 hover:text-gray-300'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg" aria-hidden="true">{currentLang.flag}</span>
                    <span>{currentLang.name}</span>
                  </div>
                  <ChevronDown
                    size={10}
                    className={cn('transition-transform duration-200', isLanguageExpanded && 'rotate-180')}
                    aria-hidden="true"
                  />
                </Button>

                <AnimatePresence>
                  {isLanguageExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {languages
                        .filter(lang => lang.code !== language)
                        .map((lang) => (
                          <Button
                            key={lang.code}
                            variant="ghost"
                            onClick={() => {
                              setLanguage(lang.code);
                              setIsLanguageExpanded(false);
                            }}
                            className={cn(
                              'w-full justify-start gap-3 ps-8',
                              isDarkMode
                                ? 'text-gray-300 hover:bg-slate-700 hover:text-gray-300'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                            )}
                          >
                            <span className="text-lg">{lang.flag}</span>
                            <span>{lang.name}</span>
                          </Button>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Divider between Language and Theme */}
              <div className={cn(
                'my-1 h-px',
                isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
              )} />

              {/* Theme Toggle */}
              <Button
                role="menuitem"
                variant="ghost"
                onClick={toggleTheme}
                className={cn(
                  'w-full justify-start gap-3',
                  isDarkMode
                    ? 'text-gray-300 hover:bg-slate-700 hover:text-gray-300'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                {isDarkMode ? <Sun size={14} className="text-yellow-400" aria-hidden="true" /> : <Moon size={14} className="text-slate-600" aria-hidden="true" />}
                <span>{isDarkMode ? (t('common.lightMode') || 'Light Mode') : (t('common.darkMode') || 'Dark Mode')}</span>
              </Button>

              {/* Divider */}
              <div className={cn(
                'my-1 h-px',
                isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
              )} aria-hidden="true" />

              {/* Sign Out */}
              <Button
                role="menuitem"
                variant="ghost"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className={cn(
                  'w-full justify-start gap-3 rounded-b-lg text-red-500 hover:text-red-600',
                  isDarkMode
                    ? 'hover:bg-slate-700'
                    : 'hover:bg-gray-50'
                )}
              >
                {isSigningOut ? (
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" aria-label={t('common.loading') || 'Loading'} />
                ) : (
                  <LogOut size={14} aria-hidden="true" />
                )}
                <span>{t('auth.signOut') || 'Sign Out'}</span>
              </Button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Calendar Rewards Modal */}
        <CalendarRewardsModal isOpen={showCalendarModal} onClose={handleCalendarClose} />
      </div>
    );
  }

  // Guest user - show Sign In and Sign Up buttons
  // Hide external login options when on CrazyGames platform (runtime detection)
  const hideLogin = isCrazyGames;

  // Inline variant for mobile menu
  if (inline) {
    return (
      <>
        <div className="flex flex-col gap-2 w-full">
          {/* CrazyGames: Show logged in user or login button */}
          {hideLogin ? (
            <>
              {/* CrazyGames user logged in */}
              {isCrazyGamesLoggedIn && crazyGamesUser ? (
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black w-full",
                  "bg-neo-cyan shadow-hard-sm"
                )}>
                  {crazyGamesUser.profilePictureUrl ? (
                    <Image
                      src={crazyGamesUser.profilePictureUrl}
                      alt={crazyGamesUser.username}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <User size={14} className="text-neo-black" />
                  )}
                  <span className="text-neo-black truncate flex-1">{crazyGamesUser.username}</span>
                </div>
              ) : isCrazyGamesAccountAvailable ? (
                /* CrazyGames login button */
                <button
                  onClick={loginWithCrazyGames}
                  disabled={isCrazyGamesLoggingIn}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black transition-all w-full",
                    "bg-neo-cyan shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard",
                    isCrazyGamesLoggingIn && "opacity-70 cursor-wait"
                  )}
                >
                  {isCrazyGamesLoggingIn ? (
                    <div className="w-4 h-4 border-2 border-neo-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <User size={14} className="text-neo-black" />
                  )}
                  <span className="text-neo-black">{t('auth.loginCrazyGames') || 'Login with CrazyGames'}</span>
                </button>
              ) : null}
            </>
          ) : (
            /* Normal Sign In/Up Buttons */
            <>
              <button
                onClick={openSignIn}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black transition-all w-full",
                  "bg-neo-cyan shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard"
                )}
              >
                <User size={14} className="text-neo-black" />
                <span className="text-neo-black">{t('auth.signIn') || 'Sign In'}</span>
              </button>

              <button
                onClick={openSignUp}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black transition-all w-full",
                  "bg-neo-pink text-white shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard"
                )}
              >
                <User size={14} />
                <span>{t('auth.signUp') || 'Sign Up'}</span>
              </button>
            </>
          )}

          {/* Theme Toggle - Always shown */}
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black transition-all w-full",
              "bg-white hover:bg-neo-cyan/50"
            )}
          >
            {isDarkMode ? <Sun size={14} className="text-yellow-500" /> : <Moon size={14} className="text-slate-600" />}
            <span className="text-neo-black">{isDarkMode ? (t('common.lightMode') || 'Light Mode') : (t('common.darkMode') || 'Dark Mode')}</span>
          </button>
        </div>

        {/* Auth Modal - Hidden on CrazyGames */}
        {!hideLogin && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            showGuestStats={true}
            initialMode={authModalMode}
          />
        )}
      </>
    );
  }

  // Default dropdown variant - Sign In and Sign Up buttons
  // On CrazyGames platform, show CrazyGames login instead
  if (hideLogin) {
    // CrazyGames user is logged in - show their info
    if (isCrazyGamesLoggedIn && crazyGamesUser) {
      return (
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-haspopup="menu"
            aria-expanded={showUserMenu}
            aria-label={t('auth.userMenu') || 'User menu'}
            className={cn(
              'flex items-center gap-1 sm:gap-2 rounded-full transition-all duration-300 px-2 sm:px-3 min-h-[44px]',
              isDarkMode
                ? 'bg-slate-800 text-cyan-300 hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] border-slate-700'
                : 'bg-white text-cyan-600 hover:bg-gray-50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] border-gray-200'
            )}
          >
            {/* CrazyGames Profile Picture */}
            {crazyGamesUser.profilePictureUrl ? (
              <Image
                src={crazyGamesUser.profilePictureUrl}
                alt={crazyGamesUser.username}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <User size={16} />
            )}
            <span className="hidden sm:inline max-w-[80px] truncate font-medium">
              {crazyGamesUser.username}
            </span>
            <ChevronDown size={10} className={showUserMenu ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden="true" />
          </Button>

          {/* CrazyGames User Dropdown - just theme toggle */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onMouseDown={(e) => e.preventDefault()}
                role="menu"
                aria-label={t('auth.userMenu') || 'User menu'}
                className={cn(
                  'absolute top-full mt-2 min-w-[180px] rounded-lg shadow-xl z-[10000]',
                  isRTL ? 'left-0' : 'right-0',
                  isDarkMode
                    ? 'bg-slate-800 border border-slate-700'
                    : 'bg-white border border-gray-200'
                )}
                style={{ 
                  position: 'absolute',
                  ...(isRTL ? { left: 0 } : { right: 0 })
                }}
              >
                {/* Theme Toggle */}
                <Button
                  role="menuitem"
                  variant="ghost"
                  onClick={toggleTheme}
                  className={cn(
                    'w-full justify-start gap-3 rounded-lg',
                    isDarkMode
                      ? 'text-gray-300 hover:bg-slate-700 hover:text-gray-300'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                  )}
                >
                  {isDarkMode ? <Sun size={14} className="text-yellow-400" aria-hidden="true" /> : <Moon size={14} className="text-slate-600" aria-hidden="true" />}
                  <span>{isDarkMode ? (t('common.lightMode') || 'Light Mode') : (t('common.darkMode') || 'Dark Mode')}</span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    // CrazyGames platform, not logged in - show CrazyGames login button
    if (isCrazyGamesAccountAvailable) {
      return (
        <Button
          size="sm"
          onClick={loginWithCrazyGames}
          disabled={isCrazyGamesLoggingIn}
          className={cn(
            'flex items-center gap-2 rounded-full font-bold transition-all duration-300 min-h-[44px]',
            isDarkMode
              ? 'bg-neo-cyan text-neo-black hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] border-2 border-neo-black'
              : 'bg-neo-cyan text-neo-black hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] border-2 border-neo-black'
          )}
        >
          {isCrazyGamesLoggingIn ? (
            <div className="w-4 h-4 border-2 border-neo-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <User size={14} />
          )}
          <span className="hidden sm:inline">{t('auth.loginCrazyGames') || 'Login'}</span>
        </Button>
      );
    }

    // CrazyGames platform, accounts not available - just show theme toggle
    return (
      <Button
        size="sm"
        onClick={toggleTheme}
        className={cn(
          'flex items-center gap-2 rounded-full font-bold transition-all duration-300 min-h-[44px]',
          isDarkMode
            ? 'bg-slate-800 text-gray-300 hover:bg-slate-700 border-2 border-slate-700'
            : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'
        )}
      >
        {isDarkMode ? <Sun size={14} className="text-yellow-400" /> : <Moon size={14} className="text-slate-600" />}
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Sign In Button */}
        <Button
          size="sm"
          onClick={openSignIn}
          className={cn(
            'flex items-center gap-2 rounded-full font-bold transition-all duration-300 min-h-[44px]',
            isDarkMode
              ? 'bg-neo-cyan text-neo-black hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] border-2 border-neo-black'
              : 'bg-neo-cyan text-neo-black hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] border-2 border-neo-black'
          )}
        >
          <User size={14} />
          <span className="hidden sm:inline">{t('auth.signIn') || 'Sign In'}</span>
        </Button>

        {/* Sign Up Button */}
        <Button
          size="sm"
          onClick={openSignUp}
          className={cn(
            'flex items-center gap-2 rounded-full font-bold transition-all duration-300 min-h-[44px]',
            isDarkMode
              ? 'bg-neo-pink text-white hover:bg-purple-500 hover:shadow-[0_0_15px_rgba(147,51,234,0.5)] border-2 border-neo-black'
              : 'bg-neo-pink text-white hover:bg-purple-500 hover:shadow-[0_0_15px_rgba(147,51,234,0.4)] border-2 border-neo-black'
          )}
        >
          <span className="hidden sm:inline">{t('auth.signUp') || 'Sign Up'}</span>
          <span className="sm:hidden">+</span>
        </Button>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        showGuestStats={true}
        initialMode={authModalMode}
      />
    </>
  );
};

export default AuthButton;
