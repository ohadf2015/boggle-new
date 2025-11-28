'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaSignOutAlt, FaTrophy, FaChevronDown } from 'react-icons/fa';
import { Button } from '../ui/button';
import { useTheme } from '../../utils/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../lib/supabase';
import AuthModal from './AuthModal';
import Avatar from '../Avatar';
import { cn } from '../../lib/utils';
import { useRouter } from 'next/navigation';

const AuthButton = () => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { isAuthenticated, profile, isSupabaseEnabled, loading } = useAuth();
  const router = useRouter();
  const isDarkMode = theme === 'dark';

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setShowUserMenu(false);
    setIsSigningOut(false);
  };

  // Authenticated user - show user menu
  if (isAuthenticated && profile) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUserMenu(!showUserMenu)}
          onBlur={() => setTimeout(() => setShowUserMenu(false), 200)}
          className={cn(
            'flex items-center gap-2 rounded-full transition-all duration-300',
            isDarkMode
              ? 'bg-slate-800 text-cyan-300 hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] border-slate-700'
              : 'bg-white text-cyan-600 hover:bg-gray-50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] border-gray-200'
          )}
        >
          <Avatar
            profilePictureUrl={profile.profile_picture_url}
            avatarEmoji={profile.avatar_emoji}
            avatarColor={profile.avatar_color}
            size="sm"
          />
          <span className="max-w-[80px] truncate font-medium">
            {profile.username}
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
              className={cn(
                'absolute top-full right-0 mt-2 min-w-[180px] rounded-lg shadow-xl z-50',
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
                <span>{t('profile.title')}</span>
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
                <span>{t('leaderboard.title')}</span>
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
                <span>{t('auth.signOut')}</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Guest user - show sign in button
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowAuthModal(true)}
        className={cn(
          'flex items-center gap-2 rounded-full transition-all duration-300',
          isDarkMode
            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 border-transparent'
            : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 border-transparent'
        )}
      >
        <FaUser size={14} />
        <span>{t('auth.signIn')}</span>
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
