'use client';

import { m } from 'framer-motion';
import { Building2, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dailyModeHref, type DailyModeDef } from '@/lib/dailyModes';

interface AdminDailyModeCardProps {
  mode: DailyModeDef;
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  delay?: number;
}

/** Accent → card chrome classes (matches the neo-brutalist quest cards). */
const ACCENT: Record<DailyModeDef['accent'], { bar: string; ring: string; cta: string }> = {
  orange: { bar: 'bg-neo-orange', ring: 'focus-visible:ring-neo-orange', cta: 'bg-neo-orange' },
  yellow: { bar: 'bg-neo-yellow', ring: 'focus-visible:ring-neo-yellow', cta: 'bg-neo-yellow' },
  cyan: { bar: 'bg-neo-cyan', ring: 'focus-visible:ring-neo-cyan', cta: 'bg-neo-cyan' },
};

/** Per-mode glyph (registry stays presentation-light). */
const ICON: Partial<Record<DailyModeDef['id'], typeof Building2>> = {
  'word-tower': Building2,
};

/**
 * AdminDailyModeCard — surfaces an admin-gated daily mode in the hub.
 *
 * Registry-driven so future modes appear for admins with zero hub edits. Uses a
 * plain hard-nav `<a>` (not the SPA router) because Word Tower's daily run reads
 * its mode from the `?daily=1` query at mount — a client nav wouldn't re-read it.
 * A small "ADMIN" flask badge makes the gate obvious during the rollout.
 */
export function AdminDailyModeCard({ mode, locale, t, delay = 0.3 }: AdminDailyModeCardProps) {
  const accent = ACCENT[mode.accent];
  const Icon = ICON[mode.id] ?? Building2;
  return (
    <m.a
      href={dailyModeHref(mode, locale)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      data-testid={`daily-admin-card-${mode.id}`}
      className={cn(
        'relative w-full rounded-xl border-3 border-neo-black border-dashed',
        'shadow-hard overflow-hidden cursor-pointer p-4',
        'flex items-center gap-4 bg-neo-navy-light/60 hover:bg-neo-navy-light',
        'focus-visible:outline-hidden focus-visible:ring-4 transition-all duration-200 group',
        accent.ring,
      )}
    >
      <div className={cn('absolute inset-e-0 top-0 bottom-0 w-1.5 rounded-e-lg', accent.bar)} />
      <div
        className={cn(
          'w-12 h-12 rounded-full border-2 border-neo-black shrink-0',
          'flex items-center justify-center shadow-hard-xs',
          accent.bar,
        )}
      >
        <Icon className="w-6 h-6 text-neo-black" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xl font-neo-display font-black text-neo-white leading-none truncate">
            {t(mode.titleKey)}
          </h2>
          <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black uppercase rounded border border-neo-purple/50 bg-neo-purple/20 text-neo-purple shrink-0">
            <FlaskConical className="w-2.5 h-2.5" />
            {t('daily.adminBeta')}
          </span>
        </div>
        <p className="mt-1 text-xs font-neo-body text-neo-cream/70 line-clamp-2">{t(mode.descKey)}</p>
      </div>
      <div
        className={cn(
          'shrink-0 py-2.5 px-5 text-xs font-black uppercase rounded-lg text-center',
          'text-neo-black border-2 border-neo-black shadow-hard-sm',
          'group-active:translate-y-0.5 group-active:shadow-none transition-all group-hover:scale-105',
          accent.cta,
        )}
      >
        {t('daily.startQuest')}
      </div>
    </m.a>
  );
}
