'use client';

import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Target, Gem, Zap, Check, Snowflake, Bomb, Type, Star } from 'lucide-react';
import type { BlastObjectiveProgress, BlastObjectiveType, BlastTileType } from './types';

interface BlastObjectiveDisplayProps {
  objectiveProgress: BlastObjectiveProgress[];
  t: (key: string) => string | undefined;
}

/** Icon for each tile type used in objectives */
function ObjectiveIcon({ type, tileType }: { type: BlastObjectiveType; tileType?: BlastTileType }) {
  if (type === 'word_length') return <Type className="w-4 h-4" />;
  if (type === 'score_target') return <Star className="w-4 h-4" />;

  switch (tileType) {
    case 'gem': return <Gem className="w-4 h-4" />;
    case 'lightning': return <Zap className="w-4 h-4" />;
    case 'ice': case 'frozen': return <Snowflake className="w-4 h-4" />;
    case 'bomb': return <Bomb className="w-4 h-4" />;
    default: return <Target className="w-4 h-4" />;
  }
}

export function BlastObjectiveDisplay({ objectiveProgress, t }: BlastObjectiveDisplayProps) {
  if (objectiveProgress.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <AdaptiveAnimatePresence>
        {objectiveProgress.map((progress, idx) => {
          const { objective, current, isComplete } = progress;
          const displayTarget = objective.target;
          const displayCurrent = Math.min(current, displayTarget);

          return (
            <AdaptiveMotion.div
              key={`obj-${idx}`}
              className={`flex items-center gap-2 px-2 py-1 rounded-neo text-xs
                ${isComplete ? 'bg-green-900/40 text-green-300' : 'bg-neo-navy/60 text-neo-white/80'}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: isComplete ? [1, 1.08, 1] : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              {isComplete ? (
                <Check className="w-4 h-4 text-green-400 shrink-0" />
              ) : (
                <ObjectiveIcon type={objective.type} tileType={objective.tileType} />
              )}

              <div className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300
                      ${isComplete ? 'bg-green-400' : 'bg-neo-yellow'}`}
                    style={{ width: `${displayTarget > 0 ? (displayCurrent / displayTarget) * 100 : 100}%` }}
                  />
                </div>
              </div>

              <span className="font-mono text-[10px] shrink-0 tabular-nums">
                {current}/{displayTarget}
              </span>
            </AdaptiveMotion.div>
          );
        })}
      </AdaptiveAnimatePresence>
    </div>
  );
}
