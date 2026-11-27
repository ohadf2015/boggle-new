import { APP_SCREEN_ROBOTS } from '@/lib/seo/appScreens';
import type { Metadata } from 'next';
import { defaultOgImages } from '@/lib/seo/defaultOgImage';
import Link from 'next/link';
import Header from '@/components/Header';
import { InlineBannerAd } from '@/components/ads';
import { EsScrabbleCrossLink } from '@/components/seo/EsScrabbleCrossLink';
import { SvScrabbleCrossLink } from '@/components/seo/SvScrabbleCrossLink';
import { HeScrabbleCrossLink } from '@/components/seo/HeScrabbleCrossLink';
import { EnBoggleCrossLink } from '@/components/seo/EnBoggleCrossLink';
import { withBodyLocales } from '@/lib/seo/bodyLocales';
import { PressGroup } from './_components/PressGroup';
import { VALID_LETTERS } from './_utils/wordListData';
import { HeroBand } from './_components/HeroBand';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { LANDING_ART } from '@/components/landing/kit/art';
import { PRIMARY_CTA, CHIP, SECTION_LABEL } from './_components/wordStyles';

const LENGTH_TONES = ['bg-neo-lime', 'bg-neo-cyan', 'bg-neo-pink', 'bg-neo-yellow', 'bg-neo-orange', 'bg-neo-purple'];
const heroArt = LANDING_ART.reading('');

export const dynamic = 'force-dynamic';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
const BASE_URL = 'https://www.lexiclash.live';

export const revalidate = 86400;

interface PageParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const title = 'LexiClash Word Dictionary — Browse Words by Length & Letter';
  const description =
    'Explore the full LexiClash word dictionary. Browse valid words by length (3–8 letters) or starting letter (A–Z). Find high-scoring words, learn new vocabulary, and sharpen your word game skills.';

  return withBodyLocales({
    title,
    description,
    openGraph: {
      images: defaultOgImages(locale),
      type: 'website',
      url: `${BASE_URL}/${locale}/words`,
      title,
      description,
      siteName: 'LexiClash',
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/words`,
      languages: Object.fromEntries([
        ['x-default', `${BASE_URL}/en/words`],
        ...LOCALES.map(l => [l, `${BASE_URL}/${l}/words`]),
        ['en-IL', `${BASE_URL}/en/words`],
        ['he-IL', `${BASE_URL}/he/words`],
        ['en-US', `${BASE_URL}/en/words`],
        ['es-US', `${BASE_URL}/es/words`],
        ['en-GB', `${BASE_URL}/en/words`],
        ['en-SE', `${BASE_URL}/en/words`],
        ['sv-SE', `${BASE_URL}/sv/words`],
        ['en-JP', `${BASE_URL}/en/words`],
        ['ja-JP', `${BASE_URL}/ja/words`],
        ['en-ES', `${BASE_URL}/en/words`],
        ['es-ES', `${BASE_URL}/es/words`],
        ['en-MX', `${BASE_URL}/en/words`],
        ['es-MX', `${BASE_URL}/es/words`],
        ['en-AU', `${BASE_URL}/en/words`],
        ['es-AR', `${BASE_URL}/es/words`],
        ['es-CO', `${BASE_URL}/es/words`],
      ]),
    },
    robots: APP_SCREEN_ROBOTS,
  }, '/words', locale);
}

const WORD_LENGTHS = [3, 4, 5, 6, 7, 8] as const;

export default async function WordsHubPage({ params }: PageParams) {
  const { locale } = await params;

  return (
    <PressGroup className="min-h-screen bg-neo-navy text-neo-white">
      <Header />
      <HeroBand className="grid max-w-6xl items-center gap-6 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:gap-x-12">
        <div>
        <nav className="mb-6 text-sm text-neo-cream/60">
          <Link href={`/${locale}`} className="hover:text-neo-cyan transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-neo-white">Words</span>
        </nav>

        <h1 className="mb-6 font-neo-display text-[2rem] font-bold leading-[1.1] text-balance sm:text-5xl lg:text-[3.25rem]">
          LexiClash Word Dictionary
        </h1>

        <Link href={`/${locale}/tools/word-solver`} data-press data-primary-cta className={PRIMARY_CTA}>
          Open Word Solver
        </Link>
        <p className="mt-3 text-lg leading-relaxed text-neo-white/85">
          Search for any word and check if it scores in LexiClash
        </p>
        </div>
        <div className="hidden justify-center lg:flex">
          <div className="-rotate-1 rounded-neo-lg border-3 border-neo-black bg-neo-yellow p-8 shadow-hard-xl">
            <Image src={heroArt.src} alt={heroArt.alt} width={heroArt.width} height={heroArt.height} priority sizes="384px" className="h-auto max-h-80 w-auto" />
          </div>
        </div>
      </HeroBand>

      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 pb-20 pt-6 sm:px-6">
        <section>
          <h2 className={`${SECTION_LABEL} mb-5`}>
            Browse by Word Length
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {WORD_LENGTHS.map(n => (
              <Link
                key={n}
                href={`/${locale}/words/${n}-letter-words`}
                data-press
                className={cn(CHIP, 'p-4 text-center', LENGTH_TONES[n % LENGTH_TONES.length])}
              >
                <span className="font-neo-display text-4xl font-bold">
                  {n}
                </span>
                <span className="block text-sm font-bold">letter words</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className={`${SECTION_LABEL} mb-5`}>
            Browse by Starting Letter
          </h2>
          <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-2">
            {VALID_LETTERS.map(letter => (
              <Link
                key={letter}
                href={`/${locale}/words/starting-with/${letter}`}
                data-press
                className={`${CHIP} py-2 text-center text-lg font-neo-display font-black`}
              >
                {letter.toUpperCase()}
              </Link>
            ))}
          </div>
        </section>

        <InlineBannerAd webZone="content-page" />

        <section>
          <h2 className={`${SECTION_LABEL} mb-2`}>
            Popular Anagram Lookups
          </h2>
          <p className="mb-5 text-neo-white/80">
            Find every word you can form from these letters — instant results, no signup.
          </p>
          <div className="flex flex-wrap gap-2">
            {['listen', 'stared', 'heart', 'stone', 'rates', 'learn', 'smart', 'great', 'earth', 'words'].map((letters) => (
              <Link
                key={letters}
                href={`/${locale}/anagram/${letters}`}
                data-press
                className={cn(CHIP, 'rounded-full px-4 py-2 text-sm font-bold uppercase')}
              >
                {letters}
              </Link>
            ))}
          </div>
        </section>

        <EsScrabbleCrossLink locale={locale} anchorVariant="words" queryAnchor />
        <SvScrabbleCrossLink locale={locale} anchorVariant="words" />
        <EnBoggleCrossLink locale={locale} anchorVariant="words" />
        <HeScrabbleCrossLink locale={locale} anchorVariant="words" />

        <div className="max-w-3xl space-y-4 rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-base leading-relaxed text-neo-black shadow-hard-xl sm:p-8">
          <p>
            Welcome to the LexiClash word dictionary, your go-to resource for finding valid words
            across every game mode. Whether you are warming up for a Daily Challenge, hunting for
            high-scoring plays in Blast Mode, or preparing for a multiplayer showdown, this hub gives
            you quick access to every word in our curated dictionary.
          </p>
          <p>
            Our dictionary is built from multiple trusted word lists and is continuously refined. Every
            word you see here is valid in LexiClash games, so you can study with confidence. Words are
            scored based on length: longer words earn exponentially more points, and chaining them into
            combos multiplies your score even further. A solid vocabulary is the single biggest
            advantage you can bring to any match.
          </p>
          <p>
            Browse by word length to focus on a specific tier of difficulty, or explore words by their
            starting letter to build familiarity with common openings. Many top players drill one
            letter group per day, cycling through the alphabet over a month. Pair this habit with the
            Daily Challenge and you will see measurable improvement within weeks.
          </p>
          <p>
            Each word page shows base points, combo scoring tiers, letter breakdowns, and links to
            related words. Use these pages as flashcards: open a random word, try to recall its score,
            then check. Over time this builds intuition for spotting valuable words on the grid
            instantly instead of calculating during precious game seconds.
          </p>
        </div>
      </div>
    </PressGroup>
  );
}
