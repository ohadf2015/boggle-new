'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { User, LogOut, Trophy, ChevronDown, Users, Settings, Calendar, Gift, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Loader } from '@/components/ui/Loader';
import { cn } from '../../lib/utils';
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

interface AuthButtonDropdownMenuProps {
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  dropdownPosition: { top: number; left: number; right: number };
  isRTL: boolean;
  isDarkMode: boolean;
  language: string;
  currentLang: LanguageItem;
  isAdmin: boolean;
  isSigningOut: boolean;
  hasUnclaimedReward: boolean;
  t: (key: string) => string;
  router: { push: (url: string) => void };
  setLanguage: (code: LanguageType) => void;
  setShowUserMenu: (show: boolean) => void;
  setShowCalendarModal: (show: boolean) => void;
  onSignOut: () => Promise<void>;
  /**
   * When true, the game is running inside the CrazyGames iframe and only
   * the multiplayer mode is allowed. Hides Profile / Leaderboard / Friends /
   * Settings / Admin links, leaving language switching and sign out.
   */
  isCrazyGames?: boolean;
}

export function AuthButtonDropdownMenu({
  dropdownRef,
  dropdownPosition,
  isRTL,
  isDarkMode,
  language,
  currentLang,
  isAdmin,
  isSigningOut,
  hasUnclaimedReward,
  t,
  router,
  setLanguage,
  setShowUserMenu,
  setShowCalendarModal,
  onSignOut,
  isCrazyGames = false,
}: AuthButtonDropdownMenuProps): React.JSX.Element {
  const [isLanguageExpanded, setIsLanguageExpanded] = useState(false);

  const menuItemClass = cn(
    'w-full justify-start gap-3',
    isDarkMode
      ? 'text-gray-300 hover:bg-neo-navy-elevated hover:text-gray-300'
      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
  );

  const dividerClass = cn('my-1 h-px', isDarkMode ? 'bg-neo-navy-elevated' : 'bg-gray-200');

  return (
    <AnimatePresence>
      <m.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onMouseDown={(e) => e.preventDefault()}
        role="menu"
        aria-label={t('auth.userMenu')}
        className={cn(
          'min-w-[180px] rounded-lg shadow-xl z-80',
          isDarkMode
            ? 'bg-neo-navy-light border border-slate-700'
            : 'bg-white border border-gray-200'
        )}
        style={{
          position: 'fixed',
          top: dropdownPosition.top,
          ...(isRTL ? { left: dropdownPosition.left } : { right: dropdownPosition.right })
        }}
      >
        {/*
          CrazyGames distribution: only the multiplayer mode is published.
          Hide every link that navigates off-mode (profile, leaderboard,
          friends, settings, daily rewards calendar, admin dashboard).
        */}
        {!isCrazyGames && (
          <>
            {/* Profile Link */}
            <Button
              role="menuitem"
              variant="ghost"
              onClick={() => { router.push(`/${language}/profile`); setShowUserMenu(false); }}
              className={cn(menuItemClass, 'rounded-t-lg')}
            >
              <User size={14} />
              <span>{t('profile.title')}</span>
            </Button>

            {/* Leaderboard Link */}
            <Button
              role="menuitem"
              variant="ghost"
              onClick={() => { router.push(`/${language}/leaderboard`); setShowUserMenu(false); }}
              className={menuItemClass}
            >
              <Trophy size={14} aria-hidden="true" />
              <span>{t('leaderboard.title')}</span>
            </Button>

            {/* Friends Link */}
            <Button
              role="menuitem"
              variant="ghost"
              onClick={() => { router.push(`/${language}/friends`); setShowUserMenu(false); }}
              className={menuItemClass}
            >
              <Users size={14} aria-hidden="true" />
              <span>{t('friends.title')}</span>
            </Button>

            <div className={dividerClass} />

            {/* Settings Link */}
            <Button
              role="menuitem"
              variant="ghost"
              onClick={() => { router.push(`/${language}/settings`); setShowUserMenu(false); }}
              className={menuItemClass}
            >
              <Settings size={14} aria-hidden="true" />
              <span>{t('settings.title')}</span>
            </Button>

            {/* Daily Rewards Calendar */}
            <Button
              role="menuitem"
              variant="ghost"
              onClick={() => setShowCalendarModal(true)}
              className={cn(menuItemClass, 'relative')}
            >
              <div className="relative">
                <Calendar size={14} aria-hidden="true" />
                {hasUnclaimedReward && (
                  <div className="absolute -top-1.5 -right-1.5 rtl:-right-auto rtl:-left-1.5 w-2.5 h-2.5 bg-neo-lime rounded-full border border-neo-black" />
                )}
              </div>
              <span>{t('calendar.title')}</span>
              {hasUnclaimedReward && (
                <Gift size={12} className="ms-auto text-neo-lime" aria-label={t('calendar.rewardAvailable')} />
              )}
            </Button>

            {/* Admin Dashboard Link */}
            {isAdmin && (
              <Button
                role="menuitem"
                variant="ghost"
                onClick={() => { router.push(`/${language}/admin`); setShowUserMenu(false); }}
                className={cn(
                  'w-full justify-start gap-3',
                  isDarkMode
                    ? 'text-neo-pink hover:bg-neo-navy-elevated hover:text-neo-pink'
                    : 'text-neo-pink hover:bg-gray-50 hover:text-neo-pink'
                )}
              >
                <Shield size={14} aria-hidden="true" />
                <span>{t('common.adminDashboard')}</span>
              </Button>
            )}

            <div className={dividerClass} />
          </>
        )}

        {/* Language Section - Collapsible */}
        <div>
          <Button
            role="menuitem"
            aria-expanded={isLanguageExpanded}
            aria-haspopup="true"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); setIsLanguageExpanded(!isLanguageExpanded); }}
            className={cn('w-full justify-between gap-3', isDarkMode
              ? 'text-gray-300 hover:bg-neo-navy-elevated hover:text-gray-300'
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
              <m.div
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
                      role="menuitem"
                      variant="ghost"
                      onClick={() => { setLanguage(lang.code); setIsLanguageExpanded(false); }}
                      className={cn(
                        'w-full justify-start gap-3 ps-8',
                        isDarkMode
                          ? 'text-gray-300 hover:bg-neo-navy-elevated hover:text-gray-300'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-700'
                      )}
                    >
                      <span className="text-lg" aria-hidden="true">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </Button>
                  ))}
              </m.div>
            )}
          </AnimatePresence>
        </div>

        <div className={dividerClass} aria-hidden="true" />

        {/* Sign Out */}
        <Button
          role="menuitem"
          variant="ghost"
          onClick={onSignOut}
          disabled={isSigningOut}
          className={cn(
            'w-full justify-start gap-3 rounded-b-lg text-red-500 hover:text-red-600',
            isDarkMode ? 'hover:bg-neo-navy-elevated' : 'hover:bg-gray-50'
          )}
        >
          {isSigningOut ? <Loader size="sm" /> : <LogOut size={14} aria-hidden="true" />}
          <span>{t('auth.signOut')}</span>
        </Button>
      </m.div>
    </AnimatePresence>
  );
}
