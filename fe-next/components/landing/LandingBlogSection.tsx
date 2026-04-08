'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { toBcp47Locale } from '@/utils/bcp47Locale';

interface BlogPostData {
  slug: string;
  image: string;
  date: string;
  content: Record<string, { title: string; excerpt: string; readTime: string; category: string }>;
}

const recentPosts: BlogPostData[] = [
  {
    slug: 'vocabulary-building-strategies',
    image: '/images/blog/vocabulary-building.jpg',
    date: '2026-03-05',
    content: {
      en: { title: 'I Learned 500 New Words in 30 Days (Here\'s Exactly How)', excerpt: 'Spaced repetition, active recall, morphology hacks, and the daily routines that actually stick.', readTime: '11 min read', category: 'Learning' },
      he: { title: 'למדתי 500 מילים חדשות ב-30 יום (ככה בדיוק)', excerpt: 'חזרה מרווחת, זכירה אקטיבית, טריקים מורפולוגיים, ושגרות יומיות שבאמת נתקעות.', readTime: '11 דקות קריאה', category: 'למידה' },
      sv: { title: 'Jag lärde mig 500 nya ord på 30 dagar (så här gjorde jag)', excerpt: 'Repetition med intervall, aktiv återkallning, morfologiknep och dagliga rutiner som faktiskt fastnar.', readTime: '11 min läsning', category: 'Lärande' },
      ja: { title: '30日で500の新しい単語を覚えた方法（具体的に教えます）', excerpt: '間隔反復、能動的想起、形態学ハック、実際に定着する日課。', readTime: '11分で読める', category: '学習' },
      es: { title: 'Aprendí 500 Palabras Nuevas en 30 Días (Así Es Exactamente Cómo)', excerpt: 'Repetición espaciada, recuerdo activo, trucos morfológicos y rutinas diarias que realmente se quedan.', readTime: '11 min de lectura', category: 'Aprendizaje' },
    },
  },
  {
    slug: 'multiplayer-word-games-social',
    image: '/images/blog/multiplayer-social.jpg',
    date: '2026-02-15',
    content: {
      en: { title: 'Why Playing Word Games With Friends Hits Different', excerpt: 'Cooperative cognition, competitive trash talk, and why your brain literally lights up more when other humans are involved.', readTime: '10 min read', category: 'Social Science' },
      he: { title: 'למה לשחק משחקי מילים עם חברים זה משהו אחר לגמרי', excerpt: 'קוגניציה שיתופית, טראש טוק תחרותי, ולמה המוח שלכם ממש נדלק יותר כשיש אנשים אחרים.', readTime: '10 דקות קריאה', category: 'מדע חברתי' },
      sv: { title: 'Varför ordspel med vänner känns annorlunda', excerpt: 'Kooperativ kognition, tävlingsinriktat trash talk och varför din hjärna bokstavligen lyser mer med andra.', readTime: '10 min läsning', category: 'Samhällsvetenskap' },
      ja: { title: '友達とのワードゲームが特別な理由', excerpt: '協調的認知、競争的トラッシュトーク、他の人間がいると脳が文字通りもっと輝く理由。', readTime: '10分で読める', category: '社会科学' },
      es: { title: 'Por Qué Jugar Juegos de Palabras con Amigos Es Diferente', excerpt: 'Cognición cooperativa, trash talk competitivo y por qué tu cerebro literalmente se ilumina más con otros humanos.', readTime: '10 min de lectura', category: 'Ciencia Social' },
    },
  },
  {
    slug: 'word-games-for-kids-education',
    image: '/images/blog/kids-education.jpg',
    date: '2026-01-27',
    content: {
      en: { title: 'Why Every Teacher Should Have a Word Game in Their Toolkit', excerpt: 'The vocabulary gap is real, the research is compelling, and your students are already gamers — meet them where they are.', readTime: '11 min read', category: 'Education' },
      he: { title: 'למה כל מורה צריך משחק מילים בארגז הכלים', excerpt: 'הפער באוצר המילים אמיתי, המחקר משכנע, והתלמידים שלכם כבר גיימרים — תפגשו אותם איפה שהם.', readTime: '11 דקות קריאה', category: 'חינוך' },
      sv: { title: 'Varför varje lärare bör ha ett ordspel i verktygslådan', excerpt: 'Ordförrådsgapet är verkligt, forskningen är övertygande, och dina elever är redan gamers.', readTime: '11 min läsning', category: 'Utbildning' },
      ja: { title: 'すべての教師がワードゲームを持つべき理由', excerpt: '語彙格差は現実、研究は説得力あり、生徒たちはすでにゲーマー — 彼らのいる場所で会いましょう。', readTime: '11分で読める', category: '教育' },
      es: { title: 'Por Qué Todo Profesor Debería Tener un Juego de Palabras', excerpt: 'La brecha de vocabulario es real, la investigación es convincente, y tus alumnos ya son gamers.', readTime: '11 min de lectura', category: 'Educación' },
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl sm:text-3xl font-black uppercase text-white">
          {sectionHeading[lang]}
        </h2>
        <Link
          href={`/${locale}/blog`}
          className={cn(
            'hidden sm:flex items-center gap-1 text-sm font-bold text-neo-yellow',
            'hover:underline underline-offset-4'
          )}
        >
          {viewAllLabel[lang]}
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {recentPosts.map((post, i) => {
          const c = post.content[lang] || post.content.en;
          return (
            <motion.div
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
                    {new Date(post.date).toLocaleDateString(toBcp47Locale(lang), { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {c.readTime}
                  </span>
                </div>
              </div>
            </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Mobile "View All" link */}
      <div className="sm:hidden mt-4 text-center">
        <Link
          href={`/${locale}/blog`}
          className="inline-flex items-center gap-1 text-sm font-bold text-neo-yellow hover:underline underline-offset-4"
        >
          {viewAllLabel[lang]}
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </Link>
      </div>
    </section>
  );
}
