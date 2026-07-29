import type { Metadata } from 'next';
import Link from 'next/link';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import ShiritoriHero from './ShiritoriHero';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const SLUG = 'shiritori';
const SUPPORTED_LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
const OG_LOCALE: Record<string, string> = { en: 'en_US', he: 'he_IL', sv: 'sv_SE', ja: 'ja_JP', es: 'es_ES' };
const KANA_CHAIN = ['し', 'り', 'と', 'り'];

// Escape so the JSON-LD is a safe React <script> text child (no dangerouslySetInnerHTML).
// Escaping < > & prevents a </script> breakout — the JSON-LD injection vector.
function encodeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

interface Copy {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  h1: string;
  tagline: string;
  whatTitle: string;
  whatBody: string;
  howTitle: string;
  steps: { title: string; text: string }[];
  cta: string;
  comingSoon: string;
  /** Admin-only solo preview link label. Falls back to en. */
  soloPreview: string;
  faqs: { q: string; a: string }[];
}

// ja is the primary locale (this is a JA-native game); en is the fallback for
// other locales until native copy lands. NOTE: ja copy needs native review.
const COPY: Record<string, Copy> = {
  ja: {
    metaTitle: 'しりとり オンライン対戦 ｜ 無料で遊べる言葉ゲーム - LexiClash',
    metaDescription:
      'しりとりをオンラインで対戦。前の単語の最後のかなから始まる言葉をつないでいく、日本語ならではの言葉ゲーム。登録不要・ブラウザですぐ遊べる無料マルチプレイ。',
    metaKeywords: 'しりとり, しりとり オンライン, 言葉ゲーム, 日本語 ゲーム, 無料 ゲーム, 対戦, ブラウザ ゲーム',
    h1: 'しりとり オンライン対戦',
    tagline: '前のことばの最後のかなでつなぐ、日本語ならではの言葉あそび。ともだちと、世界中のプレイヤーと。',
    whatTitle: 'しりとりとは？',
    whatBody:
      'プレイヤーが順番に、前の単語の最後の「かな」で始まる単語を言っていく言葉ゲームです。「ん」で終わる単語を言うと負け。だれもが知っている、日本語のためのあそびです。',
    howTitle: 'あそびかた',
    steps: [
      { title: '前のかなでつなぐ', text: '前の単語の最後のかなで始まる単語を入力します。（れい：ねこ → こま → まど）' },
      { title: '同じ単語はNG', text: 'すでに使われた単語は使えません。' },
      { title: '「ん」で終わると負け', text: '「ん」で終わる単語を言ってしまったプレイヤーは脱落します。' },
    ],
    cta: '無料で言葉ゲームをプレイ',
    comingSoon: 'しりとりモードはマルチプレイに登場予定です。',
    soloPreview: 'ソロでお試し（管理者プレビュー）',
    faqs: [
      { q: 'しりとりは無料で遊べますか？', a: 'はい。LexiClash はブラウザで無料で遊べます。登録は不要です。' },
      { q: 'オンラインで対戦できますか？', a: 'はい。ともだちや世界中のプレイヤーとリアルタイムで対戦できます。' },
      { q: 'スマホでも遊べますか？', a: 'はい。スマホ・タブレット・PC・大画面のどれでもブラウザで遊べます。' },
    ],
  },
  en: {
    metaTitle: 'Shiritori Online — Free Japanese Word-Chain Game | LexiClash',
    metaDescription:
      'Play Shiritori (しりとり) online — the classic Japanese word-chain game where each word starts with the last kana of the previous one. Free, no signup, multiplayer in your browser.',
    metaKeywords: 'shiritori, shiritori online, japanese word game, word chain game, free word game, multiplayer',
    h1: 'Shiritori — Japanese Word Chain',
    tagline: 'Chain words by their last kana — the word game every Japanese speaker grows up with. Play friends or the world.',
    whatTitle: 'What is Shiritori?',
    whatBody:
      'A turn-based Japanese word game: each player says a word beginning with the last kana of the previous word. Say a word ending in ん and you are out. It is the word game of Japan.',
    howTitle: 'How to play',
    steps: [
      { title: 'Chain the last kana', text: 'Enter a word that starts with the last kana of the previous word (e.g. ねこ → こま → まど).' },
      { title: 'No repeats', text: 'A word already played this round cannot be reused.' },
      { title: 'Avoid ん', text: 'Play a word ending in ん and you are eliminated — nothing follows it.' },
    ],
    cta: 'Play word games free',
    comingSoon: 'Shiritori mode is coming soon to multiplayer.',
    soloPreview: 'Try solo (admin preview)',
    faqs: [
      { q: 'Is Shiritori free to play?', a: 'Yes. LexiClash plays free in your browser, no signup required.' },
      { q: 'Can I play online with others?', a: 'Yes — real-time multiplayer with friends or players worldwide.' },
      { q: 'Does it work on mobile?', a: 'Yes. It runs in the browser on phones, tablets, desktop, and big screens.' },
    ],
  },
};

const getCopy = (locale: string): Copy => COPY[locale] ?? COPY.en;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = getCopy(locale);
  const pageUrl = `${BASE_URL}/${locale}/${SLUG}`;

  const languages: Record<string, string> = { 'x-default': `${BASE_URL}/ja/${SLUG}` };
  SUPPORTED_LOCALES.forEach((l) => { languages[l] = `${BASE_URL}/${l}/${SLUG}`; });

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    keywords: copy.metaKeywords,
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      locale: OG_LOCALE[locale] ?? 'ja_JP',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/modes/shiritori.png`, width: 512, height: 512, alt: copy.h1 }],
    },
    twitter: { card: 'summary_large_image', title: copy.metaTitle, description: copy.metaDescription, images: [`${BASE_URL}/modes/shiritori.png`] },
    alternates: { canonical: pageUrl, languages },
    // Shiritori is a Japanese-native mode — only the ja page is indexed.
    robots: { index: locale === 'ja', follow: true },
  };
}

export default async function ShiritoriLandingPage({ params }: PageProps) {
  const { locale } = await params;
  const copy = getCopy(locale);
  const pageUrl = `${BASE_URL}/${locale}/${SLUG}`;

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: copy.howTitle,
    description: copy.whatBody,
    step: copy.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.text })),
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <main className="min-h-screen bg-neo-navy texture-halftone px-4 py-12 sm:py-16">
      <VideoGameJsonLd
        mode={SLUG}
        locale={locale}
        name={copy.h1}
        description={copy.metaDescription}
        playMode="MultiPlayer"
        numberOfPlayers={{ minValue: 2, maxValue: 8 }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: `${BASE_URL}/${locale}` },
          { name: copy.h1, url: pageUrl },
        ]}
      />
      <script type="application/ld+json">{encodeJsonLd(howToJsonLd)}</script>
      <script type="application/ld+json">{encodeJsonLd(faqJsonLd)}</script>

      <section className="mx-auto max-w-3xl">
        <ShiritoriHero title={copy.h1} tagline={copy.tagline} kana={KANA_CHAIN} />

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href={`/${locale}/multiplayer`}
            className="inline-flex items-center justify-center rounded-neo border-neo-thick border-black bg-neo-lime px-8 py-4 font-neo-display text-lg font-bold text-black shadow-hard transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
          >
            {copy.cta}
          </Link>
          <p className="font-neo-body text-sm text-neo-white">{copy.comingSoon}</p>
          <Link
            href={`/${locale}/shiritori/solo`}
            className="font-neo-body text-xs underline text-neo-white hover:text-neo-white"
          >
            {copy.soloPreview}
          </Link>
        </div>

        <section className="mt-14 rounded-neo border-neo-thick border-black bg-neo-navy-light p-6 shadow-hard">
          <h2 className="font-neo-display text-2xl font-bold text-neo-white">{copy.whatTitle}</h2>
          <p className="mt-3 font-neo-body text-neo-white">{copy.whatBody}</p>
        </section>

        <section className="mt-8">
          <h2 className="font-neo-display text-2xl font-bold text-neo-white">{copy.howTitle}</h2>
          <ol className="mt-4 space-y-3">
            {copy.steps.map((s, i) => (
              <li key={i} className="flex gap-3 rounded-neo border-neo border-black bg-neo-navy-light p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border-neo border-black bg-neo-cyan font-neo-display font-bold text-black">{i + 1}</span>
                <div>
                  <p className="font-neo-display font-bold text-neo-white">{s.title}</p>
                  <p className="font-neo-body text-sm text-neo-white">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8">
          <h2 className="font-neo-display text-2xl font-bold text-neo-white">FAQ</h2>
          <dl className="mt-4 space-y-4">
            {copy.faqs.map((f, i) => (
              <div key={i} className="rounded-neo border-neo border-black bg-neo-navy-light p-4">
                <dt className="font-neo-display font-bold text-neo-white">{f.q}</dt>
                <dd className="mt-1 font-neo-body text-sm text-neo-white">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </section>
    </main>
  );
}
