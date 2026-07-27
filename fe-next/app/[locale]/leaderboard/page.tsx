import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { buildLeaderboardFaqJsonLd, encodeJsonLd } from '@/lib/seo/leaderboardJsonLd';
import LeaderboardPageClient from './PageClientNoSsr';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'leaderboard', path: '/leaderboard', locale });
}

const seoContent: Record<string, {
  title: string;
  description: string;
  features: string[];
  faq: { question: string; answer: string }[];
}> = {
  en: {
    title: 'Best Competitive Word Games — Global Leaderboards & Live Rankings',
    description:
      'Comparing the best competitive word games with global leaderboards in 2026. LexiClash runs real-time multiplayer across Classic, Blast, Word Hunt, and Daily Challenge modes in five languages. No signup required — browser-based, instant play. Global score rankings are in live testing.',
    features: [
      'Real-time multiplayer in Classic, Blast, Word Hunt, and Daily Challenge modes',
      'Play against opponents in five languages: English, Hebrew, Spanish, Swedish, Japanese',
      'Daily shared puzzles — same board for all players, scores compared globally',
      'Combo multipliers and bonus tiles that reward fast, strategic word play',
      'Browser-based — no signup, no download, compete in under 30 seconds',
    ],
    faq: [
      {
        question: 'What are the best competitive word games with global leaderboards?',
        answer:
          'LexiClash is one of the best free competitive word games with global leaderboards — daily, weekly, and all-time rankings across Classic, Blast, Word Hunt, and Daily Challenge modes. Other notable picks: Words With Friends (turn-based), Wordle (single-puzzle), and Boggle With Friends. LexiClash is browser-based, real-time multiplayer, no signup, no download.',
      },
      {
        question: 'What are the best word games of 2026?',
        answer:
          'The best word games in 2026 combine real-time multiplayer, daily challenges, and global leaderboards. LexiClash leads the free browser category — 8 game modes, 5 languages, no download, instant play. Wordle remains the daily-puzzle benchmark. Words With Friends owns turn-based async play. For competitive ranked play with global leaderboards, LexiClash is the strongest pick because of its unified daily/weekly/all-time scoring across every mode.',
      },
      {
        question: 'What are the best free browser word games in 2025 and 2026?',
        answer:
          'LexiClash, Wordle, Squardle, Spelltower (browser), and Quordle are the top free browser word games in 2025 and 2026 — all playable instantly, no signup, no install. LexiClash is the only one combining a global leaderboard, real-time multiplayer (2-20 players), and 5-language support in one browser package.',
      },
      {
        question: 'How is the leaderboard score calculated?',
        answer:
          'Leaderboard rankings are based on your total score across games. Points come from word length, combo multipliers, and bonus tiles. Daily leaderboards reset at midnight UTC.',
      },
      {
        question: 'Can I see leaderboards for specific game modes?',
        answer:
          'Yes — use the mode filter at the top of the leaderboard to switch between Classic, Blast, Word Hunt, and Daily Challenge rankings.',
      },
      {
        question: 'How often does the leaderboard update?',
        answer:
          'The leaderboard updates in real time as games finish. Your position reflects your most recent score within seconds of completing a match.',
      },
    ],
  },
  he: {
    title: 'טבלת המובילים של LexiClash — דירוגים עולמיים ושחקנים מובילים',
    description:
      'השוואת משחקי המילים התחרותיים הטובים ביותר עם דירוגים גלובליים ב-2026. LexiClash מציע מולטיפלייר בזמן אמת בחמש שפות — ללא הרשמה, ישירות מהדפדפן.',
    features: [
      'מולטיפלייר בזמן אמת — קלאסי, בלאסט, ציד מילים ואתגר יומי',
      'תמיכה בחמש שפות: עברית, אנגלית, ספרדית, שוודית ויפנית',
      'לוחות יומיים משותפים — ניקוד מושווה עם שחקנים ברחבי העולם',
    ],
    faq: [
      {
        question: 'איך מחושב הניקוד בטבלת המובילים?',
        answer: 'הדירוג מבוסס על הניקוד הכולל שלכם במשחקים. נקודות מגיעות מאורך מילים, מכפילי קומבו ואריחי בונוס.',
      },
      {
        question: 'כמה פעמים הטבלה מתעדכנת?',
        answer: 'הטבלה מתעדכנת בזמן אמת כאשר משחקים מסתיימים.',
      },
    ],
  },
  sv: {
    title: 'LexiClash Topplista — Globala Rankningar & Toppspelare',
    description:
      'En jämförelse av de bästa konkurrensinriktade ordspelen med globala topplistor 2026. LexiClash erbjuder realtidsmultiplayer i fem språk — inget konto krävs, direkt i webbläsaren.',
    features: [
      'Realtidsmultiplayer — Klassiskt, Blast, Word Hunt och Daglig Utmaning',
      'Stöd för fem språk: engelska, hebreiska, spanska, svenska och japanska',
      'Dagliga delade bräden — alla spelar samma pussel, poäng jämförs globalt',
    ],
    faq: [
      {
        question: 'Hur beräknas topplistan?',
        answer: 'Rankningar baseras på din totala poäng. Poäng kommer från ordlängd, kombomultiplikatorer och bonusplattor.',
      },
    ],
  },
  ja: {
    title: 'LexiClash リーダーボード — グローバルランキング＆トッププレイヤー',
    description:
      '2026年のグローバルリーダーボードを持つ最高の競争的ワードゲームの比較。LexiClashは5言語でのリアルタイム対戦を提供。登録不要、ブラウザで即プレイ。',
    features: [
      'リアルタイム対戦 — クラシック、ブラスト、ワードハント、デイリーチャレンジ',
      '5言語対応：英語、ヘブライ語、スペイン語、スウェーデン語、日本語',
      '毎日の共有ボード — 全プレイヤーが同じパズルでスコアを世界比較',
    ],
    faq: [
      {
        question: 'リーダーボードのスコアはどう計算されますか？',
        answer: 'ランキングはゲーム全体の合計スコアに基づきます。ポイントは単語の長さ、コンボ倍率、ボーナスタイルから得られます。',
      },
    ],
  },
  es: {
    title: 'Tabla de Clasificación LexiClash — Rankings Globales y Mejores Jugadores',
    description:
      'Los mejores juegos de palabras competitivos con clasificaciones globales en 2026. LexiClash ofrece multijugador en tiempo real en cinco idiomas. Sin registro, directo desde el navegador.',
    features: [
      'Multijugador en tiempo real — Clásico, Blast, Word Hunt y Desafío Diario',
      'Juega en cinco idiomas: inglés, hebreo, español, sueco o japonés',
      'Tableros diarios compartidos — puntuaciones comparadas globalmente',
      'Sin registro, sin descarga — juega de inmediato desde el navegador',
    ],
    faq: [
      {
        question: '¿Cómo se calcula la puntuación de la tabla?',
        answer: 'Los rankings se basan en tu puntuación total en los juegos. Los puntos provienen de la longitud de las palabras, multiplicadores de combo y fichas de bonificación.',
      },
      {
        question: '¿Con qué frecuencia se actualiza la tabla?',
        answer: 'La tabla se actualiza en tiempo real cuando los juegos terminan.',
      },
    ],
  },
};

const SITE_URL = 'https://www.lexiclash.live';

export default async function LeaderboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] ?? seoContent.en;
  const faqJsonLd = buildLeaderboardFaqJsonLd(locale, content.faq);
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Leaderboard', item: `${SITE_URL}/${locale}/leaderboard` },
    ],
  };
  return (
    <>
      <LeaderboardPageClient />
      {/* GamePageSeoContent is rendered by leaderboard/layout.tsx — rendering it
          here too would duplicate the (now visible) content block on the page. */}
      <script type="application/ld+json">{encodeJsonLd(breadcrumbJsonLd)}</script>
      {faqJsonLd && (
        <script type="application/ld+json">{encodeJsonLd(faqJsonLd)}</script>
      )}
    </>
  );
}
