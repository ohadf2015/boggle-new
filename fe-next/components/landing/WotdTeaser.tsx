'use client';

/**
 * WotdTeaser — Landing page teaser for Word of the Day.
 * Shows first letter only, rest blurred/masked. Links to /daily.
 */

import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWordOfTheDay } from '@/hooks/useWordOfTheDay';

interface WotdTeaserProps {
  className?: string;
}

/**
 * Landing page Word of the Day teaser.
 * Shows the first letter with remaining letters masked.
 * Links to the daily challenge to play.
 */
export function WotdTeaser({ className }: WotdTeaserProps) {
  const { t, language, dir } = useLanguage();
  const { word, loading } = useWordOfTheDay(language);
  const isRTL = dir === 'rtl';

  if (loading || !word) return null;

  // For RTL languages, show the LAST letter (rightmost = first visually)
  const revealLetter = isRTL
    ? word.charAt(word.length - 1)
    : word.charAt(0).toUpperCase();
  const maskedCount = word.length - 1;
  const maskedChars = '_ '.repeat(maskedCount).trim();

  return (
    <Link
      href="/daily"
      data-testid="wotd-teaser"
      className={cn(
        'block rounded-neo border-neo border-neo-yellow/40 bg-neo-navy/80',
        'p-4 shadow-hard-sm hover:shadow-hard transition-shadow',
        'group cursor-pointer',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 rounded-neo bg-neo-yellow/20 border-neo border-neo-yellow/30 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-neo-yellow group-hover:animate-neo-wobble" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-neo-display font-bold text-neo-yellow/80 uppercase tracking-wider mb-0.5">
            {t('wotd.teaser')}
          </p>

          <div className="flex items-center gap-1.5" dir={dir}>
            {isRTL ? (
              <>
                <span
                  data-testid="wotd-masked"
                  className="text-lg font-neo-display text-white tracking-[0.3em]"
                >
                  {maskedChars}
                </span>
                <span
                  data-testid="wotd-first-letter"
                  className="text-xl font-neo-display font-bold text-neo-white"
                >
                  {revealLetter}
                </span>
              </>
            ) : (
              <>
                <span
                  data-testid="wotd-first-letter"
                  className="text-xl font-neo-display font-bold text-neo-white"
                >
                  {revealLetter}
                </span>
                <span
                  data-testid="wotd-masked"
                  className="text-lg font-mono text-white tracking-[0.3em]"
                >
                  {maskedChars}
                </span>
              </>
            )}
          </div>
        </div>

        <span className="text-xs font-neo-body text-neo-cyan group-hover:underline shrink-0">
          {t('wotd.play')}
        </span>
      </div>
    </Link>
  );
}

export default WotdTeaser;
