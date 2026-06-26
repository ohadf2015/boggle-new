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
    en: { domain: 'Processing Speed', blurb: 'How fast you spot and lock in words — the same quick recall doctors test for.', source: 'Salthouse 1996 · NIH Verbal Fluency' },
    he: { domain: 'מהירות עיבוד', blurb: 'כמה מהר אתה מזהה ונועל מילים — אותה שליפה מהירה שבודקים במרפאה.', source: 'Salthouse 1996 · NIH שטף מילולי' },
    sv: { domain: 'Processhastighet', blurb: 'Hur snabbt du hittar och bekräftar ord — samma snabba minne som mäts kliniskt.', source: 'Salthouse 1996 · NIH Verbal Flyt' },
    ja: { domain: '処理速度', blurb: '単語を見つけて確定する速さ — 臨床でも測る素早い想起力。', source: 'Salthouse 1996 · NIH 言語流暢性' },
    es: { domain: 'Velocidad de procesamiento', blurb: 'Qué tan rápido encuentras y confirmas palabras — la misma agilidad que miden los médicos.', source: 'Salthouse 1996 · NIH Fluidez Verbal' },
  },
  'memory-hunt': {
    en: { domain: 'Working Memory', blurb: 'Holding words in your head while you search — the most-studied brain workout there is.', source: 'NIH PMC5930973 · Diamond 2013' },
    he: { domain: 'זיכרון עבודה', blurb: 'להחזיק מילים בראש תוך כדי חיפוש — האימון הכי נחקר שיש.', source: 'NIH PMC5930973 · Diamond 2013' },
    sv: { domain: 'Arbetsminne', blurb: 'Att hålla ord i huvudet medan du letar — den mest studerade hjärnträningen.', source: 'NIH PMC5930973 · Diamond 2013' },
    ja: { domain: 'ワーキングメモリ', blurb: '探しながら単語を頭に保つ — 最も研究されている脳トレ。', source: 'NIH PMC5930973 · Diamond 2013' },
    es: { domain: 'Memoria de trabajo', blurb: 'Mantener palabras en la cabeza mientras buscas — el ejercicio mental más estudiado.', source: 'NIH PMC5930973 · Diamond 2013' },
  },
  'combo-master': {
    en: { domain: 'Sustained Attention', blurb: 'Staying locked in word after word — the same focus clinical attention tests measure.', source: 'CPT · Rosvold et al.' },
    he: { domain: 'ריכוז ממושך', blurb: 'להישאר מרוכז מילה אחרי מילה — אותו קשב שמודדים במבחנים קליניים.', source: 'CPT · Rosvold et al.' },
    sv: { domain: 'Uthållig uppmärksamhet', blurb: 'Att hålla fokus ord efter ord — samma uppmärksamhet som kliniska tester mäter.', source: 'CPT · Rosvold et al.' },
    ja: { domain: '持続的注意', blurb: '一語ずつ集中を切らさない — 臨床検査でも測る注意力。', source: 'CPT · Rosvold et al.' },
    es: { domain: 'Atención sostenida', blurb: 'Mantener la concentración palabra tras palabra — la misma que miden las pruebas clínicas.', source: 'CPT · Rosvold et al.' },
  },
  'pattern-switcher': {
    en: { domain: 'Cognitive Flexibility', blurb: 'Switching gears when the rules change — a core executive skill, studied for decades.', source: 'Diamond 2013 · Stroop · WCST' },
    he: { domain: 'גמישות קוגניטיבית', blurb: 'להחליף הילוך כשהחוקים משתנים — מיומנות ניהולית מרכזית שנחקרת עשרות שנים.', source: 'Diamond 2013 · Stroop · WCST' },
    sv: { domain: 'Kognitiv flexibilitet', blurb: 'Att byta växel när reglerna ändras — en central exekutiv förmåga, studerad i decennier.', source: 'Diamond 2013 · Stroop · WCST' },
    ja: { domain: '認知的柔軟性', blurb: 'ルールが変わったら切り替える — 何十年も研究される中核の実行機能。', source: 'Diamond 2013 · Stroop · WCST' },
    es: { domain: 'Flexibilidad cognitiva', blurb: 'Cambiar de marcha cuando cambian las reglas — una función ejecutiva clave, estudiada por décadas.', source: 'Diamond 2013 · Stroop · WCST' },
  },
  'rare-gems': {
    en: { domain: 'Vocabulary Depth', blurb: 'Reaching for rare words taps your deep vocabulary — the most stable skill across a lifetime.', source: 'Duke 2022 · Crossword study' },
    he: { domain: 'עומק אוצר מילים', blurb: 'להגיע למילים נדירות מפעיל את אוצר המילים העמוק שלך — היכולת היציבה ביותר לאורך החיים.', source: 'Duke 2022 · מחקר תשבצים' },
    sv: { domain: 'Ordförrådsdjup', blurb: 'Att nå ovanliga ord använder ditt djupa ordförråd — den mest stabila förmågan genom livet.', source: 'Duke 2022 · Korsordsstudien' },
    ja: { domain: '語彙の深さ', blurb: '珍しい単語に手を伸ばすと深い語彙が働く — 生涯で最も安定した力。', source: 'Duke 2022 · クロスワード研究' },
    es: { domain: 'Profundidad de vocabulario', blurb: 'Buscar palabras raras activa tu vocabulario profundo — la habilidad más estable de por vida.', source: 'Duke 2022 · Estudio de crucigramas' },
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
              type="button"
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
