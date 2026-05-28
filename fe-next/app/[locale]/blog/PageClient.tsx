'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { safeToLocaleDateString } from '@/utils/bcp47Locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, BookOpen, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from '@/components/ads';
import { blogPostsContent, getSortedBlogPosts, type BlogPost } from '@/lib/blog/data';

// Blog post metadata (non-localized)

export default function BlogIndexPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const isDarkMode = theme === 'dark';

  // Get localized content with fallback to English
  const content = blogPostsContent[locale] || blogPostsContent.en;

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-linear-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <div className="max-w-5xl mx-auto px-4 py-8 page-content-safe">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/${locale}`}>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'rounded-neo border-3 border-neo-black shadow-hard',
                isDarkMode ? 'bg-neo-navy-light text-white hover:bg-neo-navy-elevated' : 'bg-white text-neo-black hover:bg-neo-cream'
              )}
            >
              <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
              {t('common.back')}
            </Button>
          </Link>
          <div>
            <h1 className={cn(
              'text-4xl font-black uppercase flex items-center gap-3',
              isDarkMode ? 'text-white' : 'text-neo-black'
            )}>
              <BookOpen className="w-8 h-8 text-neo-yellow" />
              {content.pageTitle}
            </h1>
            <p className={cn('text-sm mt-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              {content.pageSubtitle}
            </p>
          </div>
        </div>

        {/* Ad: Between header and post grid */}
        <InlineBannerAd webZone="content-page" className="mb-6" />

        {/* Blog Posts Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {getSortedBlogPosts().map((post, index) => {
            const postContent = content.posts[post.slug];
            if (!postContent) return null;

            return (
              <Link
                key={post.slug}
                href={`/${locale}/blog/${post.slug}`}
                className={cn(
                  'group block rounded-neo border-3 border-neo-black transition-all hover:scale-[1.02] overflow-hidden',
                  isDarkMode
                    ? 'bg-neo-navy-light hover:bg-neo-navy-elevated'
                    : 'bg-white hover:bg-neo-cream shadow-hard hover:shadow-hard-lg'
                )}
              >
                {/* Preview Image */}
                <div className="relative w-full aspect-video overflow-hidden">
                  <Image
                    src={post.image}
                    alt={postContent.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={index < 3}
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Category Badge overlaid on image */}
                  <div className="absolute top-3 inset-s-3">
                    <span className={cn(
                      'inline-block px-3 py-1 text-xs font-bold uppercase rounded-neo border-2 border-neo-black',
                      'bg-neo-yellow text-neo-black'
                    )}>
                      {postContent.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Title */}
                  <h2 className={cn(
                    'text-lg font-bold mb-2 group-hover:text-neo-yellow transition-colors line-clamp-2',
                    isDarkMode ? 'text-white' : 'text-neo-black'
                  )}>
                    {postContent.title}
                  </h2>

                  {/* Excerpt */}
                  <p className={cn('text-sm mb-4 line-clamp-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                    {postContent.excerpt}
                  </p>

                  {/* Meta */}
                  <div className={cn(
                    'flex items-center gap-4 text-xs',
                    isDarkMode ? 'text-gray-500' : 'text-gray-500'
                  )}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {safeToLocaleDateString(new Date(post.date), language, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {postContent.readTime}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* SEO Footer Note */}
        <div className={cn(
          'mt-12 pt-6 border-t text-center',
          isDarkMode ? 'border-slate-700' : 'border-gray-200'
        )}>
          <p className={cn('text-sm', isDarkMode ? 'text-gray-500' : 'text-gray-600')}>
            {content.footerText}
          </p>
        </div>
      </div>
    </div>
  );
}
