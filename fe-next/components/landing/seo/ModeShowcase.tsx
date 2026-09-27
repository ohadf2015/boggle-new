'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';

/**
 * Mode Showcase — surfaces the (previously unused) `gameModes` data as solid,
 * color-blocked tiles so a player SEES the breadth of LexiClash instead of
 * reading a prose features list. Each mode wears one of the four brand families
 * as its own world; the first (real-time multiplayer) is emphasised full-width
 * to break the uniform-grid reflex. Static SSR content — all text in the DOM.
 */

export interface ShowcaseMode {
  title: string;
  tag: string;
  description: string;
}

interface ModeShowcaseProps {
  modes: ShowcaseMode[];
  heading: string;
  className?: string;
}

/* Per-mode brand world. Index 0 = multiplayer hero (pink), then cyan/lime/purple,
   cycling for any extras. Solid fills, hard black borders, ink-on-color text. */
const MODE_THEME = [
  { bg: 'bg-neo-pink', chip: 'bg-neo-black text-neo-pink' },
  { bg: 'bg-neo-cyan', chip: 'bg-neo-black text-neo-cyan' },
  { bg: 'bg-neo-lime', chip: 'bg-neo-black text-neo-lime' },
  { bg: 'bg-neo-purple', chip: 'bg-neo-black text-neo-purple' },
  { bg: 'bg-neo-yellow', chip: 'bg-neo-black text-neo-yellow' },
] as const;

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function ModeShowcase({ modes, heading, className }: ModeShowcaseProps) {
  if (!modes || modes.length === 0) return null;

  return (
    <section className={cn('w-full', className)}>
      <h2 className="text-xl sm:text-2xl font-black uppercase text-neo-white text-center mb-8 neo-title">
        {heading}
      </h2>
      <AdaptiveMotion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        {modes.map((mode, i) => {
          const theme = MODE_THEME[i % MODE_THEME.length];
          const featured = i === 0;
          return (
            <AdaptiveMotion.article
              key={mode.title}
              variants={item}
              className={cn(
                'group relative rounded-neo border-3 border-neo-black p-5 sm:p-6',
                'shadow-hard hover:shadow-hard-lg hover:-translate-y-1',
                'transition-all duration-200 overflow-hidden',
                theme.bg,
                featured && 'sm:col-span-2 sm:p-8'
              )}
            >
              <span
                className={cn(
                  'inline-block rounded-full px-3 py-1 mb-3',
                  'text-[11px] sm:text-xs font-black uppercase tracking-wide',
                  theme.chip
                )}
              >
                {mode.tag}
              </span>
              <h3
                className={cn(
                  'font-neo-display font-black text-neo-black leading-tight mb-1.5',
                  featured ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-2xl'
                )}
              >
                {mode.title}
              </h3>
              <p
                className={cn(
                  'font-neo-body font-semibold text-neo-black/80 leading-snug',
                  featured ? 'text-sm sm:text-base max-w-xl' : 'text-sm'
                )}
              >
                {mode.description}
              </p>
            </AdaptiveMotion.article>
          );
        })}
      </AdaptiveMotion.div>
    </section>
  );
}
