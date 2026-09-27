'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

const bioByLocale: Record<string, string> = {
  en: 'Founder and editor-in-chief of LexiClash. 8+ years designing word games and reading cognitive-science research. Every claim in my articles is sourced and fact-checked against peer-reviewed studies — see our editorial policy.',
  he: 'מייסד ועורך ראשי של LexiClash. מעל 8 שנים של עיצוב משחקי מילים וקריאה של מחקר במדעי הקוגניציה. כל טענה במאמרים מתועדת ועוברת בדיקת עובדות מול מחקרים שנסקרו על ידי עמיתים — ראו את מדיניות העריכה.',
  sv: 'Grundare och chefredaktör för LexiClash. 8+ års design av ordspel och läsning av kognitionsforskning. Varje påstående i mina artiklar är källbelagt och faktagranskat mot peer-reviewade studier — se vår redaktionella policy.',
  ja: 'LexiClashの創設者兼編集長。ワードゲーム設計と認知科学の研究を8年以上続けている。記事のすべての主張は査読付き研究から出典が示され、事実確認されている — 編集方針を参照。',
  es: 'Fundador y editor jefe de LexiClash. Más de 8 años diseñando juegos de palabras y leyendo investigación en ciencia cognitiva. Cada afirmación en mis artículos está documentada y verificada contra estudios revisados por pares — consulta nuestra política editorial.',
};

const titleByLocale: Record<string, string> = {
  en: 'Founder & Editor-in-Chief, LexiClash',
  he: 'מייסד ועורך ראשי, LexiClash',
  sv: 'Grundare & Chefredaktör, LexiClash',
  ja: 'LexiClash 創設者兼編集長',
  es: 'Fundador y Editor Jefe, LexiClash',
};

const editorialByLocale: Record<string, string> = {
  en: 'Editorial Policy',
  he: 'מדיניות עריכה',
  sv: 'Redaktionell policy',
  ja: '編集方針',
  es: 'Política editorial',
};

export function AuthorBioCard() {
  const { theme } = useTheme();
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const isDarkMode = theme === 'dark';

  const bio = bioByLocale[locale] || bioByLocale.en;
  const title = titleByLocale[locale] || titleByLocale.en;
  const editorialLabel = editorialByLocale[locale] || editorialByLocale.en;

  return (
    <div className={cn(
      'mt-10 mb-8 p-4 md:p-5 rounded-neo border-3 border-neo-black shadow-hard flex flex-col sm:flex-row items-center sm:items-start gap-4',
      isDarkMode ? 'bg-neo-navy-light' : 'bg-neo-cream'
    )}>
      <Image
        src="/images/author-ohad.png"
        alt="Ohad Fisher, Founder and Editor-in-Chief of LexiClash"
        width={72}
        height={72}
        className="w-18 h-18 rounded-full border-3 border-neo-black shrink-0 object-cover"
      />

      <div className="text-center sm:text-start flex-1">
        <Link
          href={`/${locale}/about/ohad-fisher`}
          className={cn('font-bold text-base hover:underline', isDarkMode ? 'text-white' : 'text-neo-black')}
        >
          Ohad Fisher
        </Link>
        <p className={cn('text-xs font-semibold mt-0.5', isDarkMode ? 'text-neo-lime' : 'text-gray-600')}>
          {title}
        </p>
        <p className={cn('text-sm mt-2 leading-relaxed', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
          {bio}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
          <Link
            href={`/${locale}/editorial-policy`}
            className={cn(
              'text-xs font-bold underline',
              isDarkMode ? 'text-neo-lime' : 'text-neo-black'
            )}
          >
            {editorialLabel}
          </Link>
          <a
            href="mailto:editor@lexiclash.live"
            className={cn(
              'text-xs font-bold underline',
              isDarkMode ? 'text-neo-cyan' : 'text-neo-black'
            )}
          >
            editor@lexiclash.live
          </a>
        </div>
      </div>
    </div>
  );
}
