import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { VideoGameJsonLd } from '@/components/seo/VideoGameJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import BrainTrainingPageClient from './PageClient';
import { SUPPORTED_LOCALES } from '@/lib/localeResolution';

export const revalidate = 3600;

/**
 * Was `force-dynamic`, which re-rendered this page on every request and made it
 * uncacheable — for no gain: everything the server emits here (metadata, the
 * static per-locale SEO copy below, the JSON-LD) is deterministic per locale,
 * with no cookies, headers, searchParams or request-time fetch. The drills
 * themselves live in the client component.
 *
 * `generateStaticParams` is required for the `revalidate` above to do anything:
 * the enclosing `[locale]` segment is dynamic, so without it Next cannot
 * prerender the route and serves `no-store`. See
 * app/[locale]/__tests__/prerenderedLocaleRoutes.test.ts.
 */
export function generateStaticParams(): Array<{ locale: string }> {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brain', path: '/brain', locale });
}

const seoContent: Record<string, { title: string; description: string; features: string[]; faq: { question: string; answer: string }[] }> = {
  en: {
    title: 'Brain Training Word Games — 5 Cognitive Drills',
    description: 'Sharpen your mind with five science-backed word drills designed to improve memory, pattern recognition, reaction time, and vocabulary depth. Each session adapts to your skill level for maximum cognitive benefit.',
    features: [
      'Memory Hunt — recall words from previous boards',
      'Pattern Switcher — flex your cognitive flexibility',
      'Combo Master — sustain focus under pressure',
      'Rare Gems — expand your vocabulary with uncommon words',
      'Lightning Round — build reaction speed with rapid-fire play',
    ],
    faq: [
      {
        question: 'Are these brain training word games free?',
        answer: 'Yes — all five cognitive word drills are free to play. No download or account required to start.',
      },
      {
        question: 'What cognitive skills do word games improve?',
        answer: 'Regular word game practice strengthens working memory, processing speed, lexical retrieval, and executive function. Our drills target each area separately so you can track improvement.',
      },
      {
        question: 'How long should I practice each day for brain health?',
        answer: 'Research suggests 10–20 minutes of focused cognitive exercise per day produces measurable benefits. Try two or three drills back-to-back for a complete session.',
      },
      {
        question: 'Do the drills get harder over time?',
        answer: 'Yes. Each drill uses adaptive difficulty — as your performance improves the timer tightens, boards grow more complex, and scoring requirements increase.',
      },
    ],
  },
  he: {
    title: 'משחקי מילים לאימון המוח — 5 תרגולים קוגניטיביים',
    description: 'חדד את מוחך עם חמישה תרגולי מילים מבוססי מדע שנועדו לשפר זיכרון, זיהוי דפוסים, זמן תגובה ועומק אוצר המילים. כל סשן מסתגל לרמת המיומנות שלך להשפעה קוגניטיבית מרבית.',
    features: [
      'ציד זיכרון — אתר מילים שראית בלוחות קודמים',
      'מחליף דפוסים — גמישות קוגניטיבית בכל סיבוב',
      'מאסטר קומבו — שמור על ריכוז בלחץ גובר',
      'אבני חן נדירות — העשר את אוצר המילים שלך',
      'סיבוב ברק — בנה מהירות תגובה במשחק מהיר',
    ],
    faq: [
      {
        question: 'האם משחקי מילים לאימון מוח הם בחינם?',
        answer: 'כן — כל חמשת תרגולי המילים הקוגניטיביים חינמיים לחלוטין. אין צורך בהורדה או יצירת חשבון כדי להתחיל.',
      },
      {
        question: 'אילו כישורים קוגניטיביים משתפרים ממשחקי מילים?',
        answer: 'תרגול קבוע במשחקי מילים מחזק זיכרון עבודה, מהירות עיבוד, שליפה לקסיקלית ותפקוד ניהולי. התרגולים שלנו מכוונים לכל תחום בנפרד.',
      },
    ],
  },
  sv: {
    title: 'Hjärnträning med ordspel — 5 kognitiva övningar',
    description: 'Träna hjärnan med fem vetenskapligt utformade ordövningar som förbättrar minne, mönsterigenkänning, reaktionstid och ordförråd.',
    features: [
      'Minnesjakt — hitta ord du sett tidigare',
      'Mönsterväxlare — öva kognitiv flexibilitet',
      'Kombomästaren — håll fokus under press',
      'Sällsynta pärlor — utöka ditt ordförråd',
      'Blixtronden — testa din reaktionshastighet',
    ],
    faq: [],
  },
  ja: {
    title: '脳トレワードゲーム — 5つの認知ドリル',
    description: '記憶力・パターン認識・反応速度・語彙力を鍛える5つの科学的根拠に基づくワードドリルで、毎日の脳トレを充実させましょう。',
    features: [
      'メモリーハント — 過去のボードで見た単語を探す',
      'パターンスイッチャー — 認知の柔軟性を鍛える',
      'コンボマスター — プレッシャー下で集中力を持続',
      'レアジェム — 珍しい語彙を増やす',
      'ライトニングラウンド — 素早い思考で反応速度アップ',
    ],
    faq: [
      {
        question: '脳トレワードゲームは無料ですか？',
        answer: 'はい、5つのドリルはすべて無料でプレイできます。ダウンロードやアカウント登録も不要です。',
      },
    ],
  },
  es: {
    title: 'Juegos de palabras para entrenar el cerebro — 5 ejercicios cognitivos',
    description: 'Agudiza tu mente con cinco ejercicios de palabras respaldados por la ciencia, diseñados para mejorar la memoria, el reconocimiento de patrones, el tiempo de reacción y la profundidad del vocabulario. Cada sesión se adapta a tu nivel para un beneficio cognitivo máximo.',
    features: [
      'Caza de memoria — encuentra palabras que viste antes',
      'Cambiador de patrones — ejercita la flexibilidad cognitiva',
      'Maestro de combos — mantén el enfoque bajo presión',
      'Gemas raras — amplía tu vocabulario con palabras poco comunes',
      'Ronda relámpago — desarrolla velocidad de reacción',
    ],
    faq: [
      {
        question: '¿Son gratuitos estos juegos de palabras para el cerebro?',
        answer: 'Sí, los cinco ejercicios cognitivos son completamente gratuitos. No se requiere descarga ni cuenta para empezar.',
      },
      {
        question: '¿Qué habilidades cognitivas mejoran los juegos de palabras?',
        answer: 'La práctica regular fortalece la memoria de trabajo, la velocidad de procesamiento, la recuperación léxica y la función ejecutiva.',
      },
    ],
  },
};

export default async function BrainTrainingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = seoContent[locale] || seoContent.en;
  const origin = 'https://www.lexiclash.live';
  return (
    <>
      <VideoGameJsonLd
        mode="brain"
        locale={locale}
        name={content.title}
        description={content.description}
        playMode="SinglePlayer"
        numberOfPlayers={{ minValue: 1, maxValue: 1 }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'LexiClash', url: `${origin}/${locale}` },
          { name: content.title, url: `${origin}/${locale}/brain` },
        ]}
      />
      {/* No GamePageSeoContent here — /brain is a play surface, and the card was a
          content-sized sibling of the client shell's `flex-1` root, which is what kept
          the hub from filling the viewport. Removed 2026-08-27 with /multiplayer and
          /daily. `content` still feeds the JSON-LD above, and the same copy is visible on
          /brain-training-word-games. Pinned by __tests__/appShellSeoContent. */}
      <BrainTrainingPageClient />
    </>
  );
}
