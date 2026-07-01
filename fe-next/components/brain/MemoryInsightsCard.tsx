'use client';

import { useEffect, useState } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Brain, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWithAuth } from '@/utils/authFetch';
import type { MemoryInsights } from '@/shared/utils/memoryInsights';

interface MemoryInsightsCardProps {
  t: (key: string) => string;
}

/**
 * Post-game "how your memory is trending" card. Fetches real week-over-week
 * data; renders the single most motivating TRUE statement. Hides itself for
 * guests (401) or when there's nothing honest to say yet.
 */
export function MemoryInsightsCard({ t }: MemoryInsightsCardProps) {
  const [data, setData] = useState<MemoryInsights | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    // getWithAuth sends the Bearer token so the route's local JWT verify fast-path
    // fires (plain fetch → no header → server falls back to slow remote verify).
    getWithAuth('/api/brain/memory-insights', { signal: ac.signal })
      .then(r => (r.ok ? r.json() : null))
      .then((d: MemoryInsights | null) => setData(d))
      .catch(() => {})
      .finally(() => setDone(true));
    return () => ac.abort();
  }, []);

  if (!done || !data) return null;

  const { hasBaseline, words, memory } = data;
  const wordsUp = Math.round(words?.deltaAbs ?? 0);

  // Pick ONE headline — the most motivating true thing. Order: memory % up →
  // words up → first-week → honest comeback → steady.
  let icon = <Brain className="w-5 h-5 text-neo-purple" />;
  let line: string;

  if (hasBaseline && memory?.deltaPct != null && memory.deltaPct > 0) {
    icon = <TrendingUp className="w-5 h-5 text-neo-lime" />;
    line = t('brain.insights.memoryUp').replace('{pct}', String(memory.deltaPct));
  } else if (hasBaseline && words && wordsUp >= 1) {
    icon = <Sparkles className="w-5 h-5 text-neo-lime" />;
    line = t('brain.insights.wordsUp').replace('{n}', String(wordsUp));
  } else if (!hasBaseline) {
    line = t('brain.insights.firstWeek');
  } else if (memory?.deltaPct != null && memory.deltaPct < 0) {
    line = t('brain.insights.comeback');
  } else {
    line = t('brain.insights.steady');
  }

  // Nothing recorded at all → don't render an empty shell.
  if (!words && !memory) return null;

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85 }}
      className={cn(
        'max-w-xs mx-auto p-4 rounded-neo border-3 border-neo-black shadow-hard',
        'bg-neo-purple text-neo-black text-left',
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="flex items-center justify-center w-8 h-8 rounded-neo border-2 border-neo-black bg-neo-cream shrink-0">
          {icon}
        </span>
        <span className="text-[0.7rem] font-black uppercase tracking-widest text-neo-black/70">
          {t('brain.insights.title')}
        </span>
      </div>
      <p className="text-sm font-bold leading-snug text-neo-black">{line}</p>
      {memory && memory.deltaPct != null && hasBaseline && (
        <p className="mt-1 text-xs font-medium text-neo-black/70">
          {t('brain.insights.memoryScore').replace('{score}', String(memory.thisWeek))}
        </p>
      )}
    </AdaptiveMotion.div>
  );
}

export default MemoryInsightsCard;
