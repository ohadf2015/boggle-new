'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { holidayAccentBg } from '@/components/holidays/holidayAccent';
import { cn } from '@/lib/utils';
import HolidayCandles from './HolidayCandles';
import HolidayGifts from './HolidayGifts';
import { holidayApi, type TableView } from './holidayApi';
import { shareNative, shareOnWhatsApp, tableUrl } from './holidayShare';
import styles from './holidayDaily.module.css';

type Load = { s: 'loading' } | { s: 'error' } | { s: 'ready'; table: TableView | null };

const BTN = 'rounded-xl border-[3px] border-black px-3 py-2 font-neo-display text-sm font-bold shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed';

export default function HolidayTablePanel({ holiday }: { holiday: HolidayKey }) {
  const { t, language } = useLanguage();
  const [load, setLoad] = useState<Load>({ s: 'loading' });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    holidayApi
      .table(holiday)
      .then((r) => setLoad({ s: 'ready', table: r.table }))
      .catch(() => setLoad({ s: 'error' }));
  }, [holiday]);

  useEffect(() => refresh(), [refresh]);

  const act = async (action: 'create' | 'leave') => {
    setBusy(true);
    try {
      await holidayApi.tableAction(action, { holiday });
      refresh();
    } catch {
      setLoad({ s: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (load.s === 'loading') return null;
  if (load.s === 'error') {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-black bg-neo-navy p-2 text-xs">
        <span>{t('holiday.table.loadError', 'We couldn’t load your holiday table.')}</span>
        <button type="button" onClick={refresh} className="rounded-lg border-2 border-black bg-neo-cream px-2 py-1 font-bold text-neo-navy">
          {t('holiday.event.retry', 'Try again')}
        </button>
      </div>
    );
  }

  const table = load.table;
  if (!table) {
    return (
      <div data-testid="holiday-table-empty" className="flex items-center gap-3 rounded-xl border-2 border-black bg-neo-navy p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/holidays/together-${holiday}.webp`} alt="" width={512} height={300} className="h-14 w-auto" />
        <div className="flex-1">
          <p className="text-xs font-bold">{t('holiday.table.pitch', 'Play together: up to 8 friends, one shared goal every night.')}</p>
          <button type="button" disabled={busy} onClick={() => act('create')} className={cn(BTN, 'mt-1.5 text-neo-white', holidayAccentBg(holiday))}>
            {t('holiday.table.create', 'Start a holiday table')}
          </button>
        </div>
      </div>
    );
  }

  const url = tableUrl(window.location.origin, language, table.code);
  const invite = t('holiday.table.inviteText', 'Sit at my holiday table on LexiClash! Play the daily and we light it up together.');
  const lit = table.board.nights.filter((n) => n.lit).length;
  const progress = Math.min(1, table.board.today.total / Math.max(1, table.board.goal));

  return (
    <div data-testid="holiday-table" className="rounded-xl border-2 border-black bg-neo-navy p-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-neo-display text-sm font-bold">{t('holiday.table.title', 'Your holiday table')}</h3>
        <span className="text-[11px] font-bold text-neo-white/70">{t('holiday.table.seats', '{count} of 8 seats', { count: table.members.length })}</span>
      </div>
      {holiday === 'hanukkah' ? (
        <HolidayCandles total={table.board.nights.length} lit={lit} className="mt-2" />
      ) : (
        <HolidayGifts total={table.board.nights.length} opened={lit} className="mt-2" />
      )}
      {lit === table.board.nights.length && (
        <p data-testid="holiday-table-finale" className={cn('mt-2 rounded-lg border-2 border-black px-2 py-1 text-center font-neo-display text-xs font-bold text-neo-white', holidayAccentBg(holiday), styles.pop)}>
          {holiday === 'hanukkah'
            ? t('holiday.table.finaleHanukkah', 'Full menorah! Your table lit every night together.')
            : t('holiday.table.finaleChristmas', 'Every gift opened! Your table played all 12 days together.')}
        </p>
      )}
      <div className="mt-2" aria-label={t('holiday.table.goalLabel', 'Tonight’s group goal')}>
        <div className="h-3 overflow-hidden rounded-full border-2 border-black bg-neo-navy-light">
          <div
            className={cn('h-full w-full origin-left transition-transform duration-700 rtl:origin-right', holidayAccentBg(holiday))}
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
        <p className="mt-1 text-[11px] font-bold text-neo-white/80">
          {t('holiday.table.goal', 'Tonight: {total} / {goal} points together', { total: table.board.today.total, goal: table.board.goal })}
        </p>
      </div>
      <ol className="mt-2 space-y-1">
        {table.members.map((m) => (
          <li key={m.userId} className={cn('flex items-center gap-2 rounded-lg px-2 py-1 text-xs', m.isYou ? 'bg-neo-cream/15' : 'bg-neo-navy-light')}>
            <span className="w-4 font-neo-display font-bold tabular-nums">{m.rank}</span>
            <span aria-hidden="true">{m.avatarEmoji ?? '🙂'}</span>
            <span className="flex-1 truncate font-bold">{m.isYou ? t('mp.rivals.you', 'You') : (m.name ?? t('holiday.table.player', 'Player'))}</span>
            {m.playedToday && <span className="text-neo-cream">{t('holiday.table.playedToday', 'played')}</span>}
            <span className="font-neo-display font-bold tabular-nums">{m.total}</span>
          </li>
        ))}
      </ol>
      {table.members.length < 8 && (
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => shareOnWhatsApp(invite, url)} className={cn(BTN, 'flex-1 bg-neo-holiday-pine text-neo-white')}>
            {t('holiday.share.whatsapp', 'Invite on WhatsApp')}
          </button>
          <button type="button" onClick={() => void shareNative(invite, url)} className={cn(BTN, 'bg-neo-cream text-neo-navy')}>
            {t('holiday.share.more', 'More')}
          </button>
        </div>
      )}
      <button type="button" disabled={busy} onClick={() => act('leave')} className="mt-2 text-[11px] font-bold text-neo-white/60 underline">
        {t('holiday.table.leave', 'Leave table')}
      </button>
    </div>
  );
}
