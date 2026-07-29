'use client';

import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLexiScore } from '@/hooks/useLexiScore';
import { TIER_COLORS, type LexiScoreTier } from '@/lib/lexiScore';

const TIER_LABELS: Record<LexiScoreTier, Record<string, string>> = {
  newcomer:     { en: 'Newcomer', he: 'מתחיל', sv: 'Nybörjare', ja: '新人', es: 'Novato' },
  wordsmith:    { en: 'Wordsmith', he: 'אומן מילים', sv: 'Ordmästare', ja: 'ワードスミス', es: 'Artesano' },
  linguist:     { en: 'Linguist', he: 'בלשן', sv: 'Lingvist', ja: '言語学者', es: 'Lingüista' },
  scholar:      { en: 'Scholar', he: 'חוקר', sv: 'Forskare', ja: '学者', es: 'Erudito' },
  master:       { en: 'Master', he: 'מאסטר', sv: 'Mästare', ja: 'マスター', es: 'Maestro' },
  grandmaster:  { en: 'Grandmaster', he: 'גרנדמאסטר', sv: 'Stormästare', ja: 'グランドマスター', es: 'Gran Maestro' },
  legend:       { en: 'Legend', he: 'אגדה', sv: 'Legend', ja: 'レジェンド', es: 'Leyenda' },
};

interface LexiScoreBadgeProps {
  /** Compact = inline pill, full = card with breakdown */
  variant?: 'compact' | 'full';
  className?: string;
}

/**
 * Displays the player's LexiClash Score as a neo-brutalist badge.
 * Compact: inline pill with score + tier.
 * Full: card with score breakdown.
 */
export function LexiScoreBadge({ variant = 'compact', className }: LexiScoreBadgeProps) {
  const { language } = useLanguage();
  const result = useLexiScore();

  if (!result) return null;

  const { total, tier, breakdown } = result;
  const colors = TIER_COLORS[tier];
  const tierLabel = TIER_LABELS[tier][language] ?? TIER_LABELS[tier].en;

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-neo border-2',
          'font-neo-display text-sm font-black',
          colors.bg, colors.border, colors.text,
          className
        )}
        title={`LexiClash Score: ${total.toLocaleString()}`}
      >
        <span className="text-xs opacity-70">LC</span>
        <span>{total.toLocaleString()}</span>
        <span className="text-[10px] uppercase opacity-60">{tierLabel}</span>
      </div>
    );
  }

  // Full variant — card with breakdown
  const breakdownItems = [
    { label: 'Level', value: breakdown.base },
    { label: 'Prestige', value: breakdown.prestige },
    { label: 'Words', value: breakdown.words },
    { label: 'Games', value: breakdown.games },
    { label: 'Streak', value: breakdown.streak },
    { label: 'Dedication', value: breakdown.daily },
    { label: 'Skill', value: breakdown.score },
  ].filter((item) => item.value > 0);

  return (
    <div
      className={cn(
        'rounded-neo border-3 border-neo-black p-4 shadow-hard',
        colors.bg,
        className
      )}
    >
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <span className={cn('font-neo-display text-3xl font-black', colors.text)}>
            {total.toLocaleString()}
          </span>
          <span className={cn('ms-2 text-sm font-bold uppercase', colors.text, 'opacity-60')}>
            {tierLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {breakdownItems.map(({ label, value }) => (
          <div
            key={label}
            className="bg-neo-navy/40 rounded-neo px-2 py-1 text-xs text-neo-white"
          >
            <span className="font-bold text-neo-white">+{value}</span>{' '}
            <span className="opacity-60">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
