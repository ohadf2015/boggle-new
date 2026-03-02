import type { Metadata } from 'next';
import HomePageClient from './PageClient';
import { FAQPageJsonLd } from '@/components/seo/JsonLd';

/**
 * Main landing page - Game mode selection
 * Users choose between Single Player and Multiplayer modes
 */

interface PageProps {
  params: Promise<{ locale: string }>;
}

const titleMap: Record<string, string> = {
  en: 'LexiClash - Free Multiplayer Word Game',
  he: 'לקסיקלאש - משחק מילים מרובה משתתפים חינם',
  sv: 'LexiClash - Gratis Multiplayer Ordspel',
  ja: 'LexiClash - 無料マルチプレイヤーワードゲーム',
  es: 'LexiClash - Juego de Palabras Multijugador',
};

const descriptionMap: Record<string, string> = {
  en: 'Play the best free multiplayer word game online! Race friends to find words on a shared grid, build combos, and climb leaderboards. Like Boggle and Wordle but multiplayer. No download needed — play instantly in 5 languages.',
  he: 'שחקו במשחק המילים הטוב ביותר בחינם! התחרו עם חברים בזמן אמת, מצאו מילים, בנו קומבו וטפסו בטבלת המובילים. כמו בוגל ווורדל אבל מרובה משתתפים. ללא הורדה — שחקו מיידית ב-5 שפות.',
  sv: 'Spela det bästa gratis multiplayer-ordspelet online! Tävla mot vänner i realtid, hitta ord, bygg kombos och klättra på topplistorna. Som Boggle och Wordle men multiplayer. Ingen nedladdning krävs — spela direkt på 5 språk.',
  ja: '最高の無料マルチプレイヤーワードゲームをオンラインでプレイ！友達とリアルタイムで競い、単語を見つけ、コンボを構築し、リーダーボードを上りましょう。BoggleやWordleのようですがマルチプレイヤー。ダウンロード不要 — 5言語で即座にプレイ。',
  es: 'Juega al mejor juego de palabras multijugador gratis en linea. Compite con amigos en tiempo real, encuentra palabras, construye combos y sube en la clasificacion. Como Boggle y Wordle pero multijugador. Sin descarga — juega al instante en 5 idiomas.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: { absolute: titleMap[locale] || titleMap.en },
    description: descriptionMap[locale] || descriptionMap.en,
  };
}

const FAQ_ITEMS = [
  {
    question: 'Is LexiClash really free?',
    answer: 'Yes, completely free. No hidden paywalls, no premium subscriptions. We sustain the game through non-intrusive advertising that respects your privacy.',
  },
  {
    question: 'Do I need to create an account?',
    answer: 'No. You can play as a guest instantly. Creating an account (via Google or Discord) unlocks features like leaderboard rankings, achievement tracking, and progress saving across devices.',
  },
  {
    question: 'What languages are supported?',
    answer: 'LexiClash supports English, Hebrew, Swedish, Japanese, and Spanish. Each language has its own curated dictionary, daily challenges, and leaderboards. You can switch languages anytime from the settings menu.',
  },
  {
    question: 'Can I play on my phone?',
    answer: 'Absolutely. LexiClash is fully responsive and works on any modern mobile browser. Swipe letters to form words — the touch controls are designed specifically for mobile play.',
  },
  {
    question: 'Is it safe for children?',
    answer: 'Yes. LexiClash is designed for players ages 6 and up. We comply with COPPA regulations, serve only non-personalized ads, and do not track children\'s browsing behavior.',
  },
];

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <>
      <FAQPageJsonLd items={FAQ_ITEMS} />
      <HomePageClient />

      {/* Server-rendered SEO content — visible to crawlers without JS execution.
          Hidden visually since the client-side LandingSEOSection covers the same content
          with richer interactivity. This is a fallback for non-JS bots (e.g. AdSense). */}
      <section className="sr-only" aria-hidden="true">
        <h2>What is LexiClash?</h2>
        <p>
          LexiClash is a free, fast-paced multiplayer word game you can play right in your browser.
          Compete with friends in real-time word battles on a shared letter grid — find words, build
          combos, and climb the leaderboard. No download required. Available in English, Hebrew,
          Swedish, Japanese, and Spanish.
        </p>
        <h2>Game Modes</h2>
        <ul>
          <li>Multiplayer Rooms — Create a private room and share the code with up to 20 friends.</li>
          <li>Single Player vs. Bots — Practice your word-finding skills against AI opponents.</li>
          <li>Daily Challenge — A fresh puzzle every day, identical for all players worldwide.</li>
          <li>Adventure Mode — Journey through 10 themed worlds with 100 levels.</li>
        </ul>
        <h2>Legal &amp; Policies</h2>
        <nav>
          <ul>
            <li><a href={`/${locale}/legal/privacy`}>Privacy Policy</a></li>
            <li><a href={`/${locale}/legal/terms`}>Terms of Service</a></li>
            <li><a href={`/${locale}/legal/disclaimer`}>Disclaimer</a></li>
            <li><a href={`/${locale}/about`}>About LexiClash</a></li>
            <li><a href={`/${locale}/contact`}>Contact Us</a></li>
          </ul>
        </nav>
      </section>
    </>
  );
}
