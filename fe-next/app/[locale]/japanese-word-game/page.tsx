import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'マルチプレイヤー単語ゲーム - ボグル・スクラブル風オンラインワードゲーム | LexiClash',
  description: 'リアルタイムで友達と対戦できるマルチプレイヤー単語ゲーム！ボグルやスクラブルが好きな方におすすめ。部屋を作って、リンクを送って、リアルタイムで競争。10,000以上の日本語単語、登録不要、完全無料。語彙力アップにも最適！',
  keywords: '単語ゲーム, ワードゲーム オンライン, マルチプレイヤー 単語ゲーム, ボグル オンライン, スクラブル 日本語, 言葉遊び オンライン, 語彙力 ゲーム, 日本語 ワードゲーム, 無料 単語ゲーム, リアルタイム 単語ゲーム, 脳トレ 単語, 日本語学習 ゲーム, しりとり オンライン, 言葉 パズル, 語彙力アップ ゲーム',
  openGraph: {
    title: 'マルチプレイヤー単語ゲーム - ボグル・スクラブル風ワードゲーム | LexiClash',
    description: 'リアルタイムで友達と対戦！ボグルやスクラブルが好きな方に。部屋を作って、リンクを送って、リアルタイムで競争。無料・登録不要。',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: 'https://www.lexiclash.live/og-image-ja.jpg',
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
    images: ['https://www.lexiclash.live/og-image-ja.jpg'],
  },
  alternates: {
    canonical: 'https://www.lexiclash.live/ja',
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function JapaneseWordGamePage({ params }: PageProps): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/multiplayer`);
}
