'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { User, LogOut, Trophy, ChevronDown, Users, Settings, Calendar, Gift, Shield } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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
  isDarkMode: boolean;
  language: string;
  currentLang: LanguageItem;
  isAdmin: boolean;
  isSigningOut: boolean;
  hasUnclaimedReward: boolean;
  t: (key: string) => string;
  router: { push: (url: string) => void };
  setLanguage: (code: LanguageType) => void;
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
  language,
  currentLang,
  isAdmin,
  isSigningOut,
  hasUnclaimedReward,
  t,
  router,
  setLanguage,
  setShowCalendarModal,
  onSignOut,
  isCrazyGames = false,
}: AuthButtonDropdownMenuProps): React.JSX.Element {
  const [isLanguageExpanded, setIsLanguageExpanded] = useState(false);

  return (
    <DropdownMenuContent align="end" aria-label={t('auth.userMenu')}>
      {/*
        CrazyGames distribution: only the multiplayer mode is published.
        Hide every link that navigates off-mode (profile, leaderboard,
        friends, settings, daily rewards calendar, admin dashboard).
      */}
      {!isCrazyGames && (
        <>
          <DropdownMenuItem onSelect={() => router.push(`/${language}/profile`)}>
            <User size={14} />
            <span>{t('profile.title')}</span>
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => router.push(`/${language}/leaderboard`)}>
            <Trophy size={14} aria-hidden="true" />
            <span>{t('leaderboard.title')}</span>
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => router.push(`/${language}/friends`)}>
            <Users size={14} aria-hidden="true" />
            <span>{t('friends.title')}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => router.push(`/${language}/settings`)}>
            <Settings size={14} aria-hidden="true" />
            <span>{t('settings.title')}</span>
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => setShowCalendarModal(true)} className="relative">
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
          </DropdownMenuItem>

          {isAdmin && (
            <DropdownMenuItem
              onSelect={() => router.push(`/${language}/admin`)}
              className="text-neo-pink hover:text-neo-pink"
            >
              <Shield size={14} aria-hidden="true" />
              <span>{t('common.adminDashboard')}</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
        </>
      )}

      {/* Language section — inline expand/collapse (not a Radix Sub) so it keeps
          its current under-the-row layout instead of a side flyout. Intentionally
          not a DropdownMenuItem: it must survive its own click without closing
          the menu, which onSelect would do. */}
      <div>
        <button
          type="button"
          role="menuitem"
          aria-expanded={isLanguageExpanded}
          aria-haspopup="true"
          onClick={(e) => { e.stopPropagation(); setIsLanguageExpanded(!isLanguageExpanded); }}
          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm cursor-pointer outline-none hover:bg-neo-navy-elevated"
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
        </button>

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
                  <DropdownMenuItem
                    key={lang.code}
                    onSelect={() => setLanguage(lang.code)}
                    className="ps-8"
                  >
                    <span className="text-lg" aria-hidden="true">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </DropdownMenuItem>
                ))}
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onSelect={onSignOut}
        disabled={isSigningOut}
        className="text-red-500 hover:text-red-600"
      >
        {isSigningOut ? <Loader size="sm" /> : <LogOut size={14} aria-hidden="true" />}
        <span>{t('auth.signOut')}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
