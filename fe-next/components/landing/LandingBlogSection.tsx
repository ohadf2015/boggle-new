'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { blogPostsContent, getRecentBlogPostsForLocale } from '@/lib/blog/data';

const RECENT_COUNT = 3;

/**
 * The homepage's /blog interlinks: one visible list under How to Play
 * (homepage gauntlet, round 6). Round 5 folded it into a <details> row, which
 * the critic read as one more accordion on top of the FAQ; the page now keeps
 * exactly one (the FAQ card). So: a small heading with All articles beside it,
 * then the three newest titles as plain links, each held to one line on a
 * phone (the full title stays in the link for crawlers and screen readers) and
 * set three across at md.
 *
 * Still server HTML (LandingView.ssr.test: crawlers get every link), never
 * behind a JS entrance, zero client JS to read it.
 */
export function LandingBlogSection() {
  const { t, language } = useLanguage();
  const params = useParams();
  const locale = (params?.locale as string) || language || 'en';
  const lang = locale in blogPostsContent ? locale : 'en';
  const recentPosts = getRecentBlogPostsForLocale(lang, RECENT_COUNT);
  const localeContent = blogPostsContent[lang] || blogPostsContent.en;

  return (
    <div data-home-tail="blog" className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6">
        <h3 className="font-neo-display text-lg font-bold text-neo-cream md:text-xl">
          {t('homeFresh.close.blogTitle')}
        </h3>
        <Link
          prefetch={false}
          href={`/${locale}/blog`}
          className="inline-flex min-h-11 items-center gap-1 font-neo-body text-sm font-bold text-neo-cyan underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan md:text-base"
        >
          {t('homeFresh.close.blogAll')}
          <DirectionalIcon icon={ArrowRight} className="h-4 w-4" />
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-x-8 md:grid-cols-3">
        {recentPosts.map((post) => {
          const c = localeContent.posts[post.slug] || blogPostsContent.en.posts[post.slug];
          if (!c) return null;
          return (
            <li key={post.slug}>
              <Link
                prefetch={false}
                href={`/${locale}/blog/${post.slug}`}
                className="flex min-h-11 items-center gap-2 py-1.5 font-neo-body text-base font-bold text-neo-cream transition-colors hover:text-neo-cyan focus-visible:rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan"
              >
                <span className="min-w-0 flex-1 truncate md:line-clamp-2 md:whitespace-normal">{c.title}</span>
                <DirectionalIcon icon={ArrowRight} className="h-4 w-4 shrink-0 text-neo-cyan" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
