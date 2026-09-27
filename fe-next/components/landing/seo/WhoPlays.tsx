'use client';

import { Smartphone, ShieldCheck, GraduationCap, PartyPopper } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Mascot } from '@/components/ui/Mascot';
import { cn } from '@/lib/utils';

/**
 * Who Plays — surfaces the (previously unused) `whoCanPlayCards` as a warm,
 * conversational "this is for you" band rather than another icon-card grid.
 * Each audience is a row: a coloured icon badge + label + a plain-spoken detail.
 * The mascot anchors the section so it reads as personality, not a spec sheet.
 * Static SSR content — every label/detail is in the DOM.
 */

export interface WhoPlaysCard {
  label: string;
  detail: string;
}

interface WhoPlaysProps {
  cards: WhoPlaysCard[];
  heading: string;
  className?: string;
}

const ROW_ICONS = [Smartphone, ShieldCheck, GraduationCap, PartyPopper];
const ROW_ACCENT = ['text-neo-cyan', 'text-neo-lime', 'text-neo-purple', 'text-neo-pink'] as const;
const ROW_BADGE = ['bg-neo-cyan/15', 'bg-neo-lime/15', 'bg-neo-purple/15', 'bg-neo-pink/15'] as const;

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 1, x: 0 }, visible: { opacity: 1, x: 0, transition: { duration: 0.35 } } };

export function WhoPlays({ cards, heading, className }: WhoPlaysProps) {
  if (!cards || cards.length === 0) return null;

  return (
    <section className={cn('w-full', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
        {/* Mascot + heading rail */}
        <div className="flex sm:flex-col items-center sm:items-start gap-4 sm:gap-3 sm:w-56 shrink-0">
          <Mascot variant="explorer" size="lg" animated priority={false} className="shrink-0" />
          <h2 className="text-xl sm:text-2xl font-black uppercase text-neo-white leading-tight neo-title">
            {heading}
          </h2>
        </div>

        {/* Conversational rows */}
        <AdaptiveMotion.ul
          className="flex-1 space-y-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          {cards.map((card, i) => {
            const Icon = ROW_ICONS[i % ROW_ICONS.length];
            return (
              <AdaptiveMotion.li
                key={card.label}
                variants={item}
                className="flex items-start gap-3 sm:gap-4"
              >
                <span
                  className={cn(
                    'shrink-0 w-10 h-10 rounded-neo border-2 border-neo-black flex items-center justify-center',
                    ROW_BADGE[i % ROW_BADGE.length]
                  )}
                >
                  <Icon className={cn('w-5 h-5', ROW_ACCENT[i % ROW_ACCENT.length])} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-neo-display font-black text-base sm:text-lg text-neo-white leading-tight">
                    {card.label}
                  </h3>
                  <p className="font-neo-body text-sm text-neo-cream/85 leading-snug">
                    {card.detail}
                  </p>
                </div>
              </AdaptiveMotion.li>
            );
          })}
        </AdaptiveMotion.ul>
      </div>
    </section>
  );
}
