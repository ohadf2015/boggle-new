import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { QUICK_PLAY_PATH, noAccountCopy, type NoAccountCopy } from '@/components/education/NoAccountCta';

/** The zero-signup join path as a quiet paper card: the hero already owns the lime button. */
export function NoAccountCard({ locale, copy }: { locale: string; copy?: NoAccountCopy }) {
  const c = copy ?? noAccountCopy(locale);
  return (
    <div
      data-testid="no-account-cta"
      className="flex flex-col gap-3 rounded-neo-lg border-3 border-neo-black bg-neo-cream p-4 text-neo-black shadow-hard-xl sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <p className="font-neo-display text-lg font-bold leading-snug">{c.heading}</p>
        <p className="text-[15px] leading-relaxed">{c.body}</p>
        <p className="text-xs font-bold text-neo-black/65">{c.note}</p>
      </div>
      <Link
        data-lc-cta="play_now"
        href={`/${locale}${QUICK_PLAY_PATH}`}
        className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border-3 border-neo-black bg-neo-yellow px-4 py-1.5 font-neo-display text-base font-bold shadow-hard-lg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-black motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 sm:self-center"
      >
        {c.cta}
        <DirectionalIcon icon={ArrowRight} className="size-4" />
      </Link>
    </div>
  );
}
