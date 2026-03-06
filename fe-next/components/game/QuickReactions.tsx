'use client';

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';

// ==================== Constants ====================

export interface Reaction {
  id: string;
  emoji: string;
  labelKey: string;
}

export const REACTIONS: Reaction[] = [
  { id: 'fire', emoji: '\u{1F525}', labelKey: 'reactions.fire' },
  { id: 'clap', emoji: '\u{1F44F}', labelKey: 'reactions.clap' },
  { id: 'wow', emoji: '\u{1F62E}', labelKey: 'reactions.wow' },
  { id: 'dead', emoji: '\u{1F480}', labelKey: 'reactions.dead' },
  { id: 'crown', emoji: '\u{1F451}', labelKey: 'reactions.crown' },
  { id: 'zap', emoji: '\u{2620}\u{FE0F}', labelKey: 'reactions.zap' },
];

// Fix: zap should be lightning bolt
REACTIONS[5] = { id: 'zap', emoji: '\u{26A1}', labelKey: 'reactions.zap' };

const THROTTLE_MS = 2000;
const FLOAT_DURATION_MS = 1500;

// ==================== FloatingReaction ====================

interface FloatingReactionProps {
  id: string;
  emoji: string;
  username: string;
  x: number;
  y: number;
  onComplete: (id: string) => void;
}

export const FloatingReaction = memo<FloatingReactionProps>(({
  id,
  emoji,
  username,
  x,
  y,
  onComplete,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(id), FLOAT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [id, onComplete]);

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -80, scale: 1.2 }}
      transition={{ duration: FLOAT_DURATION_MS / 1000, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        pointerEvents: 'none',
        zIndex: 50,
      }}
      className="flex flex-col items-center"
    >
      <span className="text-3xl" role="img">{emoji}</span>
      <span className="text-xs font-black text-neo-white bg-neo-black/70 px-1.5 py-0.5 rounded-neo border border-neo-white/20 whitespace-nowrap">
        {username}
      </span>
    </AdaptiveMotion.div>
  );
});

FloatingReaction.displayName = 'FloatingReaction';

// ==================== QuickReactions ====================

interface QuickReactionsProps {
  onReaction: (reactionId: string) => void;
  className?: string;
  /** 'bar' = horizontal row (mobile), 'vertical' = sidebar (desktop) */
  layout?: 'bar' | 'vertical';
}

export const QuickReactions = memo<QuickReactionsProps>(({
  onReaction,
  className = '',
  layout = 'bar',
}) => {
  const { t } = useLanguage();
  const lastReactionTimeRef = useRef(0);

  const handleClick = useCallback((reactionId: string) => {
    const now = Date.now();
    if (now - lastReactionTimeRef.current < THROTTLE_MS) return;
    lastReactionTimeRef.current = now;
    onReaction(reactionId);
  }, [onReaction]);

  return (
    <div
      role="toolbar"
      aria-label={t('reactions.label')}
      className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-row'} gap-1.5 ${className}`}
    >
      {REACTIONS.map((reaction) => (
        <AdaptiveMotion.button
          key={reaction.id}
          whileTap={{ scale: 0.85 }}
          onClick={() => handleClick(reaction.id)}
          aria-label={t(reaction.labelKey)}
          className="w-9 h-9 flex items-center justify-center text-lg
            bg-neo-navy/80 border-2 border-neo-white/20 rounded-neo
            hover:border-neo-yellow hover:bg-neo-navy
            active:shadow-hard-pressed transition-colors"
        >
          {reaction.emoji}
        </AdaptiveMotion.button>
      ))}
    </div>
  );
});

QuickReactions.displayName = 'QuickReactions';

export default QuickReactions;
