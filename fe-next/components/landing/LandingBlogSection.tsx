'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { m } from 'framer-motion';
import { Calendar, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { safeToLocaleDateString } from '@/utils/bcp47Locale';

interface BlogPostData {
  slug: string;
  image: string;
  date: string;
  content: Record<string, { title: string; excerpt: string; readTime: string; category: string }>;
}

// Sorted by date descending — newest first. Keep in sync with `app/[locale]/blog/PageClient.tsx`.
const recentPosts: BlogPostData[] = [
  {
    slug: 'netflix-word-game-2026-rise',
    image: '/images/blog/netflix-word-games.jpg',
    date: '2026-04-29',
    content: {
      en: { title: "Netflix Just Dropped a Word Game — 2026 Is the Year Word Games Took Over", excerpt: 'Streaming giants, daily-puzzle obsession, brain-training boom and a TikTok-shaped social loop. Why every screen you own suddenly wants you spelling things.', readTime: '9 min read', category: 'Trends' },
      he: { title: 'נטפליקס שחררה משחק מילים — 2026 היא השנה של משחקי המילים', excerpt: 'סטרימינג ענק, התמכרות לפאזל היומי, גל אימון מוחי וטיק־טוק שהפך פתרון לספורט צפייה. למה כל מסך פתאום רוצה שתאייתו.', readTime: '9 דקות קריאה', category: 'טרנדים' },
      sv: { title: 'Netflix släppte ett ordspel — 2026 är ordspelens år', excerpt: 'Streamingjättar, daglig pusselbesatthet, hjärnträningsboom och en TikTok-driven social loop. Varför varenda skärm plötsligt vill att du stavar.', readTime: '9 min läsning', category: 'Trender' },
      ja: { title: 'Netflixがワードゲームを投入 — 2026年はワードゲームの年', excerpt: 'ストリーミング大手、デイリーパズル中毒、脳トレブーム、TikTok型ソーシャルループ。なぜあなたの全画面が突然「綴れ」と言ってくるのか。', readTime: '9分で読める', category: 'トレンド' },
      es: { title: 'Netflix lanza un juego de palabras — 2026, el año de los juegos de palabras', excerpt: 'Gigantes del streaming, obsesión por el puzzle diario, boom del entrenamiento cerebral y un bucle social al estilo TikTok. Por qué cada pantalla quiere que deletrees.', readTime: '9 min de lectura', category: 'Tendencias' },
    },
  },
  {
    slug: 'boggle-vs-wordle',
    image: '/images/blog/boggle-vs-wordle.jpg',
    date: '2026-03-28',
    content: {
      en: { title: 'Boggle vs Wordle: One Grid, Two Completely Different Brain Workouts', excerpt: 'Pattern recognition versus deductive logic. Unlimited rounds versus one a day. Which word game actually fits your brain?', readTime: '9 min read', category: 'Comparison' },
      he: { title: 'בוגל מול וורדל: שני משחקי מילים, שני מוחות שונים לגמרי', excerpt: 'זיהוי דפוסים מול היגיון דדוקטיבי. סיבובים אינסופיים מול פעם ביום. איזה משחק מילים באמת מתאים לכם?', readTime: '9 דקות קריאה', category: 'השוואה' },
      sv: { title: 'Boggle vs Wordle: Två ordspel, två helt olika hjärnträningar', excerpt: 'Mönsterigenkänning mot deduktiv logik. Obegränsade rundor mot en om dagen. Vilket ordspel passar din hjärna?', readTime: '9 min läsning', category: 'Jämförelse' },
      ja: { title: 'Boggle vs Wordle：同じ「言葉」でも全く違う脳トレ', excerpt: 'パターン認識 vs 演繹的推理。無制限ラウンド vs 1日1回。あなたの脳に合うワードゲームはどっち？', readTime: '9分で読める', category: '比較' },
      es: { title: 'Boggle vs Wordle: Dos Juegos de Palabras, Dos Cerebros Distintos', excerpt: 'Reconocimiento de patrones vs lógica deductiva. Rondas ilimitadas vs una al día. ¿Cuál le va mejor a tu cerebro?', readTime: '9 min de lectura', category: 'Comparación' },
    },
  },
  {
    slug: 'boggle-vs-scrabble',
    image: '/images/blog/boggle-vs-scrabble.jpg',
    date: '2026-03-28',
    content: {
      en: { title: 'Boggle vs Scrabble: Speed Demon or Strategic Mastermind?', excerpt: 'One gives you 3 minutes and chaos. The other lets you stare at tiles for 20. Which classic word game is actually better?', readTime: '10 min read', category: 'Comparison' },
      he: { title: 'בוגל מול סקרבל: מהירות או אסטרטגיה?', excerpt: 'אחד נותן לכם 3 דקות וכאוס. השני נותן לכם לבהות באריחים 20 דקות. איזה קלאסיקה באמת יותר טובה?', readTime: '10 דקות קריאה', category: 'השוואה' },
      sv: { title: 'Boggle vs Scrabble: Fartdemon eller strategiskt geni?', excerpt: 'Det ena ger dig 3 minuter och kaos. Det andra låter dig stirra på brickor i 20. Vilken klassiker är bäst?', readTime: '10 min läsning', category: 'Jämförelse' },
      ja: { title: 'Boggle vs Scrabble：スピード狂か戦略の達人か？', excerpt: '一方は3分間のカオス。もう一方は20分間タイルを見つめる。どっちのクラシックが本当に優れてる？', readTime: '10分で読める', category: '比較' },
      es: { title: 'Boggle vs Scrabble: ¿Velocidad o Estrategia?', excerpt: 'Uno te da 3 minutos de caos. El otro te deja mirar fichas 20 minutos. ¿Cuál clásico es realmente mejor?', readTime: '10 min de lectura', category: 'Comparación' },
    },
  },
];

const sectionHeading: Record<string, string> = {
  en: 'Latest from the Blog',
  he: 'החדש בבלוג',
  sv: 'Senaste från bloggen',
  ja: 'ブログの最新記事',
  es: 'Lo último del blog',
};

const viewAllLabel: Record<string, string> = {
  en: 'View All Articles',
  he: 'כל המאמרים',
  sv: 'Visa alla artiklar',
  ja: 'すべての記事を見る',
  es: 'Ver todos los artículos',
};

export function LandingBlogSection() {
  const { language } = useLanguage();
  const params = useParams();
  const locale = (params.locale as string) || language || 'en';
  const lang = locale in sectionHeading ? locale : 'en';

  return (
    <section className="w-full max-w-4xl mx-auto xl:max-w-5xl">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-black uppercase text-white">
          {sectionHeading[lang]}
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {recentPosts.map((post, i) => {
          const c = post.content[lang] || post.content.en;
          return (
            <m.div
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: 0.1 * i, type: 'spring', stiffness: 300, damping: 24 }}
            >
            <Link
              href={`/${locale}/blog/${post.slug}`}
              className={cn(
                'group block rounded-neo border-3 border-neo-black overflow-hidden',
                'bg-slate-800 hover:bg-slate-700 shadow-hard hover:shadow-hard-lg',
                'transition-all hover:scale-[1.02]'
              )}
            >
              <div className="relative w-full aspect-video overflow-hidden">
                <Image
                  src={post.image}
                  alt={c.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 inset-s-3">
                  <span className="inline-block px-3 py-1 text-xs font-bold uppercase rounded-neo border-2 border-neo-black bg-neo-yellow text-neo-black">
                    {c.category}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-base font-bold mb-2 text-white group-hover:text-neo-yellow transition-colors line-clamp-2">
                  {c.title}
                </h3>
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                  {c.excerpt}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {safeToLocaleDateString(new Date(post.date), lang, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {c.readTime}
                  </span>
                </div>
              </div>
            </Link>
            </m.div>
          );
        })}
      </div>

      {/* Prominent "View All" CTA — pulls eyes after the 3-card grid */}
      <div className="mt-8 flex justify-center">
        <Link
          href={`/${locale}/blog`}
          className={cn(
            'group inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4',
            'rounded-neo border-3 border-neo-black bg-neo-yellow text-neo-black',
            'font-black uppercase text-base sm:text-lg shadow-hard-lg',
            'transition-all hover:-translate-y-0.5 hover:shadow-hard-xl',
            'active:translate-y-0 active:shadow-hard-pressed'
          )}
        >
          <BookOpen className="w-5 h-5" />
          {viewAllLabel[lang]}
          <ArrowRight className="w-5 h-5 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
