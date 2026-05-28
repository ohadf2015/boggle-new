'use client';

import { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { FlaskConical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DrillType } from '@/shared/types/cognitive';

interface ResearchCopy {
  domain: string;
  blurb: string;
  source: string;
}

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

const COPY: Record<DrillType, Record<Locale, ResearchCopy>> = {
  'lightning-round': {
    en: { domain: 'Processing Speed', blurb: 'How quickly your brain retrieves and validates words. Speeded retrieval is used clinically in verbal fluency tests.', source: 'Salthouse 1996 · NIH Verbal Fluency' },
    he: { domain: 'מהירות עיבוד', blurb: 'באיזו מהירות המוח שולף ומאמת מילים. שליפה מהירה משמשת קלינית במבחני שטף מילולי.', source: 'Salthouse 1996 · NIH שטף מילולי' },
    sv: { domain: 'Processhastighet', blurb: 'Hur snabbt hjärnan hämtar och validerar ord. Snabb hämtning används kliniskt i tester av verbal flyt.', source: 'Salthouse 1996 · NIH Verbal Flyt' },
    ja: { domain: '処理速度', blurb: '脳が単語を取得し検証する速度。速度のある検索は言語流暢性検査などで臨床的に使用されます。', source: 'Salthouse 1996 · NIH 言語流暢性' },
    es: { domain: 'Velocidad de procesamiento', blurb: 'Qué tan rápido tu cerebro recupera y valida palabras. La recuperación rápida se usa clínicamente en pruebas de fluidez verbal.', source: 'Salthouse 1996 · NIH Fluidez Verbal' },
  },
  'memory-hunt': {
    en: { domain: 'Working Memory', blurb: 'Holds task-relevant information online while you manipulate it. The most-studied cognitive intervention in the literature.', source: 'NIH PMC5930973 · Diamond 2013' },
    he: { domain: 'זיכרון עבודה', blurb: 'מחזיק מידע רלוונטי בזמן עיבוד פעיל. ההתערבות הקוגניטיבית הנחקרת ביותר בספרות.', source: 'NIH PMC5930973 · Diamond 2013' },
    sv: { domain: 'Arbetsminne', blurb: 'Håller uppgiftsrelevant information online medan du manipulerar den. Den mest studerade kognitiva interventionen i litteraturen.', source: 'NIH PMC5930973 · Diamond 2013' },
    ja: { domain: 'ワーキングメモリ', blurb: '操作中に課題関連情報を保持するシステム。文献で最も研究されている認知介入。', source: 'NIH PMC5930973 · Diamond 2013' },
    es: { domain: 'Memoria de trabajo', blurb: 'Mantiene información relevante mientras la manipulas. La intervención cognitiva más estudiada en la literatura.', source: 'NIH PMC5930973 · Diamond 2013' },
  },
  'combo-master': {
    en: { domain: 'Sustained Attention', blurb: 'Maintain focus across many consecutive responses without lapses. Operationalized in the Continuous Performance Test, a clinical ADHD marker.', source: 'CPT · Rosvold et al.' },
    he: { domain: 'ריכוז ממושך', blurb: 'שמירה על מיקוד לאורך תגובות עוקבות בלי הסחות. נמדד במבחן הביצוע הרציף, סמן קליני ל-ADHD.', source: 'CPT · Rosvold et al.' },
    sv: { domain: 'Uthållig uppmärksamhet', blurb: 'Bibehåll fokus över på varandra följande svar utan luckor. Operationaliseras i Continuous Performance Test, en klinisk ADHD-markör.', source: 'CPT · Rosvold et al.' },
    ja: { domain: '持続的注意', blurb: '途切れなく連続応答にわたって集中を維持。連続パフォーマンステストで操作化、ADHDの臨床マーカー。', source: 'CPT · Rosvold et al.' },
    es: { domain: 'Atención sostenida', blurb: 'Mantén el enfoque a través de muchas respuestas consecutivas sin lapsus. Operacionalizada en la Prueba de Rendimiento Continuo, marcador clínico del TDAH.', source: 'CPT · Rosvold et al.' },
  },
  'pattern-switcher': {
    en: { domain: 'Cognitive Flexibility', blurb: 'Switch mental sets when rules change. One of Adele Diamond’s three core executive functions, studied via Stroop and Wisconsin Card Sorting.', source: 'Diamond 2013 · Stroop · WCST' },
    he: { domain: 'גמישות קוגניטיבית', blurb: 'החלפת סטים מנטליים כשהחוקים משתנים. אחד משלושת התפקודים הניהוליים המרכזיים של אדל דיימונד, נחקר ב-Stroop ו-Wisconsin Card Sorting.', source: 'Diamond 2013 · Stroop · WCST' },
    sv: { domain: 'Kognitiv flexibilitet', blurb: 'Byt mentala set när reglerna ändras. En av Adele Diamonds tre kärnexekutiva funktioner, studerad via Stroop och Wisconsin Card Sorting.', source: 'Diamond 2013 · Stroop · WCST' },
    ja: { domain: '認知的柔軟性', blurb: 'ルールが変わったら精神的セットを切り替える。アデル・ダイアモンドの3つの中核実行機能の一つ、StroopとWCSTで研究。', source: 'Diamond 2013 · Stroop · WCST' },
    es: { domain: 'Flexibilidad cognitiva', blurb: 'Cambia conjuntos mentales cuando las reglas cambian. Una de las tres funciones ejecutivas centrales de Adele Diamond, estudiada vía Stroop y Wisconsin Card Sorting.', source: 'Diamond 2013 · Stroop · WCST' },
  },
  'rare-gems': {
    en: { domain: 'Vocabulary Depth', blurb: 'Access to low-frequency words in semantic memory. The most stable cognitive measure across the lifespan.', source: 'Duke 2022 · Crossword study' },
    he: { domain: 'עומק אוצר מילים', blurb: 'גישה למילים בתדירות נמוכה בזיכרון הסמנטי. המדד הקוגניטיבי היציב ביותר לאורך החיים.', source: 'Duke 2022 · מחקר תשבצים' },
    sv: { domain: 'Ordförrådsdjup', blurb: 'Tillgång till lågfrekventa ord i semantiskt minne. Det mest stabila kognitiva måttet över livstiden.', source: 'Duke 2022 · Korsordsstudien' },
    ja: { domain: '語彙の深さ', blurb: '意味記憶内の低頻度語へのアクセス。生涯で最も安定した認知測定値。', source: 'Duke 2022 · クロスワード研究' },
    es: { domain: 'Profundidad de vocabulario', blurb: 'Acceso a palabras de baja frecuencia en la memoria semántica. La medida cognitiva más estable a lo largo de la vida.', source: 'Duke 2022 · Estudio de crucigramas' },
  },
};

interface DrillResearchIntroProps {
  drillType: DrillType;
}

const STORAGE_KEY_PREFIX = 'lex_drill_intro_seen_';

/**
 * Compact research-grounded intro card shown once per drill per session.
 * Surfaces the cognitive domain + research basis at the moment the user
 * decides to play, addressing the audit P1 finding that research grounding
 * was invisible at point-of-decision.
 */
export default function DrillResearchIntro({ drillType }: DrillResearchIntroProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isDarkMode = theme === 'dark';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seen = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${drillType}`);
      if (!seen) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [drillType]);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${drillType}`, '1');
    } catch {
      // ignore storage failures
    }
  };

  const localeKey = (['en', 'he', 'sv', 'ja', 'es'] as Locale[]).includes(language as Locale)
    ? (language as Locale)
    : 'en';
  const copy = COPY[drillType][localeKey];

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={cn(
            'mx-3 mt-3 rounded-neo border-3 border-neo-black p-3 shadow-hard-sm',
            isDarkMode ? 'bg-neo-navy-light' : 'bg-neo-cream'
          )}
          role="note"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <span className={cn(
              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 border-neo-black bg-neo-purple shadow-hard-sm'
            )}>
              <FlaskConical className="h-4 w-4 text-neo-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn(
                'mb-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest',
                isDarkMode ? 'text-neo-purple' : 'text-neo-purple'
              )}>
                {copy.domain}
              </p>
              <p className={cn(
                'text-xs leading-snug',
                isDarkMode ? 'text-neo-white' : 'text-neo-black/90'
              )}>
                {copy.blurb}
              </p>
              <p className={cn(
                'mt-1 text-[10px] italic',
                isDarkMode ? 'text-neo-white' : 'text-neo-black/50'
              )}>
                {copy.source}
              </p>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className={cn(
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-neo-black shadow-hard-sm transition-all hover:translate-y-[-1px]',
                isDarkMode ? 'bg-neo-navy text-neo-white' : 'bg-neo-cream text-neo-black'
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
