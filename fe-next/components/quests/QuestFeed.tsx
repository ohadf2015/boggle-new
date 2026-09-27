'use client';

/**
 * QuestFeed — "Recent wins" social-proof strip. Shows the latest brag-worthy
 * quest completions across all players (PvP wins + Grand Slams) to nudge others
 * to chase the same goals. Polled via cached GET; renders nothing when empty.
 */

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getWithAuth } from '@/utils/authFetch';
import { cn } from '@/lib/utils';

interface FeedEntry {
  displayName: string;
  questId: string;
  family: string;
  createdAt: string;
}

export function QuestFeed() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<FeedEntry[]>([]);

  useEffect(() => {
    let alive = true;
    // getWithAuth sends the Bearer token so the route's local JWT verify fast-path
    // fires (plain fetch → no header → server falls back to slow remote verify).
    getWithAuth('/api/quests/feed')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (alive && json?.success && Array.isArray(json.entries)) {
          setEntries(json.entries.slice(0, 8));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (entries.length === 0) return null;

  const lineFor = (e: FeedEntry): string => {
    const key = e.family === 'grand_slam' ? 'quests.feed.grandSlam' : 'quests.feed.pvp';
    return t(key, { name: e.displayName });
  };

  return (
    <section
      className={cn(
        'p-3 rounded-neo-lg border-3 border-neo-black',
        'bg-neo-navy/40 shadow-hard',
      )}
      aria-label={t('quests.feed.title')}
    >
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-4 h-4 text-neo-yellow shrink-0" aria-hidden="true" />
        <h3 className="font-neo-display text-sm font-bold text-neo-white">
          {t('quests.feed.title')}
        </h3>
      </div>
      <ul className="flex flex-col gap-1.5">
        {entries.map((e, i) => (
          <li
            key={`${e.createdAt}-${i}`}
            className="font-neo-body text-xs text-neo-white/85 flex items-center gap-2"
          >
            <span
              className={cn(
                'inline-block w-1.5 h-1.5 rounded-full shrink-0',
                e.family === 'grand_slam' ? 'bg-neo-yellow' : 'bg-neo-pink',
              )}
              aria-hidden="true"
            />
            <span className="truncate">{lineFor(e)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
