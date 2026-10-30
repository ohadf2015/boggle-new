'use client';

import React from 'react';
import { Trophy, Globe } from 'lucide-react';
import { LANGUAGE_CONFIG } from '@/lib/languageConfig';
import { getCountryFlag } from '@/shared/utils';
import type { Language } from '@/types';
import type { LanguageScope, LeaderboardScope, LeaderboardTab, T } from './leaderboardTypes';
import type { TodayBoard } from '@/hooks/useDailyBoards';

const Dot = () => <span className="mx-1.5" aria-hidden>•</span>;

interface LeaderboardHeaderProps {
  t: T;
  scope: LeaderboardScope;
  activeTab: LeaderboardTab;
  language: Language;
  languageScope: LanguageScope;
  onToggleLanguageScope: () => void;
  /** Hide counts while loading or after an error — never a misleading "0 players". */
  settled: boolean;
  totalCount: number;
  today: TodayBoard | null;
}

export default function LeaderboardHeader({
  t, scope, activeTab, language, languageScope, onToggleLanguageScope, settled, totalCount, today,
}: LeaderboardHeaderProps) {
  const showLanguageToggle = activeTab === 'today' || activeTab === 'season' || activeTab === 'friends';
  const languageCfg = LANGUAGE_CONFIG[language];
  const countries = today?.countries ?? [];

  return (
    <div className="flex items-center gap-3 mb-3 mt-0.5">
      <div className="p-2 sm:p-2.5 bg-neo-purple rounded-neo border-2 border-neo-black shadow-hard-sm">
        <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-neo-yellow" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-neo-display font-black text-base sm:text-lg uppercase tracking-wide text-neo-white flex items-center gap-2 flex-wrap">
          <span>{t('wordHunt.leaderboard.title')}</span>
          {scope === 'combined' && (
            <span
              className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border-2 border-neo-black shadow-hard-sm normal-case tracking-normal bg-neo-lime text-neo-black"
              title={t('wordHunt.leaderboard.scopeCombined')}
            >
              {t('wordHunt.leaderboard.scopeCombined')}
            </span>
          )}
          {activeTab === 'today' && settled && (
            <span
              className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-black normal-case tracking-normal text-neo-lime"
              data-testid="live-indicator"
            >
              <span aria-hidden className="inline-flex rounded-full h-2 w-2 bg-neo-lime motion-safe:animate-pulse" />
              {t('wordHunt.leaderboard.live')}
            </span>
          )}
        </h3>
        {settled && totalCount > 0 && (
          <p className="text-xs sm:text-sm text-neo-white/60 font-medium truncate">
            {activeTab === 'today' && today ? (
              <>
                <span>{totalCount} {t('wordHunt.leaderboard.played')}</span>
                {scope !== 'combined' && (
                  <>
                    <Dot />
                    <span className="text-neo-lime">
                      {scope === 'word-hunt' ? today.huntSolved : today.wheelSolved} {t('wordHunt.leaderboard.solved')}
                    </span>
                  </>
                )}
                {today.guestCount > 0 && (
                  <>
                    <Dot />
                    <span className="text-neo-white/50">
                      {today.guestCount} {today.guestCount === 1 ? t('daily.guestSingular') : t('daily.guestsPlural')}
                    </span>
                  </>
                )}
                {countries.length > 0 && (
                  <>
                    <Dot />
                    <span data-testid="countries-strip" className="inline-flex items-center gap-1">
                      <span aria-hidden className="leading-none">
                        {countries.slice(0, 3).map((code) => (
                          <span key={code} title={code}>{getCountryFlag(code)}</span>
                        ))}
                      </span>
                      {countries.length === 1
                        ? t('wordHunt.leaderboard.countrySingular')
                        : t('wordHunt.leaderboard.countries').replace('{count}', String(countries.length))}
                    </span>
                  </>
                )}
              </>
            ) : (
              <>{totalCount} {totalCount === 1 ? t('daily.playerSingular') : t('daily.playersPlural')}</>
            )}
          </p>
        )}
      </div>
      {showLanguageToggle && (
        <button
          type="button"
          onClick={onToggleLanguageScope}
          title={t('wordHunt.leaderboard.languageScope')}
          className={`
            shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-neo border-2 border-neo-black
            text-[10px] sm:text-xs font-black shadow-hard-sm transition-[transform,box-shadow,background-color]
            hover:-translate-y-px hover:shadow-hard active:translate-y-0.5 active:shadow-none
            ${languageScope === 'all' ? 'bg-neo-lime text-neo-black' : 'bg-neo-cream text-neo-black'}
          `}
          data-testid="language-scope-toggle"
          data-scope={languageScope}
        >
          {languageScope === 'all' ? (
            <>
              <Globe aria-hidden className="w-3.5 h-3.5" />
              <span>{t('wordHunt.leaderboard.allLanguages')}</span>
            </>
          ) : (
            <>
              <span aria-hidden>{languageCfg?.flag ?? '🌐'}</span>
              <span>{t('wordHunt.leaderboard.myLanguage')}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

