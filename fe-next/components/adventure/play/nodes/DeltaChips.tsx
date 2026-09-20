'use client';

/**
 * The ledger a node hands back: one chip per thing that really changed, green
 * for a gain, pink for a cost. Relic / potion lines carry a name KEY, resolved
 * here so the six locales all read their own item names.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { Line } from './nodeText';
import { cn } from '@/lib/utils';

export function useLineText() {
  const { t } = useLanguageSafe();
  return (line: Line) => {
    const params = line.params
      ? { ...line.params, ...(typeof line.params.name === 'string' ? { name: t(String(line.params.name)) } : {}) }
      : undefined;
    return t(line.key, params);
  };
}

export default function DeltaChips({ lines, size = 'md', testId }: { lines: Line[]; size?: 'sm' | 'md'; testId?: string }) {
  const lineText = useLineText();
  const reduce = useReducedMotion();
  return (
    <div data-testid={testId} className="flex flex-wrap items-center justify-center gap-1.5">
      {lines.map((line, i) => (
        <motion.span
          key={`${line.key}-${i}`}
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18, delay: reduce ? 0 : 0.08 * i }}
          className={cn('rounded-lg border-[3px] border-black px-2 py-0.5 font-neo-display font-bold text-black shadow-[3px_3px_0_#000]',
            size === 'sm' ? 'text-xs' : 'text-base',
            line.tone === 'bad' ? 'bg-neo-pink' : 'bg-neo-lime')}
        >
          {lineText(line)}
        </motion.span>
      ))}
    </div>
  );
}
