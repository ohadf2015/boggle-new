import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import CommunityPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'community', path: '/community', locale });
}

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Community Word Game Boards - Create & Share Custom Puzzles',
    description: 'Discover thousands of community-created word game boards with unique images, themes, and layouts. Create your own custom word puzzle boards, share them with friends, and play user-generated content from word game fans around the world.',
    features: [
      'Create custom word game boards with your own images and themes',
      'Share your word puzzle boards with friends and the community',
      'Browse and play thousands of community-created boards',
      'Design unique layouts and custom tile arrangements',
      'Like and save your favorite community boards for quick access',
    ],
    faq: [
      { question: 'How do I create my own custom word game board?', answer: 'Use the board creator to upload images, choose a theme, and arrange tiles into your custom layout. Once finished, share your board with a unique link.' },
      { question: 'Are community word game boards free to play?', answer: 'Yes, all community-created boards are free to play. Browse the library, pick any board, and start playing instantly.' },
      { question: 'Can I create my own word puzzle with custom words?', answer: 'Absolutely. The board creator lets you define the word list, tile layout, difficulty, and visual theme for a fully personalized puzzle experience.' },
      { question: 'How do community word games work?', answer: 'Players submit their custom boards to the community hub. Other players can discover, rate, and play them. Top-rated boards are featured in the community spotlight.' },
      { question: 'What makes LexiClash community boards different?', answer: 'Every board is uniquely crafted by real players with custom images, themes, and word sets—making each game a fresh and creative experience unlike standard word games.' },
    ],
  },
  he: {
    title: 'לוחות משחק מילים קהילתיים - צרו ושתפו פאזלים מותאמים אישית',
    description: 'גלו אלפי לוחות משחק מילים שנוצרו על ידי הקהילה עם תמונות, ערכות נושא ופריסות ייחודיות. צרו לוחות פאזל מילים משלכם, שתפו אותם עם חברים ושחקו תכנים שנוצרו על ידי משתמשים מכל העולם.',
    features: [
      'צרו לוחות משחק מילים מותאמים אישית עם תמונות וערכות נושא שלכם',
      'שתפו לוחות פאזל עם חברים ועם הקהילה',
      'עיינו ושחקו אלפי לוחות שנוצרו על ידי הקהילה',
      'עצבו פריסות ייחודיות וסידורי אריחים מותאמים אישית',
      'דרגו ושמרו את לוחות הקהילה האהובים עליכם',
    ],
    faq: [
      { question: 'כיצד יוצרים לוח משחק מילים מותאם אישית?', answer: 'השתמשו בכלי יצירת הלוחות כדי להעלות תמונות, לבחור ערכת נושא ולסדר אריחים בפריסה המועדפת עליכם. לאחר הסיום, שתפו את הלוח שלכם בקישור ייחודי.' },
      { question: 'האם לוחות קהילתיים חינמיים לשחקן?', answer: 'כן, כל הלוחות שנוצרו על ידי הקהילה חינמיים לשחקן. עיינו בספרייה, בחרו לוח ושחקו מיידית.' },
      { question: 'מה מייחד את לוחות הקהילה של LexiClash?', answer: 'כל לוח נוצר על ידי שחקנים אמיתיים עם תמונות, ערכות נושא ומערכות מילים מותאמות אישית, מה שהופך כל משחק לחוויה יצירתית ורעננה.' },
    ],
  },
  ja: {
    title: 'コミュニティワードゲームボード - カスタムパズルを作成・共有',
    description: 'ユニークな画像やテーマ、レイアウトを持つコミュニティ作成のワードゲームボードを発見しましょう。カスタムワードパズルボードを作成して友達と共有できます。',
    features: [
      'オリジナル画像とテーマでカスタムワードゲームボードを作成',
      '友達やコミュニティとボードを共有',
      '数千のコミュニティ作成ボードをブラウズして遊ぶ',
    ],
    faq: [],
  },
  sv: {
    title: 'Gemenskapsskapade Ordspelsbräden - Skapa och Dela Ordpussel',
    description: 'Upptäck tusentals gemenskapsskapade ordspelsbräden med unika bilder och teman. Skapa egna anpassade ordpusselbräden och dela dem med vänner.',
    features: [
      'Skapa anpassade ordspelsbräden med egna bilder och teman',
      'Dela dina pusselbrädor med vänner och gemenskapen',
    ],
    faq: [],
  },
  es: {
    title: 'Tableros de Juego de Palabras Comunitarios - Crea y Comparte Puzzles',
    description: 'Descubre miles de tableros de juegos de palabras creados por la comunidad con imágenes, temas y diseños únicos. Crea tus propios tableros de puzzles de palabras, compártelos con amigos y juega contenido generado por usuarios de todo el mundo.',
    features: [
      'Crea tableros de juegos de palabras personalizados con tus propias imágenes y temas',
      'Comparte tus tableros de puzzles con amigos y la comunidad',
      'Explora y juega miles de tableros creados por la comunidad',
      'Diseña diseños únicos y arreglos de fichas personalizados',
      'Valora y guarda tus tableros comunitarios favoritos',
    ],
    faq: [
      { question: '¿Cómo creo un tablero de juego de palabras personalizado?', answer: 'Usa el creador de tableros para subir imágenes, elegir un tema y organizar las fichas. Cuando termines, comparte tu tablero con un enlace único.' },
      { question: '¿Son gratuitos los tableros de la comunidad?', answer: 'Sí, todos los tableros creados por la comunidad son gratuitos. Explora la biblioteca, elige cualquier tablero y empieza a jugar al instante.' },
      { question: '¿Puedo crear mi propio puzzle de palabras con palabras personalizadas?', answer: 'Por supuesto. El creador de tableros te permite definir la lista de palabras, el diseño de fichas, la dificultad y el tema visual para una experiencia de puzzle totalmente personalizada.' },
    ],
  },
};

export default async function CommunityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale as keyof typeof seoContent] ?? seoContent.en;
  return (
    <>
      <CommunityPageClient />
      <GamePageSeoContent
        title={content.title}
        description={content.description}
        features={content.features}
        faq={content.faq}
      />
    </>
  );
}
