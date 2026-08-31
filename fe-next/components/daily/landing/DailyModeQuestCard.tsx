'use client';

import { m } from 'framer-motion';
import { Building2, FlaskConical, Check, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dailyModeHref, type DailyModeDef } from '@/lib/dailyModes';

interface DailyModeQuestCardProps {
  mode: DailyModeDef;
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Already climbed today — shows a cleared check (replays still allowed). */
  played?: boolean;
  delay?: number;
}

/** Accent → card chrome classes (matches the neo-brutalist quest cards). */
const ACCENT: Record<DailyModeDef['accent'], { bar: string; ring: string; cta: string; tint: string }> = {
  orange: { bar: 'bg-neo-orange', ring: 'focus-visible:ring-neo-orange', cta: 'bg-neo-orange', tint: 'bg-neo-orange/[0.06] hover:bg-neo-orange/[0.1]' },
  yellow: { bar: 'bg-neo-yellow', ring: 'focus-visible:ring-neo-yellow', cta: 'bg-neo-yellow', tint: 'bg-neo-yellow/[0.06] hover:bg-neo-yellow/[0.1]' },
  cyan: { bar: 'bg-neo-cyan', ring: 'focus-visible:ring-neo-cyan', cta: 'bg-neo-cyan', tint: 'bg-neo-cyan/[0.06] hover:bg-neo-cyan/[0.1]' },
  purple: { bar: 'bg-neo-purple', ring: 'focus-visible:ring-neo-purple', cta: 'bg-neo-purple', tint: 'bg-neo-purple/[0.06] hover:bg-neo-purple/[0.1]' },
};

/** Per-mode glyph (registry stays presentation-light). */
const ICON: Partial<Record<DailyModeDef['id'], typeof Building2>> = {
  'word-tower': Building2,
  connections: Link2,
};

/** Per-mode mascot preview — same full-bleed treatment the public QuestCards use,
 *  so a beta mode reads as a real quest (game 3), not a compact afterthought. */
const PREVIEW: Partial<Record<DailyModeDef['id'], string>> = {
  'word-tower': '/daily/word-tower-mascot.jpg',
  connections: '/daily/connections-mascot.jpg',
};

/**
 * DailyModeQuestCard — renders a registry-driven daily mode in the hub.
 *
 * Registry-driven so a mode graduates from beta to public by flipping one
 * `adminOnly` boolean, with zero hub edits. Uses a plain hard-nav `<a>` (not the
 * SPA router) because Word Tower's daily run reads its mode from the `?daily=1`
 * query at mount — a client nav wouldn't re-read it. The "BETA" flask badge is
 * drawn ONLY for modes still gated to admins/beta (`mode.adminOnly`); a public
 * mode like Word Tower must read as a first-class quest. When the
 * mode has a mascot preview it renders full-bleed (QuestCard parity); otherwise a
 * compact icon-circle row (fallback for future modes without art).
 */
export function DailyModeQuestCard({ mode, locale, t, played = false, delay = 0.3 }: DailyModeQuestCardProps) {
  const accent = ACCENT[mode.accent];
  const Icon = ICON[mode.id] ?? Building2;
  const previewUrl = PREVIEW[mode.id];

  return (
    <m.a
      href={dailyModeHref(mode, locale)}
      // Opacity-only — y-slide moved the hit target on first press (same class
      // of bug as QuestCard START QUEST).
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      data-testid={`daily-quest-card-${mode.id}`}
      className={cn(
        'relative w-full rounded-xl border-3 border-neo-black',
        'shadow-hard overflow-hidden cursor-pointer p-4',
        'flex items-center gap-4',
        'focus-visible:outline-hidden focus-visible:ring-4 transition-all duration-200 group',
        previewUrl ? 'min-h-[130px] bg-neo-navy/95' : accent.tint,
        accent.ring,
      )}
      style={previewUrl ? { backgroundImage: `url(${previewUrl})`, backgroundSize: 'cover', backgroundPosition: 'center center' } : undefined}
    >
      {/* Legibility gradient over the mascot art (matches QuestCard). */}
      {previewUrl && (
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/98 via-slate-900/70 to-slate-900/30 pointer-events-none" />
      )}
      <div className={cn('absolute inset-e-0 top-0 bottom-0 w-1.5 rounded-e-lg', accent.bar)} />

      {/* Icon circle only when there's no mascot art to carry the visual. */}
      {!previewUrl && (
        <div
          className={cn(
            'w-12 h-12 rounded-full border-2 border-neo-black shrink-0',
            'flex items-center justify-center shadow-hard-xs',
            accent.bar,
          )}
        >
          {played
            ? <Check className="w-6 h-6 text-neo-black" strokeWidth={3} />
            : <Icon className="w-6 h-6 text-neo-black" strokeWidth={2.5} />}
        </div>
      )}

      <div className="relative z-10 flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xl font-neo-display font-black text-neo-white leading-none truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {t(mode.titleKey)}
          </h2>
          {played && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-black uppercase rounded border border-neo-cyan/50 bg-neo-cyan/20 text-neo-cyan shrink-0">
              <Check className="w-2.5 h-2.5" strokeWidth={3} />
              {t('daily.cleared')}
            </span>
          )}
          {mode.adminOnly && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black uppercase rounded border border-neo-purple/50 bg-neo-purple/20 text-neo-purple shrink-0">
              <FlaskConical className="w-2.5 h-2.5" />
              {t('daily.adminBeta')}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs font-neo-body text-neo-cream/80 line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t(mode.descKey)}</p>
      </div>

      <div
        className={cn(
          'relative z-10 shrink-0 py-2.5 px-5 text-xs font-black uppercase rounded-lg text-center',
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
