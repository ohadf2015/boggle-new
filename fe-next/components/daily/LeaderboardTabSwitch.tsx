import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Calendar, Users, Sparkles, Crown, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeaderboardTab } from './leaderboardTypes';

export type { LeaderboardTab } from './leaderboardTypes';

type T = (key: string, fallback?: string) => string;

/** Shared by the tab buttons (aria-controls) and the board's tabpanel. */
export const tabPanelId = (prefix: string, tab: LeaderboardTab) => `${prefix}-lb-${tab}`;

interface LeaderboardTabSwitchProps {
  t: T;
  activeTab: LeaderboardTab;
  onTabChange: (tab: LeaderboardTab) => void;
  /** Unique per mounted board, so two boards on one page never share ids. */
  idPrefix?: string;
}

const SECONDARY: Array<{ tab: LeaderboardTab; key: string; Icon: typeof Calendar }> = [
  { tab: 'season', key: 'wordHunt.leaderboard.season', Icon: Sparkles },
  { tab: 'alltime', key: 'wordHunt.leaderboard.allTime', Icon: Crown },
  { tab: 'connections', key: 'wordHunt.leaderboard.connections', Icon: Link2 },
];

const SEGMENT =
  'relative flex-1 min-w-0 h-9 px-3 inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-black uppercase tracking-wide transition-colors touch-manipulation';

export default function LeaderboardTabSwitch({ t, activeTab, onTabChange, idPrefix = 'daily' }: LeaderboardTabSwitchProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const secondary = SECONDARY.find(s => s.tab === activeTab);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      moreRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menuOpen]);

  const tab = (value: LeaderboardTab, label: string, Icon: typeof Calendar) => (
    <button
      type="button"
      role="tab"
      id={`${tabPanelId(idPrefix, value)}-tab`}
      aria-selected={activeTab === value}
      aria-controls={tabPanelId(idPrefix, value)}
      onClick={() => onTabChange(value)}
      className={cn(SEGMENT, activeTab === value ? 'bg-neo-lime text-neo-black' : 'text-neo-white/75 hover:text-neo-white')}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="relative" ref={rootRef}>
      <div role="tablist" className="flex items-center gap-1 p-1 rounded-full border-2 border-neo-black bg-neo-navy">
        {tab('today', t('wordHunt.leaderboard.today'), Calendar)}
        {tab('friends', t('leaderboard.friends'), Users)}
        <button
          ref={moreRef}
          type="button"
          role="tab"
          id={secondary ? `${tabPanelId(idPrefix, secondary.tab)}-tab` : undefined}
          data-testid="leaderboard-more-tabs"
          aria-selected={!!secondary}
          aria-controls={secondary ? tabPanelId(idPrefix, secondary.tab) : undefined}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
          className={cn(SEGMENT, secondary ? 'bg-neo-lime text-neo-black' : 'text-neo-white/75 hover:text-neo-white')}
        >
          <span className="truncate">{secondary ? t(secondary.key) : t('wordWheel.climb.moreBoards')}</span>
          <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform', menuOpen && 'rotate-180')} aria-hidden />
        </button>
      </div>
      {menuOpen && (
        <div
          role="menu"
          className="absolute end-0 top-full mt-1.5 z-30 min-w-44 p-1 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard"
        >
          {SECONDARY.map(({ tab: value, key, Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              data-testid={value === 'connections' ? 'connections-tab-button' : undefined}
              onClick={() => {
                setMenuOpen(false);
                onTabChange(value);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-start',
                activeTab === value ? 'bg-neo-lime text-neo-black' : 'text-neo-white hover:bg-neo-black/30',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden />
              {t(key)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
