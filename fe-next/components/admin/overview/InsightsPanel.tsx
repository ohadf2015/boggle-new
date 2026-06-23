'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  TrendingUp, TrendingDown, Minus, Trophy, Flame, Rocket,
  CalendarDays, Clock, Share2, UserX, SpellCheck2,
} from 'lucide-react';
import type { InsightsBundle } from '@/lib/admin/insightsTypes';
import { peakBucketIndex, maxGames, barPct, computeDelta } from '@/lib/admin/insightsTransforms';

const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MODE_LABEL: Record<string, string> = {
  classic: 'admin.mpModeBreakdown.classic',
  blast: 'admin.mpModeBreakdown.blast',
  'word-hunt': 'admin.mpModeBreakdown.wordHunt',
  'wheel-rush': 'admin.mpModeBreakdown.wheelRush',
};
const LANG_LABEL: Record<string, string> = {
  en: '🇬🇧 EN', he: '🇮🇱 HE', sv: '🇸🇪 SV', ja: '🇯🇵 JA', es: '🇪🇸 ES',
};

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
      <h3 className="text-neo-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-neo-lime" />
        {title}
      </h3>
      {children}
    </div>
  );
}

export function InsightsPanel() {
  const { t } = useLanguage();
  const [data, setData] = useState<InsightsBundle | null>(null);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/insights?days=${days}`)
      .then(res => (res.ok ? res.json() : null))
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`skel-${i}`} className="h-10 bg-neo-navy-elevated/50 rounded-neo animate-pulse" role="presentation" />
          ))}
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
        <p className="text-neo-white text-xs">{t('admin.noData') || 'No data available'}</p>
      </div>
    );
  }

  const delta = computeDelta(data.records.today, data.records.yesterday);
  const peakDow = peakBucketIndex(data.dayOfWeek, 'dow');
  const peakHour = peakBucketIndex(data.hourOfDay, 'hour');
  const dowMax = maxGames(data.dayOfWeek);
  const hourMax = maxGames(data.hourOfDay);
  const DeltaIcon = delta.direction === 'up' ? TrendingUp : delta.direction === 'down' ? TrendingDown : Minus;
  const deltaColor = delta.direction === 'up' ? 'text-neo-lime' : delta.direction === 'down' ? 'text-neo-red' : 'text-slate-400';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-neo-white font-bold text-base uppercase tracking-wider flex items-center gap-2">
          <Rocket className="w-5 h-5 text-neo-pink" />
          {t('admin.insights.title') || 'Insights'}
        </h2>
        <div className="flex gap-1">
          {[30, 90, 365].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-2 py-0.5 text-xs font-bold rounded-neo border border-black transition-colors',
                days === d ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy-elevated text-neo-white hover:bg-slate-600'
              )}
            >
              {d === 365 ? t('admin.insights.allTime') || '1y' : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Records / deltas — the dopamine strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{t('admin.insights.gamesToday') || 'Games today'}</p>
          <p className="text-neo-white font-bold text-3xl tabular-nums">{data.records.today.toLocaleString()}</p>
          <p className={cn('text-xs font-bold flex items-center gap-1 mt-1', deltaColor)}>
            <DeltaIcon className="w-3.5 h-3.5" />
            {delta.pct === null ? t('admin.insights.vsYesterdayNew') || 'vs 0 yesterday' : `${delta.pct > 0 ? '+' : ''}${delta.pct}% ${t('admin.insights.vsYesterday') || 'vs yesterday'}`}
          </p>
        </div>
        <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-neo-yellow" />{t('admin.insights.bestDayEver') || 'Best day ever'}
          </p>
          <p className="text-neo-white font-bold text-3xl tabular-nums">{data.records.bestDayGames.toLocaleString()}</p>
          <p className="text-slate-400 text-xs mt-1">{data.records.bestDay ?? '—'}</p>
        </div>
        <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-neo-orange" />{t('admin.insights.fastestGrowing') || 'Fastest-growing mode'}
          </p>
          {data.records.fastestMode ? (
            <>
              <p className="text-neo-white font-bold text-2xl truncate">{t(MODE_LABEL[data.records.fastestMode]) || data.records.fastestMode}</p>
              <p className="text-neo-lime text-xs font-bold mt-1">+{data.records.fastestPct}% {t('admin.insights.thisWeek') || 'this week'}</p>
            </>
          ) : (
            <p className="text-slate-400 text-sm mt-2">—</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Day of week */}
        <Card title={t('admin.insights.byDayOfWeek') || 'Busiest day'} icon={CalendarDays}>
          {peakDow !== null && (
            <p className="text-neo-white text-sm mb-3">
              🔥 <span className="font-bold text-neo-lime">{t(`admin.insights.dow.${DOW_KEYS[peakDow]}`) || DOW_KEYS[peakDow]}</span> {t('admin.insights.isPeakDay') || 'is your peak day'}
            </p>
          )}
          <div className="flex items-end justify-between gap-1.5 h-28">
            {data.dayOfWeek.map(b => (
              <div key={b.dow} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <div className="w-full bg-neo-navy-elevated/40 rounded-sm flex items-end h-full">
                  <div
                    className={cn('w-full rounded-sm transition-all duration-500', b.dow === peakDow ? 'bg-neo-lime' : 'bg-neo-pink/70')}
                    style={{ height: `${barPct(b.games, dowMax)}%` }}
                  />
                </div>
                <span className="text-slate-400 text-[10px] font-bold">{(t(`admin.insights.dow.${DOW_KEYS[b.dow]}`) || DOW_KEYS[b.dow]).slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Hour of day */}
        <Card title={t('admin.insights.byHour') || 'Busiest hour (UTC)'} icon={Clock}>
          {peakHour !== null && (
            <p className="text-neo-white text-sm mb-3">
              ⏰ <span className="font-bold text-neo-cyan">{String(peakHour).padStart(2, '0')}:00 UTC</span> {t('admin.insights.isPeakHour') || 'is your peak hour'}
            </p>
          )}
          <div className="flex items-end justify-between gap-px h-28">
            {Array.from({ length: 24 }).map((_, h) => {
              const bucket = data.hourOfDay.find(x => x.hour === h);
              const games = bucket?.games ?? 0;
              return (
                <div key={h} className="flex-1 flex items-end h-full" title={`${String(h).padStart(2, '0')}:00 — ${games}`}>
                  <div
                    className={cn('w-full rounded-t-sm transition-all duration-500', h === peakHour ? 'bg-neo-cyan' : 'bg-neo-purple/60')}
                    style={{ height: `${barPct(games, hourMax)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Mode affinity */}
        <Card title={t('admin.insights.crossPlay') || 'Players who play X also play Y'} icon={Share2}>
          <div className="space-y-2">
            {data.modeAffinity.slice(0, 6).map((a, i) => (
              <div key={`${a.fromMode}-${a.toMode}-${i}`} className="flex items-center gap-2 text-xs">
                <span className="text-neo-white font-bold w-20 truncate">{t(MODE_LABEL[a.fromMode]) || a.fromMode}</span>
                <span className="text-slate-500">→</span>
                <div className="flex-1 h-4 bg-neo-navy-elevated/50 rounded-sm overflow-hidden">
                  <div className="h-full bg-neo-lime/70 rounded-sm" style={{ width: `${a.pct}%` }} />
                </div>
                <span className="text-neo-lime font-bold font-mono w-10 text-right">{a.pct}%</span>
                <span className="text-neo-white w-20 truncate">{t(MODE_LABEL[a.toMode]) || a.toMode}</span>
              </div>
            ))}
            {data.modeAffinity.length === 0 && <p className="text-slate-400 text-xs">{t('admin.noData') || 'No data available'}</p>}
          </div>
        </Card>

        {/* No-show rate */}
        <Card title={t('admin.insights.noShowRate') || 'Joined but never scored'} icon={UserX}>
          <p className="text-slate-500 text-[11px] mb-3">{t('admin.insights.noShowHint') || 'Share of games recorded with 0 score & 0 words — players who joined but did not play.'}</p>
          <div className="space-y-2">
            {data.noShowByMode.filter(m => m.total >= 5).map(m => (
              <div key={m.mode} className="flex items-center gap-2 text-xs">
                <span className="text-neo-white font-bold w-20 truncate">{t(MODE_LABEL[m.mode]) || m.mode}</span>
                <div className="flex-1 h-4 bg-neo-navy-elevated/50 rounded-sm overflow-hidden">
                  <div className={cn('h-full rounded-sm', m.pct >= 40 ? 'bg-neo-red/70' : 'bg-neo-orange/70')} style={{ width: `${m.pct}%` }} />
                </div>
                <span className="text-neo-white font-mono w-10 text-right">{m.pct}%</span>
                <span className="text-slate-500 font-mono w-16 text-right">{m.noShows}/{m.total}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Word quality by language */}
        <div className="lg:col-span-2">
          <Card title={t('admin.insights.wordQuality') || 'Word-quality by language'} icon={SpellCheck2}>
            <p className="text-slate-500 text-[11px] mb-3">{t('admin.insights.wordQualityHint') || 'Rejected vs accepted word submissions (30d). A high reject rate flags dictionary gaps for that language.'}</p>
            <div className="space-y-2">
              {data.wordQualityByLang.map(w => {
                const total = w.valid + w.invalid;
                const rate = w.rejectRate ?? 0;
                return (
                  <div key={w.language} className="flex items-center gap-2 text-xs">
                    <span className="text-neo-white font-bold w-16">{LANG_LABEL[w.language] || w.language}</span>
                    <div className="flex-1 h-4 bg-neo-navy-elevated/50 rounded-sm overflow-hidden">
                      <div className={cn('h-full rounded-sm', rate >= 60 ? 'bg-neo-red/70' : rate >= 35 ? 'bg-neo-orange/70' : 'bg-neo-lime/70')} style={{ width: `${rate}%` }} />
                    </div>
                    <span className="text-neo-white font-mono w-12 text-right">{rate}%</span>
                    <span className="text-slate-500 font-mono w-28 text-right">{w.invalid}/{total.toLocaleString()} {t('admin.insights.rejected') || 'rejected'}</span>
                  </div>
                );
              })}
              {data.wordQualityByLang.length === 0 && <p className="text-slate-400 text-xs">{t('admin.noData') || 'No data available'}</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
