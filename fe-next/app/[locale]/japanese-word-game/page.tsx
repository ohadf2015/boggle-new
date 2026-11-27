import type { Metadata } from 'next';
import Link from 'next/link';
import NativePageEnhancements from '@/components/landing/NativePageEnhancements';
import {
  CheckList,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Prose,
  Section,
  TileGrid,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { dictionaryFloor } from '@/lib/seo/dictionaryStats';

const JA_DICT_FLOOR = dictionaryFloor('ja', 'ja');


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
          url: `${BASE_URL}/og-image-ja.webp?v=2`,
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
      images: [`${BASE_URL}/og-image-ja.webp?v=2`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': `${BASE_URL}/en/free-multiplayer-word-game`,
        en: `${BASE_URL}/en/free-multiplayer-word-game`,
        he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        ja: `${BASE_URL}/ja/japanese-word-game`,
        es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-IL': `${BASE_URL}/en/free-multiplayer-word-game`,
        'he-IL': `${BASE_URL}/he/hebrew-multiplayer-word-game`,
        'en-US': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-US': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-GB': `${BASE_URL}/en/free-multiplayer-word-game`,
        'en-SE': `${BASE_URL}/en/free-multiplayer-word-game`,
        'sv-SE': `${BASE_URL}/sv/swedish-multiplayer-word-game`,
        'en-JP': `${BASE_URL}/en/free-multiplayer-word-game`,
        'ja-JP': `${BASE_URL}/ja/japanese-word-game`,
        'en-ES': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-ES': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-MX': `${BASE_URL}/en/free-multiplayer-word-game`,
        'es-MX': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        'en-AU': `${BASE_URL}/en/free-multiplayer-word-game`,
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
      a: `LexiClashには${JA_DICT_FLOOR}以上の日本語単語が含まれています。辞書は継続的に更新されます。`,
    },
    {
      q: 'どんなゲームモードがあるの？',
      a: 'マルチプレイヤー部屋、日々の挑戦、単語狩り、ブラストモードなど複数のモードがあります。各モードはユニークなルールとポイント計算があります。',
    },
  ];

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/multiplayer`, label: 'マルチプレイを始める' }}>
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

      <LandingHero
        title="マルチプレイヤー単語ゲーム - リアルタイムワードバトル"
        lead="LexiClashへようこそ - 究極の無料マルチプレイヤー単語ゲーム！"
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>マルチプレイを始める</LandingButton>
            <LandingButton href={`/${locale}/quick-play`} variant="secondary">
              シングルプレイ
            </LandingButton>
          </>
        }
        art={LANDING_ART.friends('文字タイルの上でハイタッチするLexiClashのマスコット')}
        artTone="pink"
        more={
          <p>
            ボグル、スクラブル、またはワードルが好きな方なら、当社のリアルタイムワードバトルプラットフォームはそれぞれの最高の機能を組み合わせています。部屋を作成し、友達にリンクを送信し、リアルタイムでエキサイティングなワードバトルに参加してください。{JA_DICT_FLOOR}以上の日本語単語の辞書、ダウンロード不要、完全無料アクセスで、LexiClashはあなたの究極の単語ゲームです。
          </p>
        }
      />

      <Section title="LexiClashマルチプレイヤーをプレイする理由">
        <CheckList
          items={[
            'リアルタイムマルチプレイヤーバトルと即座のポイントフィードバック',
            'シェア可能なリンクで部屋を作成して友達を招待',
            `${JA_DICT_FLOOR}以上の日本語単語`,
            '複数のゲームモード（ボグル、狩り、ブラスト）',
            '日々の挑戦とリーダーボード',
            'ユニークなツイストを持つボスバトル',
            '完全無料、ダウンロード不要',
            '6つの言語でプレイ（EN, HE, SV, JA, ES, RU）',
          ]}
        />
      </Section>

      <div className="flex flex-col gap-4">
        <TileGrid
          items={[
            { href: `/${locale}/multiplayer`, title: 'マルチプレイを始める →', tone: 'yellow' },
            { href: `/${locale}/quick-play`, title: 'シングルプレイ →', tone: 'cyan' },
            { href: `/${locale}/daily`, title: '日々の挑戦 →', tone: 'pink' },
          ]}
        />
        <p className="text-neo-white/85">
          手持ちの文字で作れる言葉を知りたいときは、
          <Link href="/ja/tools/word-solver" className="font-bold text-neo-cyan underline underline-offset-2">
            アナグラム検索
          </Link>
          で並べ替えの候補をまとめて確認できます。
        </p>
      </div>

      <Section title="よくある質問">
        <FaqList items={faqs} />
      </Section>

      <Section title="LexiClashについて">
        <Prose>
          <p>
            LexiClashはスクラブルの戦略的な深さ、ボグルのリアルタイムの速さ、ワードルのパズルの満足感を組み合わせることで、オンライン単語ゲームに革命をもたらします。当社のプラットフォームは、単語愛好家、カジュアルゲーマー、競争好きなプレイヤーのために設計されています。
          </p>
          <p>
            友達、家族、世界中の見ず知らずの人たちとマルチプレイ単語ゲームをプレイしてください。短い15分のゲームから長い競争的なセッションまで、LexiClashはすべてのプレイスタイルに対応しています。直感的なインターフェースはデスクトップとモバイルの両方で機能し、どこからでも、いつでも単語ゲームをプレイできます。
          </p>
          <p>
            グローバルリーダーボードで競争し、アチーブメントを獲得し、特別なゲームモードをアンロックしてください。当社のボスバトルでは、プレイヤーがAIの敵と協力するユニークなPvEツイストが追加されます。日々の挑戦は毎日新しいパズルを提供し、排他的な報酬があります。
          </p>
        </Prose>
      </Section>

      <NativePageEnhancements locale={locale} />
    </LandingPage>
  );
}
