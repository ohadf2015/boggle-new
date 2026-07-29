'use client';

import { useMemo } from 'react';
import {
  Calendar, Mail, Globe, ShieldCheck, Bomb, Coins, Sparkles, ExternalLink, BookOpen,
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { postHogPersonUrl } from '@/lib/admin/postHogLinks';

export interface PlayerProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
  avatar_image: string | null;
  avatar_config: unknown | null;
  total_score: number | null;
  total_games: number | null;
  total_words: number | null;
  total_time_played: number | null;
  total_xp: number | null;
  current_level: number | null;
  casual_games: number | null;
  ranked_games: number | null;
  casual_wins: number | null;
  ranked_wins: number | null;
  ranked_mmr: number | null;
  peak_mmr: number | null;
  longest_word: string | null;
  longest_word_length: number | null;
  total_coins: number | null;
  lifetime_coins_earned: number | null;
  total_hints_used: number | null;
  prestige_level: number | null;
  prestige_multiplier: number | null;
  country_code: string | null;
  referral_count: number | null;
  user_role: string | null;
  is_admin: boolean | null;
  blast_access: boolean | null;
  daily_email_subscribed: boolean | null;
  last_seen_at: string | null;
  last_game_at: string | null;
  created_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
}

export interface PlayerGameRow {
  id: string;
  game_code: string | null;
  score: number | null;
  word_count: number | null;
  placement: number | null;
  is_ranked: boolean | null;
  language: string | null;
  time_played: number | null;
  created_at: string;
}

export interface PlayerModeRow {
  mode: string;
  count: number;
  totalScore: number;
  avgScore: number;
  completed: number;
}

export interface PlayerDetail {
  profile: PlayerProfile | null;
  recentGames: PlayerGameRow[];
  aggregates: {
    games: number;
    totalScore: number;
    totalWords: number;
    avgScore: number;
    ranked: number;
    casual: number;
    byLanguage: { language: string; count: number }[];
  };
  modeBreakdown: PlayerModeRow[];
  season: { id: number; score: number } | null;
}

interface Props {
  detail: PlayerDetail;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function formatTime(seconds: number | null): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function PlayerDetailView({ detail }: Props) {
  const { t } = useLanguage();
  const profile = detail.profile;

  const phUrl = useMemo(() => postHogPersonUrl(profile?.id), [profile?.id]);

  if (!profile) {
    return (
      <div data-testid="player-detail-empty" className="text-center py-12 text-slate-500">
        {t('admin.player.notFound')}
      </div>
    );
  }

  const winRate = (() => {
    const totalWins = (profile.casual_wins ?? 0) + (profile.ranked_wins ?? 0);
    const totalGames = (profile.casual_games ?? 0) + (profile.ranked_games ?? 0);
    return totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Avatar customAvatar={profile.avatar_config as never} userId={profile.id} size="lg" />
          <div>
            <h2 className="text-xl font-neo-display text-neo-white flex items-center gap-2 flex-wrap">
              {profile.display_name || profile.username || profile.id}
              {profile.is_admin && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-neo-lime text-black rounded">
                  admin
                </span>
              )}
              {profile.user_role === 'teacher' && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-neo-cyan text-black rounded">
                  teacher
                </span>
              )}
              {profile.blast_access && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-neo-orange text-black rounded">
                  <Bomb className="w-3 h-3 inline" /> blast
                </span>
              )}
            </h2>
            {profile.username && profile.display_name && (
              <span className="text-sm text-slate-400">@{profile.username}</span>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {t('admin.player.joined')} {formatDate(profile.created_at)}
              </span>
              <span className="flex items-center gap-1">
                {t('admin.player.lastGame')} {formatDate(profile.last_game_at)}
              </span>
              {profile.country_code && (
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {profile.country_code}
                </span>
              )}
            </div>
          </div>
        </div>

        {phUrl && (
          <a
            href={phUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            PostHog
          </a>
        )}
      </div>

      {/* Aggregate KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card testId="agg-games" label={t('admin.player.recentGames')} value={detail.aggregates.games} />
        <Card testId="agg-avg-score" label={t('admin.player.avgScore')} value={detail.aggregates.avgScore} />
        <Card label={t('admin.player.totalScore')} value={(profile.total_score ?? 0).toLocaleString()} />
        <Card label={t('admin.player.level')} value={profile.current_level ?? 1} />
        <Card label={t('admin.player.mmr')} value={profile.ranked_mmr ?? 0} subtitle={`peak ${profile.peak_mmr ?? 0}`} />
        <Card label={t('admin.player.winRate')} value={`${winRate}%`} />
      </div>

      {/* Identity / economy / acquisition */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <InfoBlock title={t('admin.player.identity')}>
          <Row icon={ShieldCheck} label={t('admin.player.role')} value={profile.user_role || 'player'} />
          <Row icon={Mail} label={t('admin.player.dailyEmail')} value={profile.daily_email_subscribed ? '✓' : '—'} />
          <Row icon={BookOpen} label={t('admin.player.referrals')} value={profile.referral_count ?? 0} />
          {detail.season && (
            <div data-testid="season-chip" className="mt-1 text-xs flex items-center gap-2 text-neo-lime">
              <Sparkles className="w-3 h-3" />
              {t('admin.player.seasonScore')} S{detail.season.id}: <strong>{detail.season.score.toLocaleString()}</strong>
            </div>
          )}
        </InfoBlock>

        <InfoBlock title={t('admin.player.economy')}>
          <Row icon={Coins} label={t('admin.player.coins')} value={(profile.total_coins ?? 0).toLocaleString()} />
          <Row icon={Coins} label={t('admin.player.lifetimeCoins')} value={(profile.lifetime_coins_earned ?? 0).toLocaleString()} />
          <Row icon={Sparkles} label={t('admin.player.hintsUsed')} value={profile.total_hints_used ?? 0} />
          {profile.longest_word && (
            <div data-testid="longest-word" className="mt-1 text-xs text-slate-300">
              {t('admin.player.longestWord')}:
              <span className="text-neo-cyan font-mono ms-2">{profile.longest_word}</span>
              <span className="text-slate-500 ms-1">({profile.longest_word_length})</span>
            </div>
          )}
        </InfoBlock>

        <InfoBlock title={t('admin.player.acquisition')}>
          {profile.utm_source && <Row label={t('admin.player.utmSource')} value={profile.utm_source} />}
          {profile.utm_medium && <Row label={t('admin.player.utmMedium')} value={profile.utm_medium} />}
          {profile.utm_campaign && <Row label={t('admin.player.utmCampaign')} value={profile.utm_campaign} />}
          {profile.referrer && <Row label={t('admin.player.referrer')} value={profile.referrer} />}
          {!profile.utm_source && !profile.utm_medium && !profile.utm_campaign && !profile.referrer && (
            <div className="text-xs text-slate-500">{t('admin.player.noAcquisitionData')}</div>
          )}
        </InfoBlock>
      </div>

      {/* Per-mode breakdown (game_sessions) */}
      {detail.modeBreakdown.length > 0 && (
        <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
          <h3 className="text-sm font-neo-display text-neo-white mb-3">
            {t('admin.player.byMode')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-xs">
              <thead className="text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="text-start py-1 pe-3">{t('admin.player.mode')}</th>
                  <th className="text-end py-1 px-2">{t('admin.player.sessions')}</th>
                  <th className="text-end py-1 px-2">{t('admin.player.completed')}</th>
                  <th className="text-end py-1 px-2">{t('admin.player.avgScore')}</th>
                  <th className="text-end py-1 px-2">{t('admin.player.totalScore')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {detail.modeBreakdown.map((row) => {
                  const completionPct = row.count > 0 ? Math.round((row.completed / row.count) * 100) : 0;
                  return (
                    <tr key={row.mode} data-testid="mode-row" className="text-slate-300">
                      <td className="py-1.5 pe-3">
                        <span className="font-mono text-neo-white">{row.mode}</span>
                      </td>
                      <td className="py-1.5 px-2 text-end font-mono">{row.count}</td>
                      <td className="py-1.5 px-2 text-end">
                        <span className="font-mono">{row.completed}</span>
                        <span className="text-slate-500 ms-1">({completionPct}%)</span>
                      </td>
                      <td className="py-1.5 px-2 text-end font-mono">{row.avgScore}</td>
                      <td className="py-1.5 px-2 text-end font-mono">{row.totalScore.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Languages played (from recent 50) */}
      {detail.aggregates.byLanguage.length > 0 && (
        <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
          <h3 className="text-sm font-neo-display text-neo-white mb-2">
            {t('admin.player.byLanguage')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {detail.aggregates.byLanguage.map((row) => (
              <span key={row.language} className="text-xs px-2 py-1 rounded bg-neo-navy-elevated text-neo-white">
                <span className="font-mono">{row.language}</span>
                <span className="text-slate-400 ms-1">×{row.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent games table */}
      <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-neo-display text-neo-white">
            {t('admin.player.recentGames')}
          </h3>
          <span className="text-xs text-slate-400">
            {detail.aggregates.ranked} {t('admin.player.ranked')} · {detail.aggregates.casual} {t('admin.player.casual')}
          </span>
        </div>

        {detail.recentGames.length === 0 ? (
          <div data-testid="games-empty" className="text-sm text-slate-500 text-center py-8">
            {t('admin.player.noGames')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-neo-navy-elevated/40">
                <tr className="text-xs text-slate-400 uppercase tracking-wider">
                  <th className="text-start px-4 py-2">{t('admin.player.gameCode')}</th>
                  <th className="text-start px-4 py-2">{t('admin.player.score')}</th>
                  <th className="text-start px-4 py-2">{t('admin.player.words')}</th>
                  <th className="text-start px-4 py-2">{t('admin.player.placement')}</th>
                  <th className="text-start px-4 py-2">{t('admin.player.mode')}</th>
                  <th className="text-start px-4 py-2">{t('admin.player.lang')}</th>
                  <th className="text-start px-4 py-2">{t('admin.player.duration')}</th>
                  <th className="text-start px-4 py-2">{t('admin.player.when')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {detail.recentGames.map((game) => (
                  <tr key={game.id} data-testid="game-row" className="text-sm text-slate-300 hover:bg-neo-navy-elevated/20">
                    <td className="px-4 py-2 font-mono text-neo-white">{game.game_code ?? '—'}</td>
                    <td className="px-4 py-2 font-mono">{game.score ?? 0}</td>
                    <td className="px-4 py-2 font-mono">{game.word_count ?? 0}</td>
                    <td className="px-4 py-2 font-mono">{game.placement ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded',
                        game.is_ranked ? 'bg-neo-lime/20 text-neo-lime' : 'bg-slate-600 text-slate-300'
                      )}>
                        {game.is_ranked ? t('admin.player.ranked') : t('admin.player.casual')}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{game.language ?? '—'}</td>
                    <td className="px-4 py-2 text-xs">{formatTime(game.time_played)}</td>
                    <td className="px-4 py-2 text-xs text-slate-400">
                      {new Date(game.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ testId, label, value, subtitle }: { testId?: string; label: string; value: string | number; subtitle?: string }) {
  return (
    <div data-testid={testId} className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-3">
      <div className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{label}</div>
      <div className="text-xl font-neo-display text-neo-white">{value}</div>
      {subtitle && <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>}
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-3 space-y-1">
      <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">{title}</div>
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-300">
      {Icon && <Icon className="w-3 h-3 text-slate-500" />}
      <span className="text-slate-500">{label}:</span>
      <span className="font-mono text-neo-white truncate">{value}</span>
    </div>
  );
}
