import Image from 'next/image';
import Link from 'next/link';
import { ARCADE_GAMES, gamesFor, type ArcadeGameId } from '@/lib/holidays/arcade/games';
import type { HolidayKey } from '@/lib/holidays/calendar';
import type { LandingFaq } from '@/lib/holidays/landing';
import type { LandingCopy } from '@/lib/holidays/landingCopy';
import styles from './landing.module.css';

const H2 = 'mb-5 font-neo-display text-2xl font-black sm:text-3xl';

export function FeatureSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="mt-12">
      <h2 className={H2}>{copy.insideTitle}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {copy.features.map((f) => (
          <article key={f.title} className={`${styles.feature} flex gap-4 rounded-neo-lg border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard`}>
            <Image src={f.art} alt="" width={96} height={96} className="h-20 w-20 shrink-0 object-contain" />
            <div>
              <h3 className="mb-1 text-lg font-black text-neo-cream">{f.title}</h3>
              <p className="text-sm leading-relaxed text-neo-gray-200">{f.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CoverCard({ id, copy }: { id: ArcadeGameId; copy: LandingCopy }) {
  const game = copy.arcade[id];
  return (
    <>
      <div className="relative aspect-square overflow-hidden border-b-3 border-neo-black">
        <Image src={ARCADE_GAMES[id].cover} alt="" fill sizes="(min-width: 640px) 300px, 100vw" className={`${styles.cover} object-cover`} />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-black">{game?.name}</h3>
        <p className="mt-1 text-sm text-neo-gray-200">{game?.blurb}</p>
      </div>
    </>
  );
}

interface ArcadeProps {
  copy: LandingCopy;
  holiday: HolidayKey;
  locale: string;
  live: boolean;
}

export function ArcadeSection({ copy, holiday, locale, live }: ArcadeProps) {
  const card = `${styles.coverCard} block overflow-hidden rounded-neo-lg border-3 border-neo-black bg-neo-navy-light shadow-hard`;
  return (
    <section data-testid="holiday-landing-arcade" className="mt-12">
      <h2 className={H2}>{copy.arcadeTitle}</h2>
      <p className="mb-5 text-neo-gray-200">
        {copy.arcadeBody}
        {!live && <strong className="ms-2 inline-block rounded-neo-pill bg-neo-holiday-snow px-3 py-0.5 text-sm text-neo-navy">{copy.arcadeOff}</strong>}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {gamesFor(holiday).filter((id) => copy.arcade[id]).map((id) =>
          live ? (
            <Link key={id} href={`/${locale}/holiday-arcade?g=${id}&holiday=${holiday}`} className={`${card} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream`}>
              <CoverCard id={id} copy={copy} />
            </Link>
          ) : (
            <div key={id} className={card}>
              <CoverCard id={id} copy={copy} />
            </div>
          ),
        )}
      </div>
    </section>
  );
}

export function EggSection({ copy }: { copy: LandingCopy }) {
  return (
    <section className="mt-12 rounded-neo-lg border-3 border-dashed border-neo-cream/60 p-5">
      <h2 className="mb-2 font-neo-display text-xl font-black text-neo-cream">{copy.eggTitle}</h2>
      <p className="text-neo-gray-200">{copy.eggBody}</p>
    </section>
  );
}

export function FaqSection({ title, faqs }: { title: string; faqs: LandingFaq[] }) {
  return (
    <section className="mt-12">
      <h2 className={H2}>{title}</h2>
      <div className="space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="group rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard-sm">
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-bold">
              <span>{f.q}</span>
              <span aria-hidden className="text-neo-cream transition-transform group-open:rotate-180 motion-reduce:transition-none">▼</span>
            </summary>
            <p className="border-t-2 border-neo-black px-5 py-4 text-neo-gray-200">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

interface ClosingProps {
  copy: LandingCopy;
  ctaHref: string;
  ctaLabel: string;
  ctaClass: string;
}

export function ClosingSection({ copy, ctaHref, ctaLabel, ctaClass }: ClosingProps) {
  return (
    <section className="mt-12 rounded-neo-xl border-4 border-neo-black bg-neo-navy-light p-6 text-center shadow-hard-lg sm:p-10">
      <h2 className="font-neo-display text-2xl font-black sm:text-3xl">{copy.closingTitle}</h2>
      <p className="mx-auto mt-3 max-w-xl text-neo-gray-200">{copy.closingBody}</p>
      <Link href={ctaHref} className={`mt-6 inline-block rounded-neo border-4 border-neo-black px-8 py-4 font-black shadow-hard transition-[box-shadow] hover:shadow-hard-lg ${ctaClass}`}>
        {ctaLabel}
      </Link>
    </section>
  );
}
