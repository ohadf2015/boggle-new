'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock } from 'lucide-react';

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
    <section className="flex flex-col gap-5">
      <h2 className="font-neo-display text-2xl font-bold leading-tight sm:text-3xl">{heading}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {related.map((article) => (
          <Link
            key={article.slug}
            href={`/${locale}/blog/${article.slug}`}
            className="group flex flex-col overflow-hidden rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-white motion-safe:transition-transform motion-safe:hover:-translate-y-1"
          >
            <div className="relative aspect-16/10 w-full overflow-hidden border-b-3 border-neo-black">
              <Image src={article.image} alt={article.title} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
            </div>
            <div className="flex flex-col gap-2 p-4">
              <span className="self-start rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-0.5 text-[11px] font-bold uppercase">
                {article.category}
              </span>
              <h3 className="line-clamp-2 font-neo-display text-base font-bold leading-snug">{article.title}</h3>
              <span className="flex items-center gap-1 text-xs text-neo-black/70">
                <Clock aria-hidden className="h-3 w-3" />
                {article.readTime}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
