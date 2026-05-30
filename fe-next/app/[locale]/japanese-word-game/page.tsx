import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import NativePageEnhancements from "@/components/landing/NativePageEnhancements";


interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'ja';
  const pageUrl = `${BASE_URL}/ja/japanese-word-game`;

  return {
    title: 'マルチプレイヤー単語ゲーム - ボグル・スクラブル風オンラインワードゲーム | LexiClash',
    description: 'リアルタイムで友達と対戦できるマルチプレイヤー単語ゲーム！ボグルやスクラブルが好きな方におすすめ。部屋を作って、リンクを送って、リアルタイムで競争。10,000以上の日本語単語、登録不要、完全無料。',
    keywords: '単語ゲーム, ワードゲーム オンライン, マルチプレイヤー 単語ゲーム, ボグル オンライン, スクラブル 日本語, 言葉遊び オンライン, リアルタイム 単語ゲーム',
    openGraph: {
      title: 'マルチプレイヤー単語ゲーム - ボグル・スクラブル風ワードゲーム | LexiClash',
      description: 'リアルタイムで友達と対戦！ボグルやスクラブルが好きな方に。部屋を作って、リンクを送って、リアルタイムで競争。無料・登録不要。',
      locale: 'ja_JP',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-ja.webp`,
          width: 1200,
          height: 630,
          alt: 'LexiClash - マルチプレイヤー単語ゲーム',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'マルチプレイヤー単語ゲーム - LexiClash',
      description: 'リアルタイムで友達と対戦できるマルチプレイヤー単語ゲーム！ボグルやスクラブル好きにおすすめ。無料・登録不要。',
      images: [`${BASE_URL}/og-image-ja.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/multiplayer-word-game-online`,
        en: `${BASE_URL}/en/multiplayer-word-game-online`,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-IL': `${BASE_URL}/en/multiplayer-word-game-online`,
        'he-IL': `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        'en-US': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-US': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-GB': `${BASE_URL}/en/multiplayer-word-game-online`,
        'en-SE': `${BASE_URL}/en/multiplayer-word-game-online`,
        'sv-SE': `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        'en-JP': `${BASE_URL}/en/multiplayer-word-game-online`,
        'ja-JP': `${BASE_URL}/ja/japanese-word-game`,
        'en-ES': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-ES': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-MX': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-MX': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-AU': `${BASE_URL}/en/multiplayer-word-game-online`,
        'es-AR': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'es-CO': `${BASE_URL}/es/juego-de-palabras-multijugador`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function JapaneseWordGamePage({ params }: PageProps) {
  const { locale } = await params;

  const faqs = [
    {
      q: 'マルチプレイヤー単語ゲームの始め方は？',
      a: '「部屋を作成」または「部屋に参加」をクリックしてください。部屋のリンクを友達にシェアすれば、リアルタイムで対戦を始められます！登録は不要です。',
    },
    {
      q: 'LexiClashが他の単語ゲームと違う点は？',
      a: 'LexiClashはボグル、スクラブル、ワードルの良さを組み合わせています。リアルタイム対戦、即座のポイントフィードバック、複数のゲームモード、ボスバトル、日々の挑戦をお楽しみいただけます。',
    },
    {
      q: '友達とオンラインで無料でプレイできますか？',
      a: 'はい！LexiClashは完全無料です。部屋を作成し、リンクで友達を招待し、ダウンロードや登録なしでプレイできます。',
    },
    {
      q: 'LexiClashには何個の日本語単語がありますか？',
      a: 'LexiClashには10,000以上の日本語単語が含まれています。辞書は継続的に更新されます。',
    },
    {
      q: 'どんなゲームモードがあるの？',
      a: 'マルチプレイヤー部屋、日々の挑戦、単語狩り、ブラストモードなど複数のモードがあります。各モードはユニークなルールとポイント計算があります。',
    },
  ];

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          }),
        }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <TopBackLink className="mb-4" />
        <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
          マルチプレイヤー単語ゲーム - リアルタイムワードバトル
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
          LexiClashへようこそ - 究極の無料マルチプレイヤー単語ゲーム！ボグル、スクラブル、またはワードルが好きな方なら、当社のリアルタイムワードバトルプラットフォームはそれぞれの最高の機能を組み合わせています。部屋を作成し、友達にリンクを送信し、リアルタイムでエキサイティングなワードバトルに参加してください。10,000以上の日本語単語の辞書、ダウンロード不要、完全無料アクセスで、LexiClashはあなたの究極の単語ゲームです。
        </p>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">
            LexiClashマルチプレイヤーをプレイする理由
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              'リアルタイムマルチプレイヤーバトルと即座のポイントフィードバック',
              'シェア可能なリンクで部屋を作成して友達を招待',
              '10,000以上の日本語単語',
              '複数のゲームモード（ボグル、狩り、ブラスト）',
              '日々の挑戦とリーダーボード',
              'ユニークなツイストを持つボスバトル',
              '完全無料、ダウンロード不要',
              '5つの言語でプレイ（EN, HE, SV, JA, ES）',
            ].map((feature) => (
              <div
                key={feature}
                className="flex gap-3 rounded-neo border-3 border-neo-yellow bg-neo-navy/50 p-4 shadow-hard"
              >
                <span className="text-neo-yellow">✓</span>
                <p className="text-sm sm:text-base">{feature}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/${locale}/multiplayer`}
            className="rounded-neo border-4 border-neo-yellow bg-neo-yellow px-6 py-3 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4"
          >
            マルチプレイを始める
          </Link>
          <Link
            href={`/${locale}/singleplayer`}
            className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4"
          >
            シングルプレイ
          </Link>
          <Link
            href={`/${locale}/daily`}
            className="rounded-neo border-4 border-neo-pink bg-transparent px-6 py-3 font-bold text-neo-pink shadow-hard transition-all hover:bg-neo-pink/10 sm:px-8 sm:py-4"
          >
            日々の挑戦
          </Link>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">よくある質問</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details
                key={`faq-${idx}-${faq.q}`}
                className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                  <span>{faq.q}</span>
                  <span className="text-neo-yellow transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12 max-w-none">
          <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">LexiClashについて</h2>
          <p className="mt-4 text-neo-gray-200">
            LexiClashはスクラブルの戦略的な深さ、ボグルのリアルタイムの速さ、ワードルのパズルの満足感を組み合わせることで、オンライン単語ゲームに革命をもたらします。当社のプラットフォームは、単語愛好家、カジュアルゲーマー、競争好きなプレイヤーのために設計されています。
          </p>
          <p className="mt-4 text-neo-gray-200">
            友達、家族、世界中の見ず知らずの人たちとマルチプレイ単語ゲームをプレイしてください。短い15分のゲームから長い競争的なセッションまで、LexiClashはすべてのプレイスタイルに対応しています。直感的なインターフェースはデスクトップとモバイルの両方で機能し、どこからでも、いつでも単語ゲームをプレイできます。
          </p>
          <p className="mt-4 text-neo-gray-200">
            グローバルリーダーボードで競争し、アチーブメントを獲得し、特別なゲームモードをアンロックしてください。当社のボスバトルでは、プレイヤーがAIの敵と協力するユニークなPvEツイストが追加されます。日々の挑戦は毎日新しいパズルを提供し、排他的な報酬があります。
          </p>
        </section>
        <NativePageEnhancements locale={locale} />
      </div>
    </main>
  );
}
