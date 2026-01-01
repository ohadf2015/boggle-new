'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Trophy, ChevronDown, Sun, Moon, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../lib/supabase';
import AuthModal from './AuthModal';
import Avatar from '../Avatar';
import LevelBadge from '../LevelBadge';
import { cn } from '../../lib/utils';
import { useRouter } from 'next/navigation';
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
}

const AuthButton = ({ inline = false, onClose }: AuthButtonProps = {}): React.ReactElement | null => {
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage, dir } = useLanguage();
  const { isAuthenticated, profile, isSupabaseEnabled, loading } = useAuth();
  const router = useRouter();
  const isDarkMode = theme === 'dark';
  const isRTL = dir === 'rtl';

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [isLanguageExpanded, setIsLanguageExpanded] = useState<boolean>(false);

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
              avatarEmoji={profile.avatar_emoji}
              avatarColor={profile.avatar_color}
              size="sm"
            />
            <span className="text-neo-black truncate flex-1">
              {profile.display_name || profile.username}
            </span>
            {profile.current_level && (
              <LevelBadge
                level={profile.current_level}
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
      <div className="relative flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUserMenu(!showUserMenu)}
          onBlur={() => setTimeout(() => { setShowUserMenu(false); setIsLanguageExpanded(false); }, 200)}
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
          {profile.current_level && (
            <LevelBadge
              level={profile.current_level}
              size="sm"
              animate={false}
            />
          )}
          <ChevronDown size={10} className={showUserMenu ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden="true" />
        </Button>

        {/* User Dropdown */}
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
                'absolute top-full mt-2 min-w-[180px] rounded-lg shadow-xl z-[100]',
                isRTL ? 'left-0' : 'right-0',
                isDarkMode
                  ? 'bg-slate-800 border border-slate-700'
                  : 'bg-white border border-gray-200'
              )}
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
        </AnimatePresence>
      </div>
    );
  }

  // Guest user - show prominent Sign In button + settings dropdown
  // Inline variant for mobile menu
  if (inline) {
    return (
      <>
        <div className="flex flex-col gap-2 w-full">
          {/* Sign In Button */}
          <button
            onClick={() => setShowAuthModal(true)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-neo border-2 border-neo-black transition-all w-full",
              "bg-neo-cyan shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard"
            )}
          >
            <User size={14} className="text-neo-black" />
            <span className="text-neo-black">{t('auth.signIn') || 'Sign In'}</span>
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
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          showGuestStats={true}
        />
      </>
    );
  }

  // Default dropdown variant - just sign in button (settings now in Header)
  return (
    <>
      {/* Prominent Sign In Button */}
      <Button
        size="sm"
        onClick={() => setShowAuthModal(true)}
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

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        showGuestStats={true}
      />
    </>
  );
};

export default AuthButton;
