'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaSignOutAlt, FaTrophy, FaChevronDown, FaSun, FaMoon, FaCog } from 'react-icons/fa';
import { Button } from '../ui/button';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../lib/supabase';
import AuthModal from './AuthModal';
import Avatar from '../Avatar';
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

const AuthButton = (): React.ReactElement | null => {
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

  const currentLang = languages.find(l => l.code === language) || languages[0];

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
    return (
      <div className="relative flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUserMenu(!showUserMenu)}
          onBlur={() => setTimeout(() => { setShowUserMenu(false); setIsLanguageExpanded(false); }, 200)}
          className={cn(
            'flex items-center gap-1 sm:gap-2 rounded-full transition-all duration-300 px-2 sm:px-3',
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
          <FaChevronDown size={10} className={showUserMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
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
              className={cn(
                'absolute top-full mt-2 min-w-[180px] rounded-lg shadow-xl z-50',
                isRTL ? 'left-0' : 'right-0',
                isDarkMode
                  ? 'bg-slate-800 border border-slate-700'
                  : 'bg-white border border-gray-200'
              )}
            >
              {/* Profile Link */}
              <Button
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
                <FaUser size={14} />
                <span>{t('profile.title') || 'Profile'}</span>
              </Button>

              {/* Leaderboard Link */}
              <Button
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
                <FaTrophy size={14} />
                <span>{t('leaderboard.title') || 'Leaderboard'}</span>
              </Button>

              {/* Divider */}
              <div className={cn(
                'my-1 h-px',
                isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
              )} />

              {/* Language Section - Collapsible */}
              <div>
                <Button
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
                    <span className="text-lg">{currentLang.flag}</span>
                    <span>{currentLang.name}</span>
                  </div>
                  <FaChevronDown
                    size={10}
                    className={cn('transition-transform duration-200', isLanguageExpanded && 'rotate-180')}
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
                variant="ghost"
                onClick={toggleTheme}
                className={cn(
                  'w-full justify-start gap-3',
                  isDarkMode
                    ? 'text-gray-300 hover:bg-slate-700 hover:text-gray-300'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                {isDarkMode ? <FaSun size={14} className="text-yellow-400" /> : <FaMoon size={14} className="text-slate-600" />}
                <span>{isDarkMode ? (t('common.lightMode') || 'Light Mode') : (t('common.darkMode') || 'Dark Mode')}</span>
              </Button>

              {/* Divider */}
              <div className={cn(
                'my-1 h-px',
                isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
              )} />

              {/* Sign Out */}
              <Button
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
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FaSignOutAlt size={14} />
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
  return (
    <>
      <div className="flex items-center gap-2">
        {/* Prominent Sign In Button - Always Visible */}
        <Button
          size="sm"
          onClick={() => setShowAuthModal(true)}
          className={cn(
            'flex items-center gap-2 rounded-full font-bold transition-all duration-300',
            isDarkMode
              ? 'bg-neo-cyan text-neo-black hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] border-2 border-neo-black'
              : 'bg-neo-cyan text-neo-black hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] border-2 border-neo-black'
          )}
        >
          <FaUser size={14} />
          <span className="hidden sm:inline">{t('auth.signIn') || 'Sign In'}</span>
        </Button>

        {/* Settings Dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUserMenu(!showUserMenu)}
            onBlur={() => setTimeout(() => { setShowUserMenu(false); setIsLanguageExpanded(false); }, 200)}
            className={cn(
              'flex items-center gap-2 rounded-full transition-all duration-300',
              isDarkMode
                ? 'bg-slate-800 text-cyan-300 hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] border-slate-700'
                : 'bg-white text-cyan-600 hover:bg-gray-50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] border-gray-200'
            )}
          >
            <FaCog size={16} />
            <FaChevronDown size={10} className={showUserMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </Button>

        {/* Guest Dropdown */}
        <AnimatePresence>
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onMouseDown={(e) => e.preventDefault()}
              className={cn(
                'absolute top-full mt-2 min-w-[180px] rounded-lg shadow-xl z-50',
                isRTL ? 'left-0' : 'right-0',
                isDarkMode
                  ? 'bg-slate-800 border border-slate-700'
                  : 'bg-white border border-gray-200'
              )}
            >
              {/* Language Section - Collapsible */}
              <div>
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLanguageExpanded(!isLanguageExpanded);
                  }}
                  className={cn(
                    'w-full justify-between gap-3 rounded-t-lg',
                    isDarkMode
                      ? 'text-gray-300 hover:bg-slate-700 hover:text-gray-300'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{currentLang.flag}</span>
                    <span>{currentLang.name}</span>
                  </div>
                  <FaChevronDown
                    size={10}
                    className={cn('transition-transform duration-200', isLanguageExpanded && 'rotate-180')}
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
                variant="ghost"
                onClick={toggleTheme}
                className={cn(
                  'w-full justify-start gap-3',
                  isDarkMode
                    ? 'text-gray-300 hover:bg-slate-700 hover:text-gray-300'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                {isDarkMode ? <FaSun size={14} className="text-yellow-400" /> : <FaMoon size={14} className="text-slate-600" />}
                <span>{isDarkMode ? (t('common.lightMode') || 'Light Mode') : (t('common.darkMode') || 'Dark Mode')}</span>
              </Button>

              {/* Divider */}
              <div className={cn(
                'my-1 h-px',
                isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
              )} />

              {/* Leaderboard Link - Now the last item */}
              <Button
                variant="ghost"
                onClick={() => {
                  router.push(`/${language}/leaderboard`);
                  setShowUserMenu(false);
                }}
                className={cn(
                  'w-full justify-start gap-3 rounded-b-lg',
                  isDarkMode
                    ? 'text-gray-300 hover:bg-slate-700 hover:text-gray-300'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                <FaTrophy size={14} />
                <span>{t('leaderboard.title') || 'Leaderboard'}</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        showGuestStats={true}
      />
    </>
  );
};

export default AuthButton;
