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
    title: '言葉の対戦ゲーム｜ブラウザで友達とひらがな言葉探し | LexiClash',
    description: `ひらがなの文字盤から、つながった文字で言葉を探して点を競う対戦ゲーム。部屋を作ってリンクを送れば、友達とすぐに遊べます。辞書は${JA_DICT_FLOOR}語以上、登録もダウンロードも不要です。`,
    keywords: '言葉の対戦ゲーム, ブラウザ 対戦 ゲーム, 文字対戦, ワードゲーム ブラウザ, 単語ゲーム, 言葉遊び オンライン, ひらがな 言葉探し',
    openGraph: {
      title: '言葉の対戦ゲーム｜ブラウザで友達とひらがな言葉探し | LexiClash',
      description: 'ひらがなの文字盤で言葉を探して点を競う、ブラウザの対戦ゲーム。部屋を作ってリンクを送れば、友達とすぐに遊べます。無料・登録不要。',
      locale: 'ja_JP',
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: `${BASE_URL}/og-image-ja.webp?v=2`,
          width: 1200,
          height: 630,
          alt: 'LexiClash - ブラウザで遊べる言葉の対戦ゲーム',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: '言葉の対戦ゲーム - LexiClash',
      description: 'ひらがなの文字盤で言葉を探して、友達とブラウザで対戦。無料・登録不要。',
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
      q: '友達と対戦するには？',
      a: '「部屋を作成」または「部屋に参加」をクリックしてください。部屋のリンクを友達にシェアすれば、リアルタイムで対戦を始められます！登録は不要です。',
    },
    {
      q: 'LexiClashが他の単語ゲームと違う点は？',
      a: 'ターン制ではなく、全員が同じ盤面で同時に言葉を探します。1ラウンドは1〜2分ほど。見つけた言葉はその場で辞書と照合され、点数もすぐに出ます。ボグルに近い遊び方ですが、日本語はひらがなの盤面で遊びます。',
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
      a: '友達と遊ぶ対戦部屋のほか、毎日同じお題に挑むデイリー、隠れた言葉を探すワードハント、言葉をつなげて盤面を消すブラスト、ボスと戦うアドベンチャーがあります。アドベンチャーには、しりとりのルールで遊ぶステージもあります。',
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
        title="ブラウザで遊べる、言葉の対戦ゲーム"
        lead="ひらがなが並んだ盤面から、となり合う文字をなぞって言葉を見つけるゲームです。"
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>マルチプレイを始める</LandingButton>
            <LandingButton href={`/${locale}/quick-play`} variant="secondary">
              シングルプレイ
            </LandingButton>
          </>
        }
        art={LANDING_ART.friends('ひらがなの文字盤の前でハイタッチするLexiClashのマスコット')}
        artTone="pink"
        more={
          <p>
            縦・横・斜めにつながった文字をなぞれば、それが一つの言葉になります。長い言葉ほど点が高く、制限時間内にいちばん多く点を取った人の勝ち。部屋を作ってリンクを送れば、友達はブラウザを開くだけで参加できます。辞書は{JA_DICT_FLOOR}語以上、登録もダウンロードもいりません。
          </p>
        }
      />

      <Section title="友達とブラウザで対戦できる理由">
        <CheckList
          items={[
            'リアルタイムマルチプレイヤーバトルと即座のポイントフィードバック',
            'シェア可能なリンクで部屋を作成して友達を招待',
            `${JA_DICT_FLOOR}以上の日本語単語`,
            'クラシック、ワードハント、ブラストなど複数のモード',
            '毎日のデイリーとランキング',
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
            { href: `/${locale}/daily`, title: 'デイリーに挑戦 →', tone: 'pink' },
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
            LexiClashは、言葉遊びが好きな人どうしで気軽に対戦できるブラウザゲームです。日本語のほか、英語・スペイン語・スウェーデン語・ヘブライ語・ロシア語でも遊べます。じっくり言葉を探したい人も、ほかのプレイヤーより一点でも多く取りたい人も、同じ盤面で一緒に楽しめます。
          </p>
          <p>
            友達や家族とはもちろん、世界中のプレイヤーとも対戦できます。1ラウンドは数分なので、ちょっとした空き時間に一回だけ遊ぶことも、何ラウンドも続けて勝負することもできます。パソコンでもスマホでも同じように動くので、いつでもどこからでも言葉探しを始められます。
          </p>
          <p>
            世界のランキングで順位を上げたり、実績を集めたりする楽しみもあります。アドベンチャーでは、ボスとの言葉バトルで先へ進みます。デイリーは世界共通のお題が毎日1つ届き、全員が同じ問題で腕を競います。
          </p>
        </Prose>
      </Section>

      <NativePageEnhancements locale={locale} />
    </LandingPage>
  );
}
