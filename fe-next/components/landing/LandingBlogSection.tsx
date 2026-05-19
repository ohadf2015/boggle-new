'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { m } from 'framer-motion';
import { Calendar, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { safeToLocaleDateString } from '@/utils/bcp47Locale';
import { blogPostsContent, getRecentBlogPostsForLocale } from '@/lib/blog/data';

const RECENT_COUNT = 3;

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
  const recentPosts = getRecentBlogPostsForLocale(lang, RECENT_COUNT);

  return (
    <section className="w-full max-w-4xl mx-auto xl:max-w-5xl">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-black uppercase text-white">
          {sectionHeading[lang]}
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {recentPosts.map((post, i) => {
          const localeContent = blogPostsContent[lang] || blogPostsContent.en;
          const c = localeContent.posts[post.slug] || blogPostsContent.en.posts[post.slug];
          if (!c) return null;
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
