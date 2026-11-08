'use client';

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { GameGroup } from '@/lib/admin/gameLog/groupGames';
import { gameModeLabel } from '@/lib/admin/gameLog/gameDisplay';
import { engagementTag, formatSeconds, subModeLabel, type EngagementTone } from '@/lib/admin/gameLog/engagement';
import { CANONICAL_MODE_BUCKETS } from '@/lib/admin/gameLog/modeBuckets';
import { LANGUAGE_FLAGS, GAME_TYPE_ICONS, formatTime } from '../constants';
import { PlayerAvatar } from './PlayerAvatar';

type T = (key: string, fallback?: string) => string;

const TONE_CLASS: Record<EngagementTone, string> = {
  done: 'bg-neo-lime/15 text-neo-lime border-neo-lime/40',
  left: 'bg-neo-cyan/10 text-neo-cyan border-neo-cyan/40',
  empty: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  bot: 'bg-slate-600/40 text-slate-300 border-slate-500/50',
  error: 'bg-neo-red/20 text-neo-red border-neo-red/40',
};

/** Desktop grid — shared with the column header in VirtualGamesList so they stay aligned. */
export const ROW_GRID =
  'grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[52px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.3fr)_56px_56px_56px_20px] gap-x-3 gap-y-1';

const BUCKET_LABEL_KEY = new Map(CANONICAL_MODE_BUCKETS.map((b) => [b.key, b.labelKey]));

export function modeText(group: Pick<GameGroup, 'modeRaw' | 'subMode' | 'typeBucket'>, t: T): string {
  // Translated bucket name when the raw mode has one (Hebrew admin reads Hebrew);
  // the English canonical label otherwise.
  const english = gameModeLabel(group.modeRaw, t);
  const labelKey = BUCKET_LABEL_KEY.get(group.typeBucket);
  const mode = labelKey ? t(`admin.todayGames.${labelKey}`, english) : english;
  const sub = subModeLabel(group.subMode);
  return sub ? `${mode} · ${t(`admin.todayGames.subMode.${group.subMode}`, sub)}` : mode;
}

export function EngagementBadge({ group, t }: { group: GameGroup; t: T }) {
  const tag = engagementTag(group, t);
  return (
    <span
      data-testid="engagement-tag"
      data-engagement={group.engagement ?? 'unknown'}
      className={`inline-flex items-center whitespace-nowrap text-[11px] leading-4 border rounded-full px-2 py-0.5 ${TONE_CLASS[tag.tone]}`}
    >
      {tag.label}
    </span>
  );
}

function statsLine(group: GameGroup, t: T): string {
  const parts = [
    `${group.topScore} ${t('admin.todayGames.pointsShort', 'pts')}`,
    `${group.totalWords} ${t('admin.todayGames.wordsShort', 'words')}`,
  ];
  if (group.durationSec != null) parts.push(formatSeconds(group.durationSec));
  return parts.join(' · ');
}

export function GameListRow({
  group,
  isOpen,
  onToggle,
  t,
}: {
  group: GameGroup;
  isOpen: boolean;
  onToggle: () => void;
  t: T;
}) {
  const flag = LANGUAGE_FLAGS[group.language] || '🌐';
  const typeIcon = GAME_TYPE_ICONS[group.modeRaw] || null;
  const hostName = group.host?.displayName || 'Unknown';
  const isBot = group.engagement === 'bot';
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  const mode = modeText(group, t);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className={`w-full text-start px-3 py-2.5 grid ${ROW_GRID} items-center hover:bg-neo-navy-elevated/30 transition-colors ${isBot ? 'opacity-60' : ''}`}
    >
      {/* Desktop: time column. Phone: avatar column. */}
      <span className="hidden sm:block text-xs text-slate-400 font-mono">{formatTime(group.createdAt)}</span>
      <span className="sm:hidden relative inline-flex self-start mt-0.5">
        <PlayerAvatar customAvatar={group.host?.profile?.avatar_config} userId={group.host?.playerId ?? group.host?.guestSessionId ?? undefined} />
        {group.isMultiplayer && <span className="absolute -top-1.5 -end-1.5 text-xs">👥</span>}
      </span>

      {/* Player (+ on phone: mode, result, stats) */}
      <span className="flex items-center gap-2 min-w-0">
        <span className="hidden sm:inline-flex relative flex-shrink-0">
          <PlayerAvatar customAvatar={group.host?.profile?.avatar_config} userId={group.host?.playerId ?? group.host?.guestSessionId ?? undefined} />
          {group.isMultiplayer && <span className="absolute -top-1.5 -end-1.5 text-xs">👥</span>}
        </span>
        <span className="flex flex-col min-w-0 gap-0.5">
          <span className="text-sm text-neo-white truncate">
            {hostName}
            {group.isMultiplayer && group.playerCount > 1 && (
              <span className="ms-1.5 text-[11px] text-slate-400 font-mono">
                +{group.playerCount - 1}{group.botCount ? ` · ${group.botCount}🤖` : ''}
              </span>
            )}
          </span>
          <span className="sm:hidden text-xs text-slate-300 truncate">{mode}</span>
          <span className="sm:hidden flex items-center gap-2 flex-wrap">
            <EngagementBadge group={group} t={t} />
            <span className="text-[11px] text-slate-400 font-mono">{statsLine(group, t)}</span>
          </span>
        </span>
      </span>

      {/* Desktop columns */}
      <span className="hidden sm:flex items-center gap-1.5 min-w-0">
        {typeIcon}
        <span className="text-sm text-slate-300 truncate">{mode}</span>
        {group.isRanked && <span className="text-[9px] bg-slate-600 text-slate-300 px-1 rounded">{t('admin.todayGames.ranked', 'Ranked')}</span>}
      </span>
      <span className="hidden sm:flex min-w-0"><EngagementBadge group={group} t={t} /></span>
      <span className="hidden sm:block text-end font-mono text-sm text-neo-white">{group.topScore}</span>
      <span className="hidden sm:block text-end font-mono text-sm text-slate-300">{group.totalWords}</span>
      <span className="hidden sm:block text-end font-mono text-sm text-slate-400">
        {group.durationSec != null ? formatSeconds(group.durationSec) : '—'}
      </span>
      <span className="hidden sm:flex justify-center text-slate-400"><Chevron className="w-4 h-4" /></span>

      {/* Phone: time + flag + chevron */}
      <span className="sm:hidden flex flex-col items-end self-start gap-1 text-slate-400">
        <span className="text-xs font-mono">{formatTime(group.createdAt)}</span>
        <span className="flex items-center gap-0.5">
          <span className="text-base leading-none">{flag}</span>
          <Chevron className="w-4 h-4 rtl:-scale-x-100" />
        </span>
      </span>
    </button>
  );
}
