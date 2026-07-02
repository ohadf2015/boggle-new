import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import LightningRoundPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainLightningRound', path: '/brain/drills/lightning-round', locale, noIndex: true });
}

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Lightning Round — Rapid-Fire Word Speed Drill',
    description: 'Find words as fast as humanly possible in this rapid-fire brain drill. Lightning Round features an extremely short timer that resets with each word found — stop for a moment and the round ends. Perfect for training reaction speed and quick word recognition.',
    features: [
      'Ultra-short timer resets with every word submitted',
      'Trains reaction speed and rapid word recognition',
      'Progressive difficulty with shrinking time windows',
      'Speed leaderboard ranks fastest word-finders globally',
      'Available in 5 languages with instant feedback',
    ],
    faq: [
      {
        question: 'How fast is the Lightning Round timer?',
        answer: 'The timer starts at a few seconds and shrinks as you find more words. Top players operate in sub-2-second windows. The drill is designed to push you to the absolute limit of your word-finding speed.',
      },
      {
        question: 'Does speed training help with word games?',
        answer: 'Yes. Research shows that speed drills improve both reaction time and pattern recognition. Players who train with Lightning Round regularly report finding words faster in all other game modes — including multiplayer where speed is the difference between winning and losing.',
      },
      {
        question: 'Is Lightning Round too hard for beginners?',
        answer: 'The drill adapts to your level. Beginners start with generous time windows that gradually shrink as skills improve. Even finding 5-10 words in a session is great progress for new players.',
      },
    ],
  },
  he: {
    title: 'סיבוב ברק — תרגיל מהירות מילים',
    description: 'מצאו מילים כמה שיותר מהר בתרגיל מוח מהיר זה. סיבוב ברק כולל טיימר קצר במיוחד שמתאפס עם כל מילה — עצרו לרגע והסיבוב נגמר.',
    features: [
      'טיימר קצר מאוד שמתאפס עם כל מילה',
      'מאמן מהירות תגובה וזיהוי מילים מהיר',
      'קושי מתקדם עם חלונות זמן מתכווצים',
      'טבלת מובילים מדרגת את מוצאי המילים המהירים ביותר',
    ],
    faq: [
      {
        question: 'כמה מהיר הטיימר בסיבוב ברק?',
        answer: 'הטיימר מתחיל בכמה שניות ומתכווץ ככל שמוצאים יותר מילים. שחקנים מנוסים פועלים בחלונות של פחות מ-2 שניות. התרגיל מתוכנן לדחוף אתכם לגבול המהירות המוחלט.',
      },
    ],
  },
  ja: {
    title: 'ライトニングラウンド — 高速ワードドリル',
    description: '超短タイマーで可能な限り速く単語を見つける脳トレドリル。反応速度と素早い単語認識を鍛えます。',
    features: [
      '単語を送信するたびにリセットされる超短タイマー',
      '反応速度と高速単語認識をトレーニング',
      'スピードランキングで世界中のプレイヤーと競争',
    ],
    faq: [],
  },
  sv: {
    title: 'Blixtrundan — Snabb Ordoevning',
    description: 'Hitta ord saa snabbt som maenskligt moejligt. Extremt kort timer som aatersaetts med varje ord.',
    features: ['Ultrakorttimer', 'Trainar reaktionshastighet', 'Progressiv svaarighet'],
    faq: [],
  },
  es: {
    title: 'Ronda Relampago — Ejercicio de Velocidad de Palabras',
    description: 'Encuentra palabras lo mas rapido posible en este ejercicio cerebral de fuego rapido. Ronda Relampago presenta un temporizador ultra corto que se reinicia con cada palabra — detente un momento y la ronda termina.',
    features: [
      'Temporizador ultra corto que se reinicia con cada palabra',
      'Entrena velocidad de reaccion y reconocimiento rapido de palabras',
      'Dificultad progresiva con ventanas de tiempo cada vez menores',
      'Tabla de lideres de velocidad clasifica los buscadores de palabras mas rapidos',
    ],
    faq: [
      {
        question: 'Que tan rapido es el temporizador de Ronda Relampago?',
        answer: 'El temporizador comienza con unos pocos segundos y se reduce a medida que encuentras mas palabras. Los mejores jugadores operan en ventanas de menos de 2 segundos.',
      },
    ],
  },
};

export default async function LightningRoundPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] || seoContent.en;
  return (
    <>
      <LightningRoundPageClient />
      <GamePageSeoContent title={content.title} description={content.description} features={content.features} faq={content.faq} />
    </>
  );
}
