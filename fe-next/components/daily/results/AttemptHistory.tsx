/**
 * AttemptHistory Component
 * Collapsible Wordle-style attempt history grid
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WordHuntResult } from '@/utils/dailyChallenge';

export interface AttemptHistoryProps {
  attempts: WordHuntResult['attempts'];
  attemptsUsed: number;
  t: (key: string) => string;
}

export const AttemptHistory: React.FC<AttemptHistoryProps> = ({
  attempts,
  attemptsUsed,
  t,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (attempts.length === 0) return null;

  return (
    <div className="rounded-neo border-2 border-neo-black overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      >
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
          {t('wordHunt.title')} - {attemptsUsed} {t('common.attempts')}
        </span>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-2.5 space-y-0.5 bg-white dark:bg-slate-800 text-neo-black dark:text-neo-white">
              {attempts.map((attempt, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08, type: 'spring', stiffness: 400, damping: 25 }}
                  className="flex items-center justify-center gap-1.5"
                >
                  <span className="text-[10px] text-gray-700 dark:text-gray-400 w-5">{idx + 1}.</span>
                  <div className="flex gap-0.5">
                    {attempt.feedback.map((letterFb, letterIdx) => (
                      <motion.div
                        key={letterIdx}
                        initial={{ scale: 0, rotateX: -90 }}
                        animate={{ scale: 1, rotateX: 0 }}
                        transition={{
                          delay: idx * 0.08 + letterIdx * 0.04,
                          type: 'spring',
                          stiffness: 500,
                          damping: 20,
                        }}
                        className={cn(
                          "w-7 h-7 flex items-center justify-center font-bold text-white rounded border border-neo-black text-sm",
                          letterFb.feedback === 'green' && "bg-green-500",
                          letterFb.feedback === 'yellow' && "bg-yellow-500",
                          letterFb.feedback === 'gray' && "bg-gray-400"
                        )}
                      >
                        {letterFb.letter}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AttemptHistory;
