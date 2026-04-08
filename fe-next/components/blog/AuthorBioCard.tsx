'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

const bioByLocale: Record<string, string> = {
  en: 'Obsessive word game player, amateur neuroscience reader, and the guy who ruins game night by taking too long on his turn. Creator of LexiClash.',
  he: 'שחקן משחקי מילים אובססיבי, קורא חובבני של מדעי המוח, והבחור שהורס ערב משחקים כי לוקח לו יותר מדי זמן בתור. יוצר LexiClash.',
  sv: 'Besatt ordspelare, amatörneurovetenskap-läsare, och killen som förstör spelkvällen genom att ta för lång tid på sin tur. Skapare av LexiClash.',
  ja: 'ワードゲーム中毒者、アマチュア脳科学読者、ゲームナイトで自分の番に時間をかけすぎて台無しにする男。LexiClash開発者。',
  es: 'Jugador obsesivo de juegos de palabras, lector amateur de neurociencia, y el tipo que arruina la noche de juegos por tardar demasiado en su turno. Creador de LexiClash.',
};

const titleByLocale: Record<string, string> = {
  en: 'Word Game Addict & Game Designer',
  he: 'מכור למשחקי מילים ומעצב משחקים',
  sv: 'Ordspelsberoende & speldesigner',
  ja: 'ワードゲーム中毒者 & ゲームデザイナー',
  es: 'Adicto a juegos de palabras y diseñador de juegos',
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
      <div className="w-16 h-16 rounded-full border-3 border-neo-black flex items-center justify-center shrink-0 bg-linear-to-br from-neo-lime to-neo-cyan font-black text-neo-black text-xl">
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
