'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

const bioByLocale: Record<string, string> = {
  en: 'Cognitive science enthusiast exploring how word games impact brain health, learning, and cognitive development.',
  he: 'חובבת מדעי הקוגניציה, חוקרת כיצד משחקי מילים משפיעים על בריאות המוח, למידה והתפתחות קוגניטיבית.',
  sv: 'Kognitionsvetenskapsentusiast som utforskar hur ordspel paverkar hjarnhalsa, larande och kognitiv utveckling.',
  ja: '\u8a8d\u77e5\u79d1\u5b66\u611b\u597d\u5bb6\u3002\u30ef\u30fc\u30c9\u30b2\u30fc\u30e0\u304c\u8133\u306e\u5065\u5eb7\u3001\u5b66\u7fd2\u3001\u8a8d\u77e5\u767a\u9054\u306b\u4e0e\u3048\u308b\u5f71\u97ff\u3092\u63a2\u6c42\u3002',
  es: 'Entusiasta de la ciencia cognitiva que explora como los juegos de palabras impactan la salud cerebral, el aprendizaje y el desarrollo cognitivo.',
};

const titleByLocale: Record<string, string> = {
  en: 'Senior Word Game Researcher & Game Designer',
  he: '\u05d7\u05d5\u05e7\u05e8\u05ea \u05de\u05e9\u05d7\u05e7\u05d9 \u05de\u05d9\u05dc\u05d9\u05dd \u05d1\u05db\u05d9\u05e8\u05d4 \u05d5\u05de\u05e2\u05e6\u05d1\u05ea \u05de\u05e9\u05d7\u05e7\u05d9\u05dd',
  sv: 'Senior ordspelsforskare & speldesigner',
  ja: '\u30b7\u30cb\u30a2\u30ef\u30fc\u30c9\u30b2\u30fc\u30e0\u30ea\u30b5\u30fc\u30c1\u30e3\u30fc & \u30b2\u30fc\u30e0\u30c7\u30b6\u30a4\u30ca\u30fc',
  es: 'Investigadora senior de juegos de palabras y disenadora de juegos',
};

export function AuthorBioCard() {
  const { theme } = useTheme();
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const isDarkMode = theme === 'dark';

  const bio = bioByLocale[locale] || bioByLocale.en;
  const title = titleByLocale[locale] || titleByLocale.en;

  return (
    <div className={cn(
      'mt-10 mb-8 p-4 md:p-5 rounded-neo border-3 border-neo-black shadow-hard flex flex-col sm:flex-row items-center sm:items-start gap-4',
      isDarkMode ? 'bg-slate-800' : 'bg-neo-cream'
    )}>
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full border-3 border-neo-black flex items-center justify-center shrink-0 bg-gradient-to-br from-neo-lime to-neo-cyan font-black text-neo-black text-xl">
        WN
      </div>

      {/* Info */}
      <div className="text-center sm:text-start">
        <Link
          href={`/${locale}/about/the-word-nerd`}
          className={cn('font-bold text-base hover:underline', isDarkMode ? 'text-white' : 'text-neo-black')}
        >
          The Word Nerd
        </Link>
        <p className={cn('text-xs font-semibold mt-0.5', isDarkMode ? 'text-neo-lime' : 'text-gray-600')}>
          {title}
        </p>
        <p className={cn('text-sm mt-2 leading-relaxed', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
          {bio}
        </p>
      </div>
    </div>
  );
}
