'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { safeToLocaleDateString } from '@/utils/bcp47Locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from '@/components/ads';
import { RelatedArticles } from '@/components/blog/RelatedArticles';
import { contentByLocale } from './content';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';

export default function FreeWordGamesOnlinePageClient(): React.ReactElement {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = (params.locale as string) || language;
  const isDarkMode = theme === 'dark';

  const content = contentByLocale[locale] || contentByLocale.en;
  const relatedHeadingByLocale: Record<string, string> = {
    en: 'You Might Also Like',
    he: 'אולי יעניין אותך גם',
    sv: 'Du kanske också gillar',
    ja: 'こちらもおすすめ',
    es: 'También te puede interesar',
  };
  const relatedHeading = relatedHeadingByLocale[locale] || relatedHeadingByLocale.en;
  const relatedArticlesData = [
    { slug: 'best-boggle-alternatives-2026', title: 'Best Boggle Alternatives in 2026', excerpt: '', readTime: '10 min read', category: 'Reviews', image: '' },
    { slug: 'boggle-vs-scrabble', title: 'Boggle vs Scrabble: The Honest Showdown', excerpt: '', readTime: '12 min read', category: 'Versus', image: '' },
    { slug: 'daily-challenge-strategies', title: '7 Proven Daily Challenge Strategies', excerpt: '', readTime: '7 min read', category: 'Strategy', image: '' },
    { slug: '10-surprising-benefits-word-games', title: '10 Surprising Benefits of Playing Word Games Daily', excerpt: '', readTime: '5 min read', category: 'Research', image: '' },
    { slug: 'why-word-games-are-addictive', title: 'Why You Can\'t Stop Playing Word Games', excerpt: '', readTime: '11 min read', category: 'Psychology', image: '' },
    { slug: 'multiplayer-word-games-social', title: 'Multiplayer Word Games and Social Play', excerpt: '', readTime: '8 min read', category: 'Social', image: '' },
    { slug: 'word-games-for-brain-training', title: 'Word Games for Brain Training: The Research', excerpt: '', readTime: '12 min read', category: 'Brain Health', image: '' },
    { slug: 'improve-word-game-skills', title: 'How to Improve Your Word Game Skills', excerpt: '', readTime: '8 min read', category: 'Strategy', image: '' },
    { slug: 'top-player-secrets', title: '7 Secrets Top Players Don\'t Want You to Know', excerpt: '', readTime: '9 min read', category: 'Secrets', image: '' },
  ];

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-linear-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <article className="max-w-3xl mx-auto px-4 py-8 page-content-safe">
        <Link href={`/${locale}/blog`}>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'mb-6 rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-neo-navy-light text-white hover:bg-neo-navy-elevated' : 'bg-white text-neo-black hover:bg-neo-cream'
            )}
          >
            <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
            {content.backToBlog}
          </Button>
        </Link>

        <header className="mb-8">
          <div className="mb-4">
            <span className={cn(
              'inline-block px-3 py-1 text-xs font-bold uppercase rounded-neo border-2 border-neo-black',
              'bg-neo-lime text-neo-black'
            )}>
              {content.category}
            </span>
          </div>

          <h1 className={cn(
            'text-3xl md:text-4xl font-black mb-4 leading-tight',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {content.title}
          </h1>

          <p className={cn('text-lg mb-6', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            {content.subtitle}
          </p>

          <div className={cn(
            'flex flex-wrap items-center gap-4 text-sm mb-6',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {safeToLocaleDateString(new Date('2026-05-11'), language, { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {content.readTime}
            </span>
          </div>

          <div className="relative w-full h-64 md:h-80 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
            <Image
              src="/images/blog/free-word-games-online.jpg"
              alt="A phone displaying a word game grid with a coffee cup beside it on a wooden desk"
              fill
              sizes="(min-width: 768px) 736px, calc(100vw - 2rem)"
              className="object-cover"
              priority
            />
          </div>
        </header>

        <InlineBannerAd webZone="content-page" className="my-6" />

        <div className={cn(
          'prose prose-lg max-w-none',
          isDarkMode ? 'prose-invert' : ''
        )}>
          {content.sections.map((section, index) => (
            <div key={`section-${index}`} className="mb-6">
              {section.title && (
                <h2 className={cn(
                  'text-xl font-bold mb-3 mt-8',
                  isDarkMode ? 'text-white' : 'text-neo-black'
                )}>
                  {section.title}
                </h2>
              )}
              {section.content.split('\n\n').map((paragraph, pIndex) => (
                <p
                  key={`section-${index}-p-${pIndex}`}
                  className={cn(
                    'mb-4 leading-relaxed',
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  )}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ))}

          <InlineBannerAd webZone="content-page" className="my-6" />

          <div className={cn('mt-12 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.playDaily}
                </Button>
              </Link>
              <Link href={`/${locale}/multiplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-pink text-white font-bold shadow-hard hover:shadow-hard-lg">
                  {content.startPracticing}
                </Button>
              </Link>
            </div>
          </div>
          <AuthorBioCard />

          <RelatedArticles
            currentSlug="free-word-games-online"
            locale={locale}
            heading={relatedHeading}
            articles={relatedArticlesData}
          />
        </div>
      </article>
    </div>
  );
}
