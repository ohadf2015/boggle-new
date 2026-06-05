'use client';

import React from 'react';
import { Calendar, Gift, Bomb, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { postHogPersonUrl } from '@/lib/admin/postHogLinks';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Avatar from '@/components/Avatar';
import type { Player } from './playerManagerTypes';

interface PlayerCardProps {
  player: Player;
  language: string;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onGift: (player: Player) => void;
  onToggleBlast: (player: Player) => void;
  blastLoading: boolean;
}

/**
 * A single row in the admin players list. Pulled out of PlayerManager so the
 * manager stays a thin orchestrator (selection + filters + pagination) and each
 * card owns its own presentation + per-player actions.
 */
export function PlayerCard({
  player,
  language,
  selected,
  onToggleSelect,
  onGift,
  onToggleBlast,
  blastLoading,
}: PlayerCardProps) {
  const name = player.display_name || player.username;
  const phUrl = postHogPersonUrl(player.id);

  return (
    <Card className={`overflow-hidden transition-shadow ${selected ? 'ring-2 ring-neo-lime' : 'hover:shadow-md'}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Player Info */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(player.id)}
              aria-label={`Select ${name}`}
              className="w-4 h-4 flex-shrink-0"
            />
            <Avatar customAvatar={player.avatar_config} userId={player.id} size="lg" />
            <div>
              <Link
                href={`/${language}/admin/players/${player.id}`}
                className="font-bold text-lg flex items-center gap-2 hover:text-neo-cyan transition-colors"
              >
                {name}
                {player.display_name && player.username && (
                  <span className="text-xs font-normal text-slate-500">@{player.username}</span>
                )}
              </Link>
              <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Joined {new Date(player.created_at).toLocaleDateString()}
                </span>
                {player.last_game_at && (
                  <span className="flex items-center gap-1">
                    Last game {new Date(player.last_game_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2 w-full sm:w-auto mt-2 sm:mt-0">
            <Stat label="Games" value={player.total_games} />
            <Stat label="Score" value={`${(player.total_score / 1000).toFixed(1)}k`} valueClass="text-blue-500" />
            <Stat label="MMR" value={player.ranked_mmr} valueClass="text-amber-500" />
            <div className="flex flex-col items-center sm:items-end gap-1">
              {phUrl && (
                <a
                  href={phUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  title="Open in PostHog"
                  className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  PostHog
                </a>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onGift(player)}
                className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <Gift className="w-4 h-4 me-1" />
                Gift
              </Button>
              <Button
                variant={player.blast_access ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggleBlast(player)}
                disabled={blastLoading}
                className={player.blast_access
                  ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500'
                  : 'text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                }
                title={player.blast_access ? 'Revoke blast access' : 'Grant blast access'}
              >
                <Bomb className="w-4 h-4 me-1" />
                {player.blast_access ? 'Blast ✓' : 'Blast'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, valueClass = '' }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex flex-col items-center sm:items-end">
      <span className="text-xs text-slate-400 uppercase">{label}</span>
      <span className={`font-mono font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}
