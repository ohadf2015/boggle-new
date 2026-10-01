'use client';

/** No student played (a bots-only practice run, or everyone left): say so plainly, and point at the code. */
export function EmptyRoundCard({ t }: { t: (key: string) => string }) {
  return (
    <div
      data-testid="empty-round-card"
      className="flex items-center gap-3 md:gap-6 rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-elevated p-3 md:p-6 shadow-hard-lg"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static decorative mascot */}
      <img
        src="/mascot/teacher/hero-empty-classroom.webp"
        alt=""
        aria-hidden="true"
        className="size-20 md:size-40 shrink-0 object-contain motion-safe:animate-neo-wobble"
      />
      <span className="flex min-w-0 flex-col gap-1 md:gap-2 text-start">
        <span dir="auto" className="font-neo-display font-black uppercase leading-tight text-neo-cyan text-lg md:text-4xl">
          {t('eduLive.results.emptyHeadline')}
        </span>
        <span dir="auto" className="font-neo-body font-bold leading-snug text-neo-cream/90 text-sm md:text-2xl">
          {t('eduLive.results.emptyBody')}
        </span>
      </span>
    </div>
  );
}

export default EmptyRoundCard;
