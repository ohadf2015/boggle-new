import { useId } from 'react';
import { cn } from '@/lib/utils';
import { SectionHeading } from './SectionHeading';
import type { Typo } from './typography';

const CARD_STYLES = [
  'bg-neo-lime -rotate-1',
  'bg-neo-cyan rotate-1',
  'bg-neo-pink -rotate-1',
  'bg-neo-purple rotate-1',
];

interface StepCardsProps {
  heading: string;
  items: { title: string; body: string }[];
  typo: Typo;
}

export function StepCards({ heading, items, typo }: StepCardsProps) {
  const headingId = useId();
  return (
    <section className="mt-20 sm:mt-24">
      <SectionHeading id={headingId} typo={typo} accent="lime">
        {heading}
      </SectionHeading>
      <ol aria-labelledby={headingId} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {items.map((step, i) => (
          <li
            key={step.title}
            className={cn(
              'relative flex flex-col rounded-neo-lg border-neo-thick border-neo-black p-5 pt-6 text-neo-black shadow-hard-xl transition-transform duration-150 hover:-translate-y-1 hover:rotate-0',
              CARD_STYLES[i % CARD_STYLES.length]
            )}
          >
            <span
              aria-hidden="true"
              className="mb-4 grid h-12 w-12 place-items-center rounded-neo border-neo-thick border-neo-black bg-neo-navy font-neo-display text-2xl font-black text-neo-white shadow-hard"
            >
              {i + 1}
            </span>
            <h3 className={cn('text-xl leading-tight', typo.display)}>{step.title}</h3>
            <p className={cn('mt-2 text-base font-medium leading-relaxed', typo.body)}>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
