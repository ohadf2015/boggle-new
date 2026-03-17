'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { AdPlaceholder } from '@/components/ads';
import { RelatedArticles } from '@/components/blog/RelatedArticles';
import { contentByLocale } from './content';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';

export default function BoggleAlternativesPageClient(): React.ReactElement {
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
    { slug: '10-surprising-benefits-word-games', title: '10 Surprising Benefits of Playing Word Games Daily', excerpt: '', readTime: '5 min read', category: 'Research', image: '' },
    { slug: 'science-behind-word-games', title: 'The Science Behind Word Games', excerpt: '', readTime: '6 min read', category: 'Science', image: '' },
    { slug: 'daily-challenge-strategies', title: '7 Proven Daily Challenge Strategies', excerpt: '', readTime: '7 min read', category: 'Strategy', image: '' },
    { slug: 'multilingual-word-learning', title: 'Multilingual Word Learning Through Games', excerpt: '', readTime: '8 min read', category: 'Language', image: '' },
    { slug: 'top-player-secrets', title: '7 Secrets Top Players Don\'t Want You to Know', excerpt: '', readTime: '9 min read', category: 'Secrets', image: '' },
    { slug: 'improve-word-game-skills', title: 'How to Improve Your Word Game Skills', excerpt: '', readTime: '8 min read', category: 'Strategy', image: '' },
    { slug: 'why-word-games-are-addictive', title: 'Why You Can\'t Stop Playing Word Games', excerpt: '', readTime: '11 min read', category: 'Psychology', image: '' },
    { slug: 'best-boggle-alternatives-2026', title: 'Best Boggle Alternatives in 2026', excerpt: '', readTime: '10 min read', category: 'Reviews', image: '' },
    { slug: 'word-games-for-brain-training', title: 'Word Games for Brain Training: The Research', excerpt: '', readTime: '12 min read', category: 'Brain Health', image: '' },
  ];

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-gradient-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <article className="max-w-3xl mx-auto px-4 py-8 page-content-safe">
        <Link href={`/${locale}/blog`}>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'mb-6 rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-neo-black hover:bg-neo-cream'
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
              'bg-neo-orange text-white'
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
            {/* Author byline for E-E-A-T */}
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">{content.authorName}</span>
                <span className="mx-1">·</span>
                <span className="italic">{content.authorBio}</span>
              </div>
            </div>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date('2025-12-01').toLocaleDateString(language, { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {content.readTime}
            </span>
          </div>

          <div className="relative w-full h-64 md:h-80 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
            <Image
              src="/images/blog/boggle-alternatives.jpg"
              alt="Various word games on a wooden table with a phone showing a modern word game app"
              fill
              className="object-cover"
              priority
            />
          </div>
        </header>

        <AdPlaceholder zone="content-page" className="my-6" />

        <div className={cn(
          'prose prose-lg max-w-none',
          isDarkMode ? 'prose-invert' : ''
        )}>
          {content.sections.map((section, index) => (
            <div key={index} className="mb-6">
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
                  key={pIndex}
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

          <div className={cn(
            'mt-10 p-4 rounded-neo border-3 border-neo-black',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-cream'
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full border-2 border-neo-black flex items-center justify-center shrink-0',
                'bg-neo-orange text-white font-bold text-lg'
              )}>
                {content.authorName.charAt(0)}
              </div>
              <div>
                <p className={cn('font-bold text-sm', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  {content.authorName}
                </p>
                <p className={cn('text-xs mt-1', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                  {content.authorBio}
                </p>
              </div>
            </div>
          </div>

          <AdPlaceholder zone="content-page" className="my-6" />

          <div className={cn('mt-12 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-orange text-white font-bold shadow-hard hover:shadow-hard-lg">
                  {content.playDaily}
                </Button>
              </Link>
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-yellow text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  {content.startPracticing}
                </Button>
              </Link>
            </div>
          </div>
          <AuthorBioCard />

          <RelatedArticles
            currentSlug="best-boggle-alternatives-2026"
            locale={locale}
            heading={relatedHeading}
            articles={relatedArticlesData}
          />
        </div>
      </article>
    </div>
  );
}
