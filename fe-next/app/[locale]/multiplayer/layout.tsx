import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Online Multiplayer Word Game Free - Play With Friends, No Download',
    description: 'Play the best online multiplayer word game free with friends — no download needed! Host or join real-time word battle rooms and compete live. Like Words With Friends meets Boggle but everyone plays at once. Perfect for parties, game nights, and quick matches.',
    features: [
      'Create private rooms or join public games instantly',
      'Real-time competitive word finding with live scoring',
      'Multiple game modes: Classic, Blast, and Word Hunt',
      'Invite friends via shareable room links',
      'Live leaderboard updates during each round',
      'Works on any device - phone, tablet, or desktop',
    ],
    faq: [
      { question: 'Can I play this online multiplayer word game free with friends?', answer: 'Yes! LexiClash is a completely free online multiplayer word game. No download needed — just create a room, share the link, and compete in real-time word battles. Works on any device with a browser.' },
      { question: 'How do I start a multiplayer game?', answer: 'Click "Create Room" to host a game. Share the room code or link with friends so they can join. Once everyone is in, the host starts the round.' },
      { question: 'How many players can join a room?', answer: 'Each room supports up to 20+ players for the best competitive experience. Spectators can also watch ongoing games.' },
      { question: 'What game modes are available in multiplayer?', answer: 'Choose from Classic (find the most words), Blast (chain words for combos), or Word Hunt (find the hidden target word in 10 attempts).' },
      { question: 'Is this online multiplayer word game like Words With Friends or Boggle?', answer: 'LexiClash combines the best of both! Like Boggle, you find words on a letter grid. Like Words With Friends, you play with friends online. But the twist — this online multiplayer word game has everyone competing in real-time simultaneously, making it faster and more exciting!' },
    ],
  },
  he: {
    title: 'קרב מילים מרובה משתתפים - שחקו עם חברים אונליין',
    description: 'צרו חדרי משחק או הצטרפו למשחקים בזמן אמת והתחרו מול חברים. מושלם למסיבות וערבי משחקים.',
    features: [
      'צרו חדרים פרטיים או הצטרפו למשחקים ציבוריים',
      'תחרות מציאת מילים בזמן אמת עם ניקוד חי',
      'מצבי משחק מרובים: קלאסי, בלאסט ומצא מילה',
      'הזמינו חברים באמצעות קישור שיתוף',
    ],
    faq: [
      { question: 'איך מתחילים משחק מרובה משתתפים?', answer: 'לחצו על "צור חדר" כדי לארח משחק. שתפו את קוד החדר או הקישור עם חברים כדי שיוכלו להצטרף.' },
    ],
  },
  ja: {
    title: 'マルチプレイヤーワードバトル - 友達とオンラインで対戦',
    description: 'リアルタイムのワードゲームルームを作成または参加して、友達とライブで競い合いましょう。',
    features: [
      'プライベートルームの作成またはパブリックゲームへの参加',
      'リアルタイムのスコアリング付き単語探し競争',
      '共有リンクで友達を招待',
    ],
    faq: [],
  },
  sv: {
    title: 'Multiplayer Ordstrid - Spela Med Vaenner Online',
    description: 'Skapa eller gaa med i realtids ordspelrum och taevla mot vaenner.',
    features: ['Skapa privata rum eller gaa med i offentliga spel', 'Realtids ordsokning med live-poaeng'],
    faq: [],
  },
  es: {
    title: 'Batalla de Palabras Multijugador - Juega Con Amigos Online',
    description: 'Crea o unete a salas de juegos de palabras en tiempo real y compite contra amigos.',
    features: ['Crea salas privadas o unete a juegos publicos', 'Competencia en tiempo real con puntuacion en vivo'],
    faq: [],
  },
};

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const t = await loadTranslation(validLocale) as Record<string, any>;
  const enT = await loadTranslation('en') as Record<string, any>;
  const seo = t?.seo?.multiplayer || enT.seo.multiplayer;
  const baseSeo = t?.seo || enT.seo;

  const localePath = `/${locale}`;
  const ogImage = locale === 'he'
    ? 'https://www.lexiclash.live/og-image-he.jpg'
    : 'https://www.lexiclash.live/og-image-en.jpg';

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/multiplayer`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Multiplayer Word Battle',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [ogImage],
    },
    alternates: {
      canonical: `https://www.lexiclash.live${localePath}/multiplayer`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/multiplayer',
        he: 'https://www.lexiclash.live/he/multiplayer',
        en: 'https://www.lexiclash.live/en/multiplayer',
        sv: 'https://www.lexiclash.live/sv/multiplayer',
        ja: 'https://www.lexiclash.live/ja/multiplayer',
        es: 'https://www.lexiclash.live/es/multiplayer',
        'en-IL': 'https://www.lexiclash.live/en/multiplayer',
        'he-IL': 'https://www.lexiclash.live/he/multiplayer',
        'en-US': 'https://www.lexiclash.live/en/multiplayer',
        'es-US': 'https://www.lexiclash.live/es/multiplayer',
        'en-GB': 'https://www.lexiclash.live/en/multiplayer',
        'en-SE': 'https://www.lexiclash.live/en/multiplayer',
        'sv-SE': 'https://www.lexiclash.live/sv/multiplayer',
        'en-JP': 'https://www.lexiclash.live/en/multiplayer',
        'ja-JP': 'https://www.lexiclash.live/ja/multiplayer',
        'en-ES': 'https://www.lexiclash.live/en/multiplayer',
        'es-ES': 'https://www.lexiclash.live/es/multiplayer',
        'en-MX': 'https://www.lexiclash.live/en/multiplayer',
        'es-MX': 'https://www.lexiclash.live/es/multiplayer',
        'en-AU': 'https://www.lexiclash.live/en/multiplayer',
        'es-AR': 'https://www.lexiclash.live/es/multiplayer',
        'es-CO': 'https://www.lexiclash.live/es/multiplayer',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface MultiplayerLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function MultiplayerLayout({ children, params }: MultiplayerLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  const localePath = `/${locale}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `https://www.lexiclash.live${localePath}/multiplayer#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'LexiClash',
        item: `https://www.lexiclash.live${localePath}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Multiplayer',
        item: `https://www.lexiclash.live${localePath}/multiplayer`,
      },
    ],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `https://www.lexiclash.live${localePath}/multiplayer#webpage`,
    url: `https://www.lexiclash.live${localePath}/multiplayer`,
    name: 'Multiplayer - LexiClash',
    description: 'Free online multiplayer word game — join real-time word battles with friends! Host or join rooms and compete live.',
    isPartOf: {
      '@id': 'https://www.lexiclash.live/#website',
    },
    breadcrumb: {
      '@id': `https://www.lexiclash.live${localePath}/multiplayer#breadcrumb`,
    },
    about: {
      '@id': 'https://www.lexiclash.live/#webapp',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbSchema, webPageSchema]) }}
      />
      {children}
    </>
  );
}
