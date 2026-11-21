import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionHeading } from './SectionHeading';
import type { Typo } from './typography';

const ACCENTS = ['shadow-hard-pink', 'shadow-hard-cyan', 'shadow-hard-lime', 'shadow-hard-purple'];

interface WaitlistFaqProps {
  heading: string;
  faqs: { q: string; a: string }[];
  typo: Typo;
}

export function WaitlistFaq({ heading, faqs, typo }: WaitlistFaqProps) {
  return (
    <section className="mt-20 sm:mt-24">
      <SectionHeading typo={typo} accent="cyan">
        {heading}
      </SectionHeading>
      <div className="space-y-4">
        {faqs.map((f, i) => (
          <details
            key={f.q}
            open={i === 0}
            className={cn('group rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy-light', ACCENTS[i % ACCENTS.length])}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-neo-lg px-5 py-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan [&::-webkit-details-marker]:hidden">
              <span className={cn('text-lg leading-snug text-neo-white', typo.display)}>{f.q}</span>
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-neo border-neo-thick border-neo-black bg-neo-navy text-neo-pink shadow-hard-sm motion-safe:transition-transform motion-safe:duration-200 group-open:rotate-180"
              >
                <ChevronDown className="h-5 w-5" />
              </span>
            </summary>
            <p className={cn('border-t-2 border-dashed border-neo-white/20 px-5 py-4 text-base leading-relaxed text-neo-white', typo.body)}>
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
