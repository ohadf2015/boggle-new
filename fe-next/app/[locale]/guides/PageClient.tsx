'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { BookOpen, Zap, Target } from 'lucide-react';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from '@/components/ads';

const guidesContent: Record<string, {
  title: string;
  subtitle: string;
  quickStart: string;
  guides: Array<{ slug: string; title: string; description: string; icon: 'classic' | 'blast' | 'wordHunt' }>;
}> = {
  en: {
    title: 'LexiClash Strategy Guides',
    subtitle: 'Master every game mode with expert strategies, tips, and techniques.',
    quickStart: 'New to LexiClash? Start with Classic mode. It\'s the quickest way to pick up grid scanning, and the time pressure builds good habits fast. Blast makes more sense after a few Classic games — the combo system clicks once you already know how to find words. Word Hunt runs on different logic; it rewards patience over speed. Each guide covers specific scoring patterns for that mode.',
    guides: [
      { slug: 'classic-strategy', title: 'Classic Mode Strategy', description: 'Learn scanning patterns, time management, and scoring strategies to find more words and score higher.', icon: 'classic' },
      { slug: 'blast-strategy', title: 'Blast Mode Mastery', description: 'Unlock the combo system, master tile effects, and chain your way to massive scores.', icon: 'blast' },
      { slug: 'word-hunt-strategy', title: 'Word Hunt Strategy', description: 'Master elimination strategy, vowel placement, and clue interpretation to solve puzzles faster.', icon: 'wordHunt' },
    ],
  },
  he: {
    title: 'מדריכי אסטרטגיה של לקסיקלאש',
    subtitle: 'שלטו בכל מצב משחק עם אסטרטגיות מומחים, טיפים וטכניקות.',
    quickStart: 'חדשים ב-LexiClash? התחילו במצב קלאסי. הוא הדרך המהירה ביותר ללמוד סריקת לוח תחת לחץ זמן. בלאסט כדאי לקרוא שנייה — מערכת הקומבו מובנת הרבה יותר לאחר כמה משחקי קלאסי. ציד מילים פועל לפי היגיון שונה לגמרי ומתגמל סבלנות על פני מהירות. כל מדריך מכסה תבניות ניקוד ספציפיות למצב המשחק שלו.',
    guides: [
      { slug: 'classic-strategy', title: 'אסטרטגיית מצב קלאסי', description: 'למדו תבניות סריקה, ניהול זמן ואסטרטגיות ניקוד למציאת יותר מילים וניקוד גבוה יותר.', icon: 'classic' },
      { slug: 'blast-strategy', title: 'שליטה במצב בלאסט', description: 'פענחו את מערכת הקומבו, שלטו באפקטי אריחים ושרשרו לניקוד מסיבי.', icon: 'blast' },
      { slug: 'word-hunt-strategy', title: 'אסטרטגיית ציד מילים', description: 'שלטו באסטרטגיית אלימינציה, מיקום תנועות ופירוש רמזים לפתרון מהיר יותר.', icon: 'wordHunt' },
    ],
  },
  sv: {
    title: 'LexiClash Strategiguider',
    subtitle: 'Bemestra varje spelmod med expertstrategier, tips och tekniker.',
    quickStart: 'Ny på LexiClash? Börja med Klassiskt. Det är det snabbaste sättet att lära sig rutnätsskanning under tidspress. Blast är mer meningsfullt efter några Klassiska spel — kombosystemet faller på plats när du redan vet hur man hittar ord. Word Hunt följer en annan logik; det belönar tålamod framför hastighet. Varje guide täcker specifika poängmönster för det läget.',
    guides: [
      { slug: 'classic-strategy', title: 'Klassisk Strategi', description: 'Lar dig skanningsmonster, tidshantering och poangstrategier for att hitta fler ord.', icon: 'classic' },
      { slug: 'blast-strategy', title: 'Blast-lage Mesterskap', description: 'Las upp kombosystemet, bemestra platteffekter och kedja till massiva poang.', icon: 'blast' },
      { slug: 'word-hunt-strategy', title: 'Word Hunt Strategi', description: 'Bemestra eliminering, vokalplacering och ledtradstolkning for snabbare losning.', icon: 'wordHunt' },
    ],
  },
  ja: {
    title: 'LexiClash 攻略ガイド',
    subtitle: 'エキスパートの戦略、ヒント、テクニックですべてのゲームモードをマスター。',
    quickStart: 'LexiClashが初めて？クラシックモードから始めましょう。タイムプレッシャーの中でグリッドスキャンをすばやく身につけられます。ブラストはクラシックを数回プレイした後に読むと理解しやすい — 単語の見つけ方がわかると、コンボシステムがすっと入ってきます。ワードハントはまた別のロジックで動いていて、速さより粘り強さが大事です。各ガイドはそのモード固有のスコアパターンをカバーしています。',
    guides: [
      { slug: 'classic-strategy', title: 'クラシックモード攻略', description: 'スキャンパターン、時間管理、スコアリング戦略を学んでもっと単語を見つけよう。', icon: 'classic' },
      { slug: 'blast-strategy', title: 'ブラストモード攻略', description: 'コンボシステムを解き明かし、タイルエフェクトをマスターしてハイスコアを狙おう。', icon: 'blast' },
      { slug: 'word-hunt-strategy', title: 'ワードハント攻略', description: '消去法、母音配置、ヒントの解釈をマスターしてパズルを速く解こう。', icon: 'wordHunt' },
    ],
  },
  es: {
    title: 'Guias de Estrategia LexiClash',
    subtitle: 'Domina cada modo de juego con estrategias expertas, consejos y tecnicas.',
    quickStart: '¿Nuevo en LexiClash? Empieza con el modo Clásico. Es la forma más rápida de aprender el escaneo de cuadrícula bajo presión de tiempo. Blast tiene más sentido después de algunas partidas Clásicas — el sistema de combos encaja en cuanto ya sabes encontrar palabras. Word Hunt funciona con una lógica distinta; recompensa la paciencia sobre la velocidad. Cada guía cubre patrones de puntuación específicos para ese modo.',
    guides: [
      { slug: 'classic-strategy', title: 'Estrategia Modo Clasico', description: 'Aprende patrones de escaneo, gestion del tiempo y estrategias de puntuacion.', icon: 'classic' },
      { slug: 'blast-strategy', title: 'Dominio Modo Blast', description: 'Desbloquea el sistema de combos, domina efectos de fichas y encadena puntajes masivos.', icon: 'blast' },
      { slug: 'word-hunt-strategy', title: 'Estrategia Word Hunt', description: 'Domina la eliminacion, colocacion de vocales e interpretacion de pistas.', icon: 'wordHunt' },
    ],
  },
};

const iconMap = {
  classic: BookOpen,
  blast: Zap,
  wordHunt: Target,
};

const colorMap = {
  classic: 'bg-neo-lime',
  blast: 'bg-neo-orange',
  wordHunt: 'bg-neo-cyan',
};

export default function GuidesIndexPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = (params.locale as string) || language;
  const isDarkMode = theme === 'dark';
  const content = guidesContent[locale] || guidesContent.en;

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode ? 'bg-neo-navy' : 'bg-linear-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <main className="max-w-4xl mx-auto px-4 py-8 page-content-safe">
        <header className="mb-10 text-center">
          <h1 className={cn(
            'text-3xl md:text-4xl font-black mb-4',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {content.title}
          </h1>
          <p className={cn('text-lg', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            {content.subtitle}
          </p>
          <p className={cn('text-sm mt-4 max-w-2xl mx-auto leading-relaxed', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
            {content.quickStart}
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {content.guides.map((guide) => {
            const Icon = iconMap[guide.icon];
            const bgColor = colorMap[guide.icon];
            return (
              <Link key={guide.slug} href={`/${locale}/guides/${guide.slug}`}>
                <div className={cn(
                  'h-full p-6 rounded-neo border-3 border-neo-black shadow-hard transition-transform hover:-translate-y-1 hover:shadow-hard-lg',
                  isDarkMode ? 'bg-slate-800' : 'bg-white'
                )}>
                  <div className={cn(
                    'w-12 h-12 rounded-neo border-2 border-neo-black flex items-center justify-center mb-4',
                    bgColor
                  )}>
                    <Icon className="w-6 h-6 text-neo-black" />
                  </div>
                  <h2 className={cn(
                    'text-lg font-bold mb-2',
                    isDarkMode ? 'text-white' : 'text-neo-black'
                  )}>
                    {guide.title}
                  </h2>
                  <p className={cn(
                    'text-sm leading-relaxed',
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  )}>
                    {guide.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <InlineBannerAd webZone="content-page" className="mt-8" />
      </main>
    </div>
  );
}
