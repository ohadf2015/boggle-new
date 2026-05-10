import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import { buildLeaderboardFaqJsonLd, encodeJsonLd } from '@/lib/seo/leaderboardJsonLd';
import LeaderboardPageClient from './PageClient';

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
    title: 'LexiClash Leaderboard — Global Rankings & Top Players',
    description:
      'See who dominates LexiClash. The leaderboard tracks daily, weekly, and all-time top scorers across all game modes. Climb the ranks by playing consistently, finding long words, and mastering combo chains.',
    features: [
      'Daily, weekly, and all-time rankings updated in real time',
      'Separate leaderboards for Classic, Blast, Word Hunt, and Daily Challenge modes',
      'Profile badges and streak indicators for top performers',
      'Filter by language and region to see local champions',
      'Click any player to view their stats, favorite words, and match history',
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
      'ראו מי שולט ב-LexiClash. טבלת המובילים עוקבת אחר מובילי הניקוד היומיים, השבועיים וכל הזמנים בכל מצבי המשחק.',
    features: [
      'דירוגים יומיים, שבועיים וכלליים מעודכנים בזמן אמת',
      'טבלאות נפרדות לקלאסי, בלאסט, ציד מילים ואתגר יומי',
      'תגים ומדדי רצף לשחקנים מובילים',
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
      'Se vem som dominerar LexiClash. Topplistan spårar dagliga, veckovisa och alltime-toppspelare i alla spellägen.',
    features: [
      'Dagliga, veckovisa och alltime-rankningar uppdaterade i realtid',
      'Separata topplistor för Klassiskt, Blast, Word Hunt och daglig utmaning',
      'Profilmärken och streak-indikatorer för toppspelare',
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
      'LexiClashで誰が上位にいるか確認。リーダーボードは全ゲームモードでデイリー、ウィークリー、オールタイムのトップスコアラーを追跡します。',
    features: [
      'デイリー、ウィークリー、オールタイムランキングがリアルタイム更新',
      'クラシック、ブラスト、ワードハント、デイリーチャレンジ別リーダーボード',
      'トッププレイヤー向けプロフィールバッジと連続記録表示',
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
      'Mira quién domina LexiClash. La tabla de clasificación rastrea a los mejores jugadores diarios, semanales y de todos los tiempos en todos los modos de juego.',
    features: [
      'Rankings diarios, semanales y de todos los tiempos actualizados en tiempo real',
      'Tablas separadas para Clásico, Blast, Word Hunt y Desafío Diario',
      'Insignias de perfil e indicadores de racha para los mejores jugadores',
      'Filtrar por idioma y región para ver campeones locales',
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

export default async function LeaderboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] ?? seoContent.en;
  const faqJsonLd = buildLeaderboardFaqJsonLd(locale, content.faq);
  return (
    <>
      <LeaderboardPageClient />
      <GamePageSeoContent
        title={content.title}
        description={content.description}
        features={content.features}
        faq={content.faq}
      />
      {faqJsonLd && (
        <script type="application/ld+json">{encodeJsonLd(faqJsonLd)}</script>
      )}
    </>
  );
}
