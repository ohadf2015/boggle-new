'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, BookOpen, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
}

const blogPosts: BlogPost[] = [
  {
    slug: 'improve-word-game-skills',
    title: 'How to Improve Your Word Game Skills',
    excerpt: 'Discover proven strategies and techniques to level up your word game performance and outsmart your opponents.',
    date: '2026-01-30',
    readTime: '8 min read',
    category: 'Strategy',
  },
  {
    slug: 'science-behind-word-games',
    title: 'The Science Behind Word Games and Brain Health',
    excerpt: 'Explore the cognitive benefits of word games and how they improve memory, vocabulary, and mental agility.',
    date: '2026-01-30',
    readTime: '6 min read',
    category: 'Research',
  },
  {
    slug: 'daily-challenge-strategies',
    title: 'Daily Challenge Strategies: Maximize Your Score',
    excerpt: 'Learn the secrets to dominating daily word challenges with time-tested tactics and pattern recognition.',
    date: '2026-01-30',
    readTime: '7 min read',
    category: 'Tips',
  },
  {
    slug: 'multilingual-word-learning',
    title: 'Multilingual Word Learning: Tips for Success',
    excerpt: 'Master word games in multiple languages with practical advice for building vocabulary across Hebrew, English, Swedish, and Japanese.',
    date: '2026-01-30',
    readTime: '9 min read',
    category: 'Learning',
  },
  {
    slug: 'word-game-history',
    title: 'The Evolution of Word Games: From Crosswords to Digital',
    excerpt: 'Journey through the fascinating history of word games and discover how they shaped language and culture.',
    date: '2026-01-30',
    readTime: '10 min read',
    category: 'Culture',
  },
];

export default function BlogIndexPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const isDarkMode = theme === 'dark';

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-gradient-to-br from-neo-cream via-white to-neo-cream'
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
                isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-neo-black hover:bg-neo-cream'
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
              Blog & Resources
            </h1>
            <p className={cn('text-sm mt-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              Tips, strategies, and insights for word game enthusiasts
            </p>
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/${locale}/blog/${post.slug}`}
              className={cn(
                'group block p-6 rounded-neo border-3 border-neo-black transition-all hover:scale-[1.02]',
                isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-700'
                  : 'bg-white hover:bg-neo-cream shadow-hard hover:shadow-hard-lg'
              )}
            >
              {/* Category Badge */}
              <div className="mb-4">
                <span className={cn(
                  'inline-block px-3 py-1 text-xs font-bold uppercase rounded-neo border-2 border-neo-black',
                  'bg-neo-yellow text-neo-black'
                )}>
                  {post.category}
                </span>
              </div>

              {/* Title */}
              <h2 className={cn(
                'text-xl font-bold mb-3 group-hover:text-neo-yellow transition-colors',
                isDarkMode ? 'text-white' : 'text-neo-black'
              )}>
                {post.title}
              </h2>

              {/* Excerpt */}
              <p className={cn('text-sm mb-4 line-clamp-3', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                {post.excerpt}
              </p>

              {/* Meta */}
              <div className={cn(
                'flex items-center gap-4 text-xs',
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              )}>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(post.date).toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {post.readTime}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* SEO Footer Note */}
        <div className={cn(
          'mt-12 pt-6 border-t text-center',
          isDarkMode ? 'border-slate-700' : 'border-gray-200'
        )}>
          <p className={cn('text-sm', isDarkMode ? 'text-gray-500' : 'text-gray-600')}>
            Join thousands of word game enthusiasts improving their skills with LexiClash.
            Play solo, compete with friends, or challenge daily puzzles in Hebrew, English, Swedish, and Japanese.
          </p>
        </div>
      </div>
    </div>
  );
}
