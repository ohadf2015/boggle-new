import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MAX_PLAYERS_PER_ROOM, ROOM_CODE_LENGTH } from '@/shared/constants/gameConstants';
import {
  AD_CLAIM,
  CROSS_LINKS,
  HOW_TO_STEPS,
  PAIN_POINTS,
  STATS,
  STICKER_BADGES,
  compareRows,
  faqs,
} from './content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_URL = `${BASE_URL}/en/boggle-with-friends-alternative`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';

  return {
    title: 'Boggle With Friends Alternative — No Pay-to-Win | LexiClash',
    description:
      'Free Boggle With Friends alternative: real-time multiplayer in your browser, no pay-to-win power-ups, no download, no signup. Play in 10 seconds.',
    keywords:
      'boggle with friends alternative, multiplayer word game no ads, alternative to boggle with friends, real time multiplayer word game, boggle online with friends free, word game without power-ups, free boggle multiplayer browser, play boggle with friends online, word grid game no download, multiplayer boggle no app',
    openGraph: {
      title: 'Boggle With Friends Alternative — Real-Time, No Power-Ups | LexiClash',
      description:
        'A shared letter grid, everyone racing at once, in a browser tab. No install, no account, nothing to buy that changes your score.',
      locale: 'en_US',
      type: 'website',
      url: PAGE_URL,
      images: [
        { url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash — a Boggle With Friends alternative' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Boggle With Friends Alternative — No Pay-to-Win | LexiClash',
      description: 'Real-time word grid battles in a browser tab. No install, no account, no boosts for sale.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: PAGE_URL,
      languages: {
        'x-default': PAGE_URL,
        en: PAGE_URL,
      },
    },
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
});

const videoGameJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'LexiClash',
  alternateName: ['LexiClash Word Battle', 'LexiClash Multiplayer Word Game'],
  url: PAGE_URL,
  description:
    'Free real-time multiplayer word game played in a browser — a Boggle With Friends alternative where everyone races the same letter grid at once. No install, no account, and no power-ups for sale in multiplayer rooms.',
  image: `${BASE_URL}/og-image-en.webp`,
  genre: ['Word Game', 'Puzzle', 'Multiplayer', 'Casual'],
  gamePlatform: ['Web Browser', 'iOS', 'Android', 'PWA'],
  playMode: ['MultiPlayer', 'SinglePlayer'],
  numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: MAX_PLAYERS_PER_ROOM },
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any (Web Browser)',
  inLanguage: ['en', 'he', 'sv', 'ja', 'es', 'ru'],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    url: `${BASE_URL}/en/multiplayer`,
  },
  publisher: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
});

const howToJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to play a Boggle With Friends alternative in your browser',
  description: 'Start a real-time word grid match with friends in about ten seconds. No download, no account.',
  totalTime: 'PT10S',
  step: HOW_TO_STEPS.map((s) => ({ '@type': 'HowToStep', name: s.title, text: s.desc })),
});

const breadcrumbJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/en` },
    { '@type': 'ListItem', position: 2, name: 'Compare Word Games', item: `${BASE_URL}/en/best-online-word-games` },
    { '@type': 'ListItem', position: 3, name: 'Boggle With Friends Alternative', item: PAGE_URL },
  ],
});

export default async function BoggleWithFriendsAlternativePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <script id="ld-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script id="ld-videogame" type="application/ld+json" dangerouslySetInnerHTML={{ __html: videoGameJsonLd }} />
      <script id="ld-howto" type="application/ld+json" dangerouslySetInnerHTML={{ __html: howToJsonLd }} />
      <script id="ld-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />

      {/* STICKER MARQUEE */}
      <div className="border-y-3 border-neo-black bg-neo-pink overflow-hidden">
        <div className="flex animate-[scroll_30s_linear_infinite] gap-6 whitespace-nowrap py-2 font-neo-display text-sm font-black uppercase tracking-widest text-neo-white sm:text-base">
          {[...STICKER_BADGES, ...STICKER_BADGES, ...STICKER_BADGES].map((b, i) => (
            <span key={`b-${i}`} className="inline-flex items-center gap-3">
              <span>★</span>
              <span>{b}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">

        {/* HERO */}
        <section className="relative grid items-center gap-10 lg:grid-cols-12">
          <div className="relative lg:col-span-7">
            <span className="inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy shadow-hard">
              ★ Free · Real-Time · Browser ★
            </span>
            <h1 className="mt-5 font-neo-display text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              The <span className="inline-block rotate-[-2deg] bg-neo-pink px-3 text-neo-white shadow-hard">Boggle</span>
              <br />
              <span className="inline-block rotate-[1deg] bg-neo-lime px-3 text-neo-navy shadow-hard">With Friends</span>
              <br />
              alternative — <span className="text-neo-cyan">no boosts</span>.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neo-gray-200 sm:text-xl">
              One shared letter grid, everyone searching it at the same moment, in a browser tab. Nothing to install,
              nobody to sign up as, and
              <em className="not-italic font-bold text-neo-lime"> nothing you can buy that changes the score</em>.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href={`/${locale}/multiplayer`}
                className="group rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard-lg transition-[translate,scale,rotate,transform,box-shadow] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
              >
                <span className="block text-base sm:text-lg">▶ Start a room free</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80">No download · No signup · ~10 sec</span>
              </Link>
              <Link
                href={`/${locale}/daily`}
                className="rounded-neo border-4 border-neo-black bg-neo-lime px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard transition-[translate,scale,rotate,transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:px-7"
              >
                <span className="block text-base sm:text-lg">★ Try today&apos;s puzzle</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">Solo · A few minutes</span>
              </Link>
            </div>

            <p className="mt-7 max-w-xl text-sm leading-relaxed text-neo-gray-300">{AD_CLAIM}</p>
          </div>

          <div className="relative lg:col-span-5">
            <div className="relative mx-auto aspect-square w-full max-w-md rotate-[-2deg] rounded-neo border-4 border-neo-black bg-neo-navy-light p-6 shadow-hard-xl sm:max-w-none">
              <div className="absolute inset-3 grid grid-cols-4 gap-2 rounded-neo border-3 border-neo-black bg-neo-navy p-3">
                {['B', 'O', 'G', 'G', 'L', 'E', 'F', 'R', 'E', 'E', 'N', 'O', 'A', 'D', 'S', 'X'].map((ch, i) => (
                  <div
                    key={`${ch}-${i}`}
                    className={`grid place-items-center rounded border-2 border-neo-black font-neo-display text-2xl font-black shadow-hard-sm ${i % 5 === 0 ? 'bg-neo-lime text-neo-navy' : i % 4 === 0 ? 'bg-neo-pink text-neo-white' : i % 3 === 0 ? 'bg-neo-cyan text-neo-navy' : 'bg-neo-cream text-neo-navy'}`}
                    style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
                  >{ch}</div>
                ))}
              </div>
              <span className="absolute -left-3 -top-3 inline-block rotate-[-12deg] border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard">FREE!</span>
              <span className="absolute -bottom-3 -right-3 inline-block rotate-[8deg] border-3 border-neo-black bg-neo-pink px-3 py-1 font-neo-display text-sm font-black uppercase text-neo-white shadow-hard">{MAX_PLAYERS_PER_ROOM} PER ROOM</span>
              <div className="absolute -right-4 top-1/3 hidden h-20 w-20 lg:block">
                <Image src="/mascot/dj.webp" alt="" fill sizes="80px" className="object-contain" />
              </div>
            </div>
          </div>
        </section>

        {/* STATS STRIP */}
        <section className="relative mt-16 overflow-hidden rounded-neo border-4 border-neo-black bg-neo-navy-light shadow-hard-lg">
          <div className="absolute inset-0 texture-halftone-comic-light opacity-60" aria-hidden="true" />
          <div className="relative grid grid-cols-2 gap-4 p-6 sm:grid-cols-4 sm:p-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className={`font-neo-display text-4xl font-black sm:text-5xl ${s.color}`}>{s.value}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-widest text-neo-gray-200">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* WHAT PLAYERS LEAVE BEHIND */}
        <section className="mt-20">
          <h2 className="mb-2 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            What you <span className="text-neo-pink">leave behind</span>.
          </h2>
          <p className="mb-8 max-w-2xl text-neo-gray-200">
            The grid-and-timer part of Boggle With Friends is genuinely good. The parts people complain about are
            everything wrapped around it — so this is a list of what is not here.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PAIN_POINTS.map((item, i) => (
              <div
                key={item.title}
                className="rounded-neo border-3 border-neo-black bg-neo-pink p-5 text-neo-white shadow-hard"
                style={{ transform: i % 3 === 0 ? 'rotate(-0.5deg)' : i % 3 === 1 ? 'rotate(0.5deg)' : 'rotate(0deg)' }}
              >
                <h3 className="mb-2 font-neo-display font-black uppercase">{item.title}</h3>
                <p className="text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* COMPARISON TABLE */}
        <section className="mt-20">
          <h2 className="mb-2 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            LexiClash <span className="text-neo-pink">vs</span> Boggle With Friends
          </h2>
          <p className="mb-6 text-sm text-neo-gray-300 sm:text-base">
            Both are real-time word grids. They differ in how you get in and what is for sale once you are there.
          </p>
          <div className="overflow-x-auto rounded-neo border-4 border-neo-black bg-neo-navy-light shadow-hard-lg">
            <table className="w-full border-collapse text-sm sm:text-base">
              <thead>
                <tr className="border-b-3 border-neo-black bg-neo-navy">
                  <th className="px-4 py-4 text-left font-neo-display font-black uppercase tracking-wider text-neo-yellow">Feature</th>
                  <th className="px-4 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-lime">LexiClash</th>
                  <th className="px-4 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-gray-300">Boggle With Friends</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr key={row[0]} className={`border-b border-neo-gray-400/20 ${i % 2 ? 'bg-neo-navy/30' : ''}`}>
                    <td className="px-4 py-3 font-bold">{row[0]}</td>
                    <td className="px-4 py-3 text-center font-bold text-neo-lime">{row[1]}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* HOW TO PLAY */}
        <section className="mt-20">
          <h2 className="mb-2 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            <span className="text-neo-lime">Ten seconds</span> to a shared grid.
          </h2>
          <p className="mb-8 max-w-2xl text-neo-gray-200">
            No app store detour, no account wall, no tutorial you have to tap through first.
          </p>
          <ol className="grid gap-5 sm:grid-cols-3">
            {HOW_TO_STEPS.map((s) => (
              <li key={s.n} className={`relative rounded-neo border-4 ${s.tint} bg-neo-navy-light p-6 shadow-hard`}>
                <span className="absolute -top-4 left-4 inline-block rotate-[-4deg] border-3 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-sm font-black text-neo-navy shadow-hard">
                  STEP {s.n}
                </span>
                <div className="mt-3 flex items-start gap-4">
                  <div className="relative h-16 w-16 shrink-0">
                    <Image src={s.mascot} alt="" fill sizes="64px" className="object-contain" />
                  </div>
                  <div>
                    <h3 className="font-neo-display text-xl font-black">{s.title}</h3>
                    <p className="mt-1 text-sm text-neo-gray-200">{s.desc}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            Quick <span className="text-neo-cyan">questions</span>.
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <details
                key={`faq-${idx}-${faq.q}`}
                className="group rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard transition-[box-shadow] open:shadow-hard-lg"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-neo-display font-black uppercase tracking-wide sm:px-6">
                  <span>{faq.q}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded border-2 border-neo-black bg-neo-yellow text-neo-navy transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="border-t-3 border-neo-black bg-neo-navy/40 px-5 py-4 text-sm text-neo-gray-200 sm:px-6 sm:text-base">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* CROSS-LINKS */}
        <section className="mt-20">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase sm:text-4xl">Keep comparing.</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CROSS_LINKS.map((c) => (
              <Link
                key={c.href}
                href={`/${locale}/${c.href}`}
                className={`relative rounded-neo border-3 ${c.accent} bg-neo-navy-light p-4 shadow-hard transition-[translate,scale,rotate,transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg`}
              >
                <span className="absolute -top-3 left-3 border-2 border-neo-black bg-neo-navy px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest">{c.tag}</span>
                <h3 className="mt-2 font-neo-display text-base font-black">{c.title}</h3>
                <p className="mt-1 text-xs text-neo-gray-200">{c.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative mt-20 mb-12 overflow-hidden rounded-neo border-4 border-neo-black bg-neo-yellow p-8 text-neo-navy shadow-hard-xl sm:p-12">
          <div className="absolute inset-0 texture-halftone-comic opacity-30" aria-hidden="true" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-5xl">
                Same grid. Same clock.<br />
                <span className="bg-neo-navy px-3 text-neo-yellow">No boosts.</span>
              </h2>
              <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">
                Make a room, send the {ROOM_CODE_LENGTH}-character code, and up to {MAX_PLAYERS_PER_ROOM} of you are racing the
                same letters about ten seconds later. Whoever finds the most words wins — that is the whole ruleset.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/${locale}/multiplayer`}
                  className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard-lg transition-[translate,scale,rotate,transform,box-shadow] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl sm:text-lg"
                >
                  ▶ Start a room free
                </Link>
                <Link
                  href={`/${locale}/play-boggle-online-free`}
                  className="rounded-neo border-4 border-neo-black bg-neo-navy px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider text-neo-lime shadow-hard transition-[translate,scale,rotate,transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg"
                >
                  ★ Play solo first
                </Link>
              </div>
            </div>
            <div className="relative hidden h-44 w-44 lg:block">
              <Image src="/mascot/winner.webp" alt="" fill sizes="176px" className="object-contain" />
            </div>
          </div>
        </section>
      </div>

      <style>{`@keyframes scroll{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}`}</style>
    </main>
  );
}
