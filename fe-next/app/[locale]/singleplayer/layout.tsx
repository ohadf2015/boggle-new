import { loadTranslation, type TranslationData } from '@/translations/loadTranslation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Play Boggle Online Free - No Download, No Signup Word Game',
    description: 'Play boggle online free — no download required, no signup needed! Practice word finding against AI bots, challenge yourself with multiple difficulty levels, and sharpen your vocabulary skills. Play instantly in your browser.',
    features: [
      'Multiple difficulty levels from beginner to expert',
      'AI opponents that adapt to your skill level',
      'Track your personal best scores and streaks',
      'Supports English, Hebrew, Swedish, Japanese, and Spanish boards',
      'Instant play in your browser - no app download needed',
    ],
    faq: [
      { question: 'Can I play boggle online free with no download?', answer: 'Yes! LexiClash lets you play boggle online completely free with no download and no signup. Just visit lexiclash.live and start playing instantly in your browser on any device.' },
      { question: 'How does single player mode work?', answer: 'You play on a randomized letter grid and find as many words as possible within the time limit. Words must be formed by connecting adjacent letters. Longer words earn more points.' },
      { question: 'Can I play offline?', answer: 'Yes, single player mode works offline once the page has loaded. Your scores are saved locally and sync when you reconnect.' },
      { question: 'What grid sizes are available?', answer: 'Choose from 4x4 (classic), 5x5 (challenge), or 6x6 (expert) grids. Larger grids offer more word possibilities and higher potential scores.' },
      { question: 'Is LexiClash a good alternative to boggle and Words With Friends?', answer: 'LexiClash combines the best of both! Like Boggle, you find words on a letter grid. Like Words With Friends, you can play with friends online. But LexiClash is real-time — everyone competes simultaneously. Free to play, no download needed!' },
    ],
  },
  he: {
    title: 'שחקו בוגל אונליין בחינם - משחק מילים ליחיד',
    description: 'תרגלו מציאת מילים מול בוטים, אתגרו את עצמכם ברמות קושי שונות ושפרו את אוצר המילים שלכם. ללא הורדה.',
    features: [
      'רמות קושי מתחיל ועד מומחה',
      'יריבי AI שמתאימים את עצמם לרמה שלכם',
      'מעקב אחרי שיאים אישיים ורצפים',
      'תמיכה בעברית, אנגלית, שוודית, יפנית וספרדית',
      'משחק מיידי בדפדפן - ללא הורדת אפליקציה',
    ],
    faq: [
      { question: 'איך עובד מצב שחקן יחיד?', answer: 'אתם משחקים על לוח אותיות אקראי ומוצאים כמה שיותר מילים בזמן הקצוב. מילים נוצרות על ידי חיבור אותיות סמוכות. מילים ארוכות יותר מזכות ביותר נקודות.' },
      { question: 'אפשר לשחק אופליין?', answer: 'כן, מצב שחקן יחיד עובד אופליין לאחר שהדף נטען. הניקוד נשמר מקומית ומסתנכרן כשמתחברים מחדש.' },
    ],
  },
  ja: {
    title: 'ボグル オンライン無料 - ソロワードゲーム',
    description: 'AIボットと対戦して単語力を鍛えましょう。複数の難易度レベルで語彙力を磨けます。ダウンロード不要。',
    features: [
      '初心者からエキスパートまでの難易度レベル',
      'あなたのスキルに合わせて適応するAI対戦相手',
      '個人ベストスコアとストリークの追跡',
      '日本語、英語、ヘブライ語、スウェーデン語、スペイン語に対応',
    ],
    faq: [
      { question: 'シングルプレイヤーモードの遊び方は?', answer: 'ランダムに生成された文字グリッド上で、制限時間内にできるだけ多くの単語を見つけます。隣接する文字をつなげて単語を作ります。' },
    ],
  },
  sv: {
    title: 'Spela Boggle Online Gratis - Enspelareordspel',
    description: 'Traena ordsokning mot AI-motstaendare, utmana dig sjaelv med flera svaarighetsnivaaer och skaerp ditt ordfoerraad.',
    features: ['Flera svaarighetsnivaaer', 'AI-motstaendare som anpassar sig', 'Spaaara dina personbaesta'],
    faq: [],
  },
  es: {
    title: 'Jugar Boggle Online Gratis - Juego de Palabras Individual',
    description: 'Practica encontrando palabras contra bots de IA, desafiate con multiples niveles de dificultad y mejora tu vocabulario.',
    features: ['Multiples niveles de dificultad', 'Oponentes IA que se adaptan', 'Seguimiento de mejores puntuaciones'],
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
  const seo = t?.seo?.singleplayer || enT.seo.singleplayer;
  const baseSeo = t?.seo || enT.seo;

  const localePath = `/${locale}`;
  const ogImage = locale === 'he'
    ? 'https://www.lexiclash.live/og-image-he.webp'
    : 'https://www.lexiclash.live/og-image-en.webp';

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/singleplayer`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: 'LexiClash - Single Player Word Game',
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
      canonical: `https://www.lexiclash.live${localePath}/singleplayer`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/singleplayer',
        he: 'https://www.lexiclash.live/he/singleplayer',
        en: 'https://www.lexiclash.live/en/singleplayer',
        sv: 'https://www.lexiclash.live/sv/singleplayer',
        ja: 'https://www.lexiclash.live/ja/singleplayer',
        es: 'https://www.lexiclash.live/es/singleplayer',
        'en-IL': 'https://www.lexiclash.live/en/singleplayer',
        'he-IL': 'https://www.lexiclash.live/he/singleplayer',
        'en-US': 'https://www.lexiclash.live/en/singleplayer',
        'es-US': 'https://www.lexiclash.live/es/singleplayer',
        'en-GB': 'https://www.lexiclash.live/en/singleplayer',
        'en-SE': 'https://www.lexiclash.live/en/singleplayer',
        'sv-SE': 'https://www.lexiclash.live/sv/singleplayer',
        'en-JP': 'https://www.lexiclash.live/en/singleplayer',
        'ja-JP': 'https://www.lexiclash.live/ja/singleplayer',
        'en-ES': 'https://www.lexiclash.live/en/singleplayer',
        'es-ES': 'https://www.lexiclash.live/es/singleplayer',
        'en-MX': 'https://www.lexiclash.live/en/singleplayer',
        'es-MX': 'https://www.lexiclash.live/es/singleplayer',
        'en-AU': 'https://www.lexiclash.live/en/singleplayer',
        'es-AR': 'https://www.lexiclash.live/es/singleplayer',
        'es-CO': 'https://www.lexiclash.live/es/singleplayer',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface SinglePlayerLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function SinglePlayerLayout({ children, params }: SinglePlayerLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  const localePath = `/${locale}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `https://www.lexiclash.live${localePath}/singleplayer#breadcrumb`,
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
        name: 'Single Player',
        item: `https://www.lexiclash.live${localePath}/singleplayer`,
      },
    ],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `https://www.lexiclash.live${localePath}/singleplayer#webpage`,
    url: `https://www.lexiclash.live${localePath}/singleplayer`,
    name: 'Single Player - LexiClash',
    description: 'Play LexiClash solo! Practice word finding, challenge AI bots, and improve your vocabulary.',
    isPartOf: {
      '@id': 'https://www.lexiclash.live/#website',
    },
    breadcrumb: {
      '@id': `https://www.lexiclash.live${localePath}/singleplayer#breadcrumb`,
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
      <GamePageSeoContent
        asH1
        collapsible
        title={seoContent[locale as keyof typeof seoContent]?.title || seoContent.en.title}
        description={seoContent[locale as keyof typeof seoContent]?.description || seoContent.en.description}
        features={seoContent[locale as keyof typeof seoContent]?.features || seoContent.en.features}
        faq={seoContent[locale as keyof typeof seoContent]?.faq || seoContent.en.faq}
      />
    </>
  );
}
