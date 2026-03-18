'use client';

import { useEffect, useState } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Zap, Swords, Trophy } from 'lucide-react';
import { useBlastOpponentActivity } from '@/hooks/gameState/store';

/**
 * BlastOpponentFeed — Subtle scrolling ticker showing opponent actions in multiplayer blast.
 * Shows word finds, combos, and score milestones without blocking gameplay.
 * Auto-dismisses items after 3 seconds. Max 3 visible at once.
 */
export function BlastOpponentFeed() {
  const activity = useBlastOpponentActivity();
  const [visible, setVisible] = useState<typeof activity>([]);

  // When new events arrive, show them and auto-dismiss after 3s
  useEffect(() => {
    if (activity.length === 0) return;
    const latest = activity[activity.length - 1];
    if (!latest) return;

    setVisible(prev => {
      // Avoid duplicates
      if (prev.some(e => e.id === latest.id)) return prev;
      return [...prev.slice(-2), latest];
    });

    const timer = setTimeout(() => {
      setVisible(prev => prev.filter(e => e.id !== latest.id));
    }, 3000);

    return () => clearTimeout(timer);
  }, [activity]);

  if (visible.length === 0) return null;

  return (
    <div className="absolute top-0 inset-x-0 z-40 pointer-events-none flex flex-col items-center gap-0.5 px-2 pt-1">
      <AdaptiveAnimatePresence mode="popLayout">
        {visible.map(event => (
          <AdaptiveMotion.div
            key={event.id}
            layout
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={{ opacity: 0.85, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white/90 max-w-[280px] truncate"
          >
            {event.type === 'word' && (
              <>
                <Swords className="w-3 h-3 text-neo-yellow shrink-0" />
                <span className="text-neo-yellow">{event.username}</span>
                <span className="text-white/60">found</span>
                <span className="uppercase tracking-wide">{event.word}</span>
                {event.comboLevel && event.comboLevel >= 3 && (
                  <span className="text-neo-orange">x{event.comboLevel}</span>
                )}
              </>
            )}
            {event.type === 'combo' && (
              <>
                <Zap className="w-3 h-3 text-neo-orange shrink-0" />
                <span className="text-neo-orange">{event.username}</span>
                <span className="text-white/60">combo!</span>
              </>
            )}
            {event.type === 'milestone' && (
              <>
                <Trophy className="w-3 h-3 text-neo-lime shrink-0" />
                <span className="text-neo-lime">{event.username}</span>
                <span>{event.message}</span>
              </>
            )}
          </AdaptiveMotion.div>
        ))}
      </AdaptiveAnimatePresence>
    </div>
  );
}
