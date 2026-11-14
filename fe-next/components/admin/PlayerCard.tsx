'use client';

import React, { useState } from 'react';
import { Gift, Bomb, ExternalLink, Ban, FlaskConical, ShieldCheck, Languages } from 'lucide-react';
import Link from 'next/link';
import { postHogPersonUrl } from '@/lib/admin/postHogLinks';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import Avatar from '@/components/Avatar';
import type { Player, CuratorAssignmentRow } from './playerManagerTypes';
import { PlayerCuratorControl } from './PlayerCuratorControl';
import { formatStyleBadge } from '@/lib/playerStyle/styles';

interface PlayerCardProps {
  player: Player;
  language: string;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onGift: (player: Player) => void;
  onToggleBlast: (player: Player) => void;
  onToggleBeta: (player: Player) => void;
  onBlock: (player: Player) => void;
  blastLoading: boolean;
  betaLoading: boolean;
  blockLoading: boolean;
  curatorAssignments: CuratorAssignmentRow[];
  onAssignCurator: (player: Player, language: string, tier: number) => void;
  onRevokeCurator: (player: Player, language: string) => void;
  curatorBusyKey: string | null;
}

export function PlayerCard({
  player,
  language,
  selected,
  onToggleSelect,
  onGift,
  onToggleBlast,
  onToggleBeta,
  onBlock,
  blastLoading,
  betaLoading,
  blockLoading,
  curatorAssignments,
  onAssignCurator,
  onRevokeCurator,
  curatorBusyKey,
}: PlayerCardProps) {
  const [curatorOpen, setCuratorOpen] = useState(false);
  const name = player.display_name || player.username;
  const phUrl = postHogPersonUrl(player.id);
  const styleBadge = formatStyleBadge(player.player_style);
  const date = (iso: string) => new Date(iso).toLocaleDateString(language, { day: 'numeric', month: 'short', year: '2-digit' });

  return (
    <div data-testid="player-row" className={cn('px-3 py-2 transition-colors', selected ? 'bg-neo-lime/10' : 'hover:bg-white/5')}>
      <div className="flex items-center gap-3">
        <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(player.id)} aria-label={`Select ${name}`} className="shrink-0" />
        <Avatar customAvatar={player.avatar_config} userId={player.id} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link href={`/${language}/admin/players/${player.id}`} className="truncate font-bold hover:text-neo-cyan transition-colors">
              {name}
            </Link>
            {player.display_name && player.username && (
              <span className="hidden truncate text-xs text-slate-500 md:inline">@{player.username}</span>
            )}
            {styleBadge && (
              <span data-testid="player-style-badge" title={`Chosen style: ${styleBadge.label}`} className={PILL}>
                <span aria-hidden>{styleBadge.emoji}</span>
                <span className="hidden lg:inline">{styleBadge.label}</span>
              </span>
            )}
            {player.is_test_account && (
              <span data-testid="player-test-badge" title="Test account: excluded from dashboard stats" className={PILL}>Test</span>
            )}
            {player.is_admin && (
              <span data-testid="player-admin-badge" title="Admin" className={cn(PILL, 'border-neo-cyan/40 bg-neo-cyan/10 text-neo-cyan')}>
                <ShieldCheck className="h-3 w-3" />Admin
              </span>
            )}
            {player.is_beta_tester && (
              <span data-testid="player-beta-badge" title="Beta tester — sees in-work modes" className={PILL}>Beta</span>
            )}
          </div>
          <div className="truncate text-[11px] text-slate-500">
            Joined {date(player.created_at)}
            {player.last_game_at && <> · Last game {date(player.last_game_at)}</>}
          </div>
        </div>

        <dl className="hidden shrink-0 grid-cols-3 gap-4 text-end sm:grid">
          <Stat label="Games" value={player.total_games} />
          <Stat label="Score" value={`${(player.total_score / 1000).toFixed(1)}k`} valueClass="text-neo-cyan" />
          <Stat label="MMR" value={player.ranked_mmr} valueClass="text-neo-yellow" />
        </dl>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconAction label="Gift" onClick={() => onGift(player)} className="text-neo-yellow">
            <Gift className="h-4 w-4" />
          </IconAction>
          <IconAction
            label={player.blast_access ? 'Revoke blast access' : 'Grant blast access'}
            onClick={() => onToggleBlast(player)}
            disabled={blastLoading}
            pressed={!!player.blast_access}
            className="text-neo-orange"
          >
            <Bomb className="h-4 w-4" />
          </IconAction>
          <IconAction
            testId="player-beta-toggle"
            label={player.is_beta_tester ? 'Revoke beta access' : 'Grant beta access'}
            onClick={() => onToggleBeta(player)}
            disabled={betaLoading}
            pressed={!!player.is_beta_tester}
            className="text-neo-purple"
          >
            <FlaskConical className="h-4 w-4" />
          </IconAction>
          <button
            type="button"
            data-testid="player-curator-toggle"
            aria-expanded={curatorOpen}
            aria-label="Language curator"
            title="Language curator"
            onClick={() => setCuratorOpen((v) => !v)}
            className={cn(ICON_BTN, 'gap-0.5 text-neo-lime', (curatorOpen || curatorAssignments.length > 0) && 'bg-neo-lime/15')}
          >
            <Languages className="h-4 w-4" />
            {curatorAssignments.length > 0 && <span className="text-[10px] font-bold tabular-nums">{curatorAssignments.length}</span>}
          </button>
          {phUrl && (
            <a href={phUrl} target="_blank" rel="noreferrer noopener" aria-label="Open in PostHog" title="Open in PostHog" className={cn(ICON_BTN, 'text-slate-400')}>
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <IconAction label="Block" onClick={() => onBlock(player)} disabled={blockLoading} className="text-neo-red">
            <Ban className="h-4 w-4" />
          </IconAction>
        </div>
      </div>

      {curatorOpen && (
        <div className="ms-14 mt-2 border-t border-dashed border-slate-700 pt-2">
          <PlayerCuratorControl
            isAdmin={player.is_admin}
            assignments={curatorAssignments}
            onAssign={(lang, tier) => onAssignCurator(player, lang, tier)}
            onRevoke={(lang) => onRevokeCurator(player, lang)}
            busyKey={curatorBusyKey}
          />
        </div>
      )}
    </div>
  );
}

const PILL = 'inline-flex shrink-0 items-center gap-1 rounded-full border border-neo-purple/40 bg-neo-purple/10 px-1.5 py-px text-[10px] font-black uppercase tracking-wide text-neo-purple';
const ICON_BTN = 'inline-flex h-8 min-w-8 items-center justify-center rounded px-1 hover:bg-white/10 disabled:opacity-40';

function IconAction({ label, onClick, disabled, pressed, className, testId, children }: {
  label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; className?: string; testId?: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(ICON_BTN, className, pressed && 'bg-current/15 ring-1 ring-current')}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, valueClass = '' }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="w-12">
      <dt className="text-[10px] uppercase text-slate-500">{label}</dt>
      <dd className={cn('font-mono text-sm font-bold tabular-nums', valueClass)}>{value}</dd>
    </div>
  );
}
