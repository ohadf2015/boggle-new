import type { Metadata } from 'next';
import { wordsByLocale, getRotatedTodayWord, type Locale } from './content';
import WordOfTheDayClient from './PageClient';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import { buildDynamicTitle, buildDynamicDescription, buildSchemas } from './seo';

export const dynamic = 'force-dynamic';

const SITE_URL = 'https://www.lexiclash.live';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const titleMap: Record<string, string> = {
  en: 'Word of the Day - Expand Your Vocabulary | LexiClash',
  he: 'המילה היומית - הרחיבו את אוצר המילים | LexiClash',
  sv: 'Dagens Ord - Utoka Ditt Ordforrad | LexiClash',
  ja: '今日の言葉 - 語彙を広げよう | LexiClash',
  es: 'Palabra del Dia - Amplia Tu Vocabulario | LexiClash',
};

const descriptionMap: Record<string, string> = {
  en: 'Discover a new word every day with LexiClash Word of the Day. Learn definitions, etymology, usage examples, and fun facts. Then practice in our word game!',
  he: 'גלו מילה חדשה כל יום עם המילה היומית של LexiClash. למדו הגדרות, אטימולוגיה, דוגמאות שימוש ועובדות מעניינות.',
  sv: 'Upptack ett nytt ord varje dag med LexiClash Dagens Ord. Lar dig definitioner, etymologi, anvandningsexempel och roliga fakta.',
  ja: 'LexiClashの今日の言葉で毎日新しい言葉を発見。定義、語源、使用例、豆知識を学びましょう。',
  es: 'Descubre una nueva palabra cada dia con LexiClash Palabra del Dia. Aprende definiciones, etimologia, ejemplos de uso y datos curiosos.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const today = new Date().toISOString().slice(0, 10);
  const todayWord = getRotatedTodayWord(locale as Locale, today);
  const title = buildDynamicTitle(locale, todayWord);
  const description = buildDynamicDescription(locale, todayWord);
  const url = `${SITE_URL}/${locale}/word-of-the-day`;
  // Keep static fallbacks for any consumer that imports them.
  void titleMap; void descriptionMap;

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: 'LexiClash',
      images: [{ url: `${SITE_URL}/og-image-${locale === 'he' ? 'he' : 'en'}.webp`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${todayWord.word} - ${title}`,
      description,
    },
    alternates: {
      canonical: url,
      languages: {
        'x-default': `${SITE_URL}/en/word-of-the-day`,
        he: `${SITE_URL}/he/word-of-the-day`,
        en: `${SITE_URL}/en/word-of-the-day`,
        sv: `${SITE_URL}/sv/word-of-the-day`,
        ja: `${SITE_URL}/ja/word-of-the-day`,
        es: `${SITE_URL}/es/word-of-the-day`,
        'en-IL': `${SITE_URL}/en/word-of-the-day`,
        'he-IL': `${SITE_URL}/he/word-of-the-day`,
        'en-US': `${SITE_URL}/en/word-of-the-day`,
        'es-US': `${SITE_URL}/es/word-of-the-day`,
        'en-GB': `${SITE_URL}/en/word-of-the-day`,
        'en-SE': `${SITE_URL}/en/word-of-the-day`,
        'sv-SE': `${SITE_URL}/sv/word-of-the-day`,
        'en-JP': `${SITE_URL}/en/word-of-the-day`,
        'ja-JP': `${SITE_URL}/ja/word-of-the-day`,
        'en-ES': `${SITE_URL}/en/word-of-the-day`,
        'es-ES': `${SITE_URL}/es/word-of-the-day`,
        'en-MX': `${SITE_URL}/en/word-of-the-day`,
        'es-MX': `${SITE_URL}/es/word-of-the-day`,
        'en-AU': `${SITE_URL}/en/word-of-the-day`,
        'es-AR': `${SITE_URL}/es/word-of-the-day`,
        'es-CO': `${SITE_URL}/es/word-of-the-day`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function WordOfTheDayPage({ params }: PageProps) {
  const { locale } = await params;
  const loc = (locale as Locale) || 'en';
  const today = new Date().toISOString().slice(0, 10);
  const todayWord = getRotatedTodayWord(loc, today);
  const allWords = wordsByLocale[loc] || wordsByLocale.en;
  const schemas = buildSchemas(loc, todayWord, `/${loc}/word-of-the-day`);

  // Safe: schemas built entirely from typed helpers + curated word data, no user input
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />
      <WordOfTheDayClient allWords={allWords} featuredWord={todayWord} />
      {(() => {
        const wotdSeoContent: Record<string, {
          title: string; description: string; features: string[];
          faq: { question: string; answer: string }[];
        }> = {
          en: {
            title: 'Word of the Day — Learn a New Word Every Day',
            description: 'Discover a new word every day on LexiClash. Each Word of the Day includes a definition, etymology, usage examples, and fun facts. Expand your vocabulary and then practice the word in our word game.',
            features: [
              'New curated word every day with definition, etymology, and usage examples',
              'Fun facts and word origins to deepen understanding',
              'Practice mode — use the word in a LexiClash game round',
              'Browse past words to review and build long-term vocabulary',
              'Available in English, Hebrew, Swedish, Japanese, and Spanish',
            ],
            faq: [
              { question: 'When does the Word of the Day update?', answer: 'A new word is selected every day at midnight UTC. The word is the same for all players worldwide, so you can discuss it with friends.' },
              { question: 'Can I see previous Words of the Day?', answer: 'Yes — scroll down on the Word of the Day page to browse the archive of past words with their full definitions and fun facts.' },
              { question: 'How are the words chosen?', answer: 'Words are curated from our dictionary to balance common vocabulary with interesting, lesser-known terms. Each word is selected to be educational and fun.' },
            ],
          },
          he: {
            title: 'המילה היומית — למדו מילה חדשה כל יום',
            description: 'גלו מילה חדשה כל יום ב-LexiClash. כל מילה יומית כוללת הגדרה, אטימולוגיה ודוגמאות שימוש.',
            features: [
              'מילה חדשה כל יום עם הגדרה ואטימולוגיה',
              'עובדות מעניינות ומקורות מילים',
              'עברו על מילים קודמות לבניית אוצר מילים',
              'זהה לכל השחקנים בעולם — שתפו עם חברים',
              'חינם, בלי הרשמה ובלי הורדה',
            ],
            faq: [
              { question: 'מתי המילה היומית מתעדכנת?', answer: 'מילה חדשה נבחרת כל יום בחצות UTC. המילה זהה לכל השחקנים בעולם, כך שאפשר לדבר עליה עם חברים.' },
              { question: 'מה זה המילה היומית של LexiClash?', answer: 'המילה היומית היא מילה אחת חדשה שנבחרת מדי יום מהמילון הקיים, עם הגדרה מלאה, אטימולוגיה (מקור המילה) ודוגמאות שימוש. אפשר להשתמש בה אחר כך במשחק LexiClash.' },
              { question: 'איך אפשר לראות את המילים היומיות הקודמות?', answer: 'בעמוד המילה היומית יש ארכיון של מילים מהשבועות והחודשים האחרונים. גוללו מטה כדי לעבור על המילים הקודמות עם ההגדרות המלאות שלהן.' },
              { question: 'האם המילה היומית זהה לכל השחקנים?', answer: 'כן — אותה מילה לכל מי שנכנס ב-24 השעות שלה, בכל העולם. זה הופך את המילה למשהו לדבר עליו: לשתף בקבוצות, להשוות איך הבנתם את ההגדרה ולהשתמש בה במשחק.' },
              { question: 'איך משחקים עם המילה היומית?', answer: 'אחרי שלמדתם את ההגדרה ואת מקור המילה, אפשר ללחוץ על "תרגול" כדי להיכנס לסבב משחק רגיל ב-LexiClash ולנסות למצוא את המילה היומית בלוח. זוכים בנקודות בונוס אם מוצאים אותה.' },
            ],
          },
          sv: {
            title: 'Dagens Ord — Lär Dig Ett Nytt Ord Varje Dag',
            description: 'Upptäck ett nytt ord varje dag på LexiClash. Varje Dagens Ord inkluderar definition, etymologi och användningsexempel.',
            features: ['Nytt kurerat ord varje dag med definition och etymologi', 'Roliga fakta och ordursprung', 'Bläddra bland tidigare ord för att bygga ordförråd'],
            faq: [{ question: 'När uppdateras Dagens Ord?', answer: 'Ett nytt ord väljs varje dag vid midnatt UTC. Ordet är samma för alla spelare världen över.' }],
          },
          ja: {
            title: '今日の言葉 — 毎日新しい言葉を学ぼう',
            description: 'LexiClashで毎日新しい言葉を発見。定義、語源、使用例、豆知識を含みます。',
            features: ['毎日厳選された新しい言葉と定義・語源', '豆知識と言葉の起源', '過去の言葉を閲覧して語彙を構築'],
            faq: [{ question: '今日の言葉はいつ更新されますか？', answer: '毎日UTC午前0時に新しい言葉が選ばれます。世界中のすべてのプレイヤーに同じ言葉が表示されます。' }],
          },
          es: {
            title: 'Palabra del Día — Aprende Una Palabra Nueva Cada Día',
            description: 'Descubre una nueva palabra cada día en LexiClash. Cada Palabra del Día incluye definición, etimología y ejemplos de uso.',
            features: ['Nueva palabra curada cada día con definición y etimología', 'Datos curiosos y orígenes de palabras', 'Modo práctica — usa la palabra en una ronda de juego', 'Explora palabras anteriores para construir vocabulario'],
            faq: [
              { question: '¿Cuándo se actualiza la Palabra del Día?', answer: 'Una nueva palabra se selecciona cada día a medianoche UTC. La palabra es la misma para todos los jugadores en el mundo.' },
              { question: '¿Puedo ver Palabras del Día anteriores?', answer: 'Sí — desplázate hacia abajo en la página para explorar el archivo de palabras anteriores con sus definiciones completas.' },
            ],
          },
        };
        const seoData = wotdSeoContent[locale] ?? wotdSeoContent.en;
        // Safe: faqJsonLd built entirely from typed object, JSON.stringified — no user input.
        const faqJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          '@id': `https://www.lexiclash.live/${locale}/word-of-the-day#faq`,
          inLanguage: locale,
          mainEntity: seoData.faq.map((qa) => ({
            '@type': 'Question',
            name: qa.question,
            acceptedAnswer: { '@type': 'Answer', text: qa.answer },
          })),
        };
        return (
          <>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <GamePageSeoContent
              asH1
              title={seoData.title}
              description={seoData.description}
              features={seoData.features}
              faq={seoData.faq}
            />
          </>
        );
      })()}
    </>
  );
}
