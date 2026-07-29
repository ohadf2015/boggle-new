'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';

interface RelatedArticle {
  slug: string;
  title: string;
  excerpt: string;
  readTime: string;
  category: string;
  image: string;
}

// All blog metadata for cross-referencing
const ALL_POSTS: Record<string, { image: string; category: string }> = {
  '10-surprising-benefits-word-games': { image: '/images/blog/10-benefits.jpg', category: 'Research' },
  'science-behind-word-games': { image: '/images/blog/science-brain.jpg', category: 'Science' },
  'daily-challenge-strategies': { image: '/images/blog/daily-strategies.jpg', category: 'Strategy' },
  'multilingual-word-learning': { image: '/images/blog/multilingual.jpg', category: 'Language' },
  'top-player-secrets': { image: '/images/blog/top-secrets.jpg', category: 'Secrets' },
  'improve-word-game-skills': { image: '/images/blog/improve-skills.jpg', category: 'Strategy' },
  'why-word-games-are-addictive': { image: '/images/blog/why-addictive.jpg', category: 'Psychology' },
  'best-boggle-alternatives-2026': { image: '/images/blog/boggle-alternatives.jpg', category: 'Reviews' },
  'word-games-for-brain-training': { image: '/images/blog/brain-training-words.jpg', category: 'Brain Health' },
};

// Category-based relatedness mapping
const RELATED_MAP: Record<string, string[]> = {
  '10-surprising-benefits-word-games': ['science-behind-word-games', 'word-games-for-brain-training', 'why-word-games-are-addictive'],
  'science-behind-word-games': ['word-games-for-brain-training', '10-surprising-benefits-word-games', 'why-word-games-are-addictive'],
  'daily-challenge-strategies': ['top-player-secrets', 'improve-word-game-skills', 'best-boggle-alternatives-2026'],
  'multilingual-word-learning': ['10-surprising-benefits-word-games', 'science-behind-word-games', 'improve-word-game-skills'],
  'top-player-secrets': ['daily-challenge-strategies', 'improve-word-game-skills', 'best-boggle-alternatives-2026'],
  'improve-word-game-skills': ['daily-challenge-strategies', 'top-player-secrets', 'science-behind-word-games'],
  'why-word-games-are-addictive': ['science-behind-word-games', 'word-games-for-brain-training', '10-surprising-benefits-word-games'],
  'best-boggle-alternatives-2026': ['improve-word-game-skills', 'daily-challenge-strategies', 'top-player-secrets'],
  'word-games-for-brain-training': ['science-behind-word-games', '10-surprising-benefits-word-games', 'why-word-games-are-addictive'],
};

interface RelatedArticlesProps {
  currentSlug: string;
  locale: string;
  heading: string;
  articles: RelatedArticle[];
}

export function RelatedArticles({ currentSlug, locale, heading, articles }: RelatedArticlesProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const relatedSlugs = RELATED_MAP[currentSlug] || [];
  const related = relatedSlugs
    .map((slug) => {
      const article = articles.find((a) => a.slug === slug);
      const meta = ALL_POSTS[slug];
      if (!article || !meta) return null;
      return { ...article, image: meta.image };
    })
    .filter(Boolean) as (RelatedArticle & { image: string })[];

  if (related.length === 0) return null;

  return (
    <section className={cn('mt-12 pt-8 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
      <h2 className={cn(
        'text-xl font-black uppercase mb-6',
        isDarkMode ? 'text-white' : 'text-neo-black'
      )}>
        {heading}
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {related.map((article) => (
          <Link
            key={article.slug}
            href={`/${locale}/blog/${article.slug}`}
            className={cn(
              'group block rounded-neo border-3 border-neo-black overflow-hidden transition-all hover:scale-[1.02]',
              isDarkMode
                ? 'bg-neo-navy-light hover:bg-neo-navy-elevated'
                : 'bg-white hover:bg-neo-cream shadow-hard-sm hover:shadow-hard'
            )}
          >
            <div className="relative w-full aspect-16/10 overflow-hidden">
              <Image
                src={article.image}
                alt={article.title}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-3">
              <span className={cn(
                'inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-neo border border-neo-black mb-2',
                'bg-neo-yellow text-neo-black'
              )}>
                {article.category}
              </span>
              <h3 className={cn(
                'text-sm font-bold line-clamp-2 group-hover:text-neo-yellow transition-colors',
                isDarkMode ? 'text-white' : 'text-neo-black'
              )}>
                {article.title}
              </h3>
              <span className={cn('flex items-center gap-1 text-xs mt-2', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
                <Clock className="w-3 h-3" />
                {article.readTime}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
