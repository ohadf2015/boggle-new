'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, BookOpen, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { AdPlaceholder } from '@/components/ads';

interface BlogPost {
  slug: string;
  image: string;
  date: string;
}

interface LocalizedPostContent {
  title: string;
  excerpt: string;
  readTime: string;
  category: string;
}

interface PageContent {
  pageTitle: string;
  pageSubtitle: string;
  footerText: string;
  posts: Record<string, LocalizedPostContent>;
}

// Blog post metadata (non-localized)
const blogPosts: BlogPost[] = [
  {
    slug: '10-surprising-benefits-word-games',
    image: '/images/blog/10-benefits.jpg',
    date: '2026-01-30',
  },
  {
    slug: 'science-behind-word-games',
    image: '/images/blog/brain-health.jpg',
    date: '2026-01-30',
  },
  {
    slug: 'daily-challenge-strategies',
    image: '/images/blog/strategy-tactics.jpg',
    date: '2026-01-30',
  },
  {
    slug: 'multilingual-word-learning',
    image: '/images/blog/multilingual-learning.jpg',
    date: '2026-01-30',
  },
  {
    slug: 'top-player-secrets',
    image: '/images/blog/top-player-secrets.jpg',
    date: '2026-01-30',
  },
  {
    slug: 'improve-word-game-skills',
    image: '/images/blog/strategy-tactics.jpg',
    date: '2026-01-30',
  },
];

// Localized content for all languages
const contentByLocale: Record<string, PageContent> = {
  en: {
    pageTitle: 'Blog & Resources',
    pageSubtitle: 'Tips, strategies, and insights for word game enthusiasts',
    footerText: 'Join thousands of word game enthusiasts improving their skills with LexiClash. Play solo, compete with friends, or challenge daily puzzles in Hebrew, English, Swedish, and Japanese.',
    posts: {
      '10-surprising-benefits-word-games': {
        title: '10 Surprising Benefits of Playing Word Games Daily',
        excerpt: 'Science-backed reasons why word games are more than just fun—they\'re essential brain training that can slow aging by up to 5 years.',
        readTime: '5 min read',
        category: 'Research',
      },
      'science-behind-word-games': {
        title: 'The Science Behind Word Games and Brain Health',
        excerpt: 'Explore the cognitive benefits of word games and how they improve memory, vocabulary, and mental agility backed by neuroscience.',
        readTime: '6 min read',
        category: 'Research',
      },
      'daily-challenge-strategies': {
        title: '7 Proven Daily Challenge Strategies to Dominate the Leaderboard',
        excerpt: 'Master these expert tactics to maximize your score and consistently rank among the top players in word game competitions.',
        readTime: '7 min read',
        category: 'Strategy',
      },
      'multilingual-word-learning': {
        title: 'The Ultimate Guide to Multilingual Word Learning Through Games',
        excerpt: 'How playing word games in Hebrew, English, Swedish, and Japanese accelerates vocabulary acquisition and supercharges your brain.',
        readTime: '8 min read',
        category: 'Language Learning',
      },
      'top-player-secrets': {
        title: '7 Secrets Top Word Game Players Don\'t Want You to Know',
        excerpt: 'Discover the insider techniques that separate champions from casual players—psychological tricks and training methods from the pros.',
        readTime: '9 min read',
        category: 'Insider Secrets',
      },
      'improve-word-game-skills': {
        title: 'How to Improve Your Word Game Skills',
        excerpt: 'Discover proven strategies to boost your word game performance, from vocabulary expansion to pattern recognition.',
        readTime: '8 min read',
        category: 'Strategy',
      },
    },
  },
  he: {
    pageTitle: 'בלוג ומשאבים',
    pageSubtitle: 'טיפים, אסטרטגיות ותובנות לחובבי משחקי מילים',
    footerText: 'הצטרפו לאלפי חובבי משחקי מילים שמשפרים את הכישורים שלהם עם LexiClash. שחקו לבד, התחרו עם חברים, או התמודדו עם אתגרים יומיים בעברית, אנגלית, שוודית ויפנית.',
    posts: {
      '10-surprising-benefits-word-games': {
        title: '10 יתרונות מפתיעים של משחקי מילים יומיים',
        excerpt: 'סיבות מבוססות מדע למה משחקי מילים הם הרבה יותר מבידור - אימון מוחי חיוני שיכול להאט הזדקנות ב-5 שנים.',
        readTime: '5 דקות קריאה',
        category: 'מחקר',
      },
      'science-behind-word-games': {
        title: 'המדע מאחורי משחקי מילים ובריאות המוח',
        excerpt: 'גלו את היתרונות הקוגניטיביים של משחקי מילים ואיך הם משפרים זיכרון, אוצר מילים וזריזות מנטלית על פי מדע העצבים.',
        readTime: '6 דקות קריאה',
        category: 'מחקר',
      },
      'daily-challenge-strategies': {
        title: '7 אסטרטגיות מוכחות לשליטה בטבלת המובילים',
        excerpt: 'שלטו בטקטיקות מומחים אלו כדי למקסם את הניקוד שלכם ולהיות באופן עקבי בין השחקנים המובילים בתחרויות.',
        readTime: '7 דקות קריאה',
        category: 'אסטרטגיה',
      },
      'multilingual-word-learning': {
        title: 'המדריך המקיף ללמידת מילים רב-לשונית דרך משחקים',
        excerpt: 'איך משחקי מילים בעברית, אנגלית, שוודית ויפנית מאיצים רכישת אוצר מילים ומטעינים את המוח שלכם.',
        readTime: '8 דקות קריאה',
        category: 'לימוד שפות',
      },
      'top-player-secrets': {
        title: '7 סודות שהשחקנים המובילים לא רוצים שתדעו',
        excerpt: 'גלו את הטכניקות הפנימיות שמפרידות בין אלופים לשחקנים מזדמנים - טריקים פסיכולוגיים ושיטות אימון מהמקצוענים.',
        readTime: '9 דקות קריאה',
        category: 'סודות פנימיים',
      },
      'improve-word-game-skills': {
        title: 'איך לשפר את כישורי משחקי המילים שלכם',
        excerpt: 'גלו אסטרטגיות מוכחות לשיפור הביצועים במשחקי מילים, מהרחבת אוצר מילים ועד זיהוי דפוסים.',
        readTime: '8 דקות קריאה',
        category: 'אסטרטגיה',
      },
    },
  },
  sv: {
    pageTitle: 'Blogg & Resurser',
    pageSubtitle: 'Tips, strategier och insikter för ordspelsentusiaster',
    footerText: 'Gå med tusentals ordspelsentusiaster som förbättrar sina färdigheter med LexiClash. Spela solo, tävla med vänner eller utmana dagliga pussel på hebreiska, engelska, svenska och japanska.',
    posts: {
      '10-surprising-benefits-word-games': {
        title: '10 överraskande fördelar med att spela ordspel dagligen',
        excerpt: 'Vetenskapligt bevisade skäl till varför ordspel är mer än bara skoj—de är viktig hjärnträning som kan bromsa åldrandet med upp till 5 år.',
        readTime: '5 min läsning',
        category: 'Forskning',
      },
      'science-behind-word-games': {
        title: 'Vetenskapen bakom ordspel och hjärnhälsa',
        excerpt: 'Utforska de kognitiva fördelarna med ordspel och hur de förbättrar minne, ordförråd och mental smidighet enligt neurovetenskap.',
        readTime: '6 min läsning',
        category: 'Forskning',
      },
      'daily-challenge-strategies': {
        title: '7 beprövade strategier för att dominera topplistan',
        excerpt: 'Bemästra dessa experttaktiker för att maximera din poäng och konsekvent rankas bland toppspelarna i ordspelstävlingar.',
        readTime: '7 min läsning',
        category: 'Strategi',
      },
      'multilingual-word-learning': {
        title: 'Den ultimata guiden till flerspråkig ordinlärning genom spel',
        excerpt: 'Hur ordspel på hebreiska, engelska, svenska och japanska accelererar ordförrådsinlärning och superladdar din hjärna.',
        readTime: '8 min läsning',
        category: 'Språkinlärning',
      },
      'top-player-secrets': {
        title: '7 hemligheter som toppspelare inte vill att du ska veta',
        excerpt: 'Upptäck insider-teknikerna som skiljer mästare från casual-spelare—psykologiska knep och träningsmetoder från proffsen.',
        readTime: '9 min läsning',
        category: 'Insiderhemligheter',
      },
      'improve-word-game-skills': {
        title: 'Hur du förbättrar dina ordspelsfärdigheter',
        excerpt: 'Upptäck beprövade strategier för att öka din prestation i ordspel, från ordförrådsutvidgning till mönsterigenkänning.',
        readTime: '8 min läsning',
        category: 'Strategi',
      },
    },
  },
  ja: {
    pageTitle: 'ブログ＆リソース',
    pageSubtitle: 'ワードゲーム愛好家のためのヒント、戦略、洞察',
    footerText: 'LexiClashでスキルを向上させている何千人ものワードゲーム愛好家に参加しましょう。ソロプレイ、友達との対戦、ヘブライ語、英語、スウェーデン語、日本語でのデイリーチャレンジに挑戦しましょう。',
    posts: {
      '10-surprising-benefits-word-games': {
        title: '毎日のワードゲームで得られる10の驚くべきメリット',
        excerpt: 'ワードゲームが単なる娯楽以上である科学的理由—脳の老化を最大5年遅らせる必須の脳トレーニング。',
        readTime: '5分で読める',
        category: '研究',
      },
      'science-behind-word-games': {
        title: 'ワードゲームと脳の健康の背後にある科学',
        excerpt: '神経科学に裏付けられた、ワードゲームが記憶力、語彙力、精神的敏捷性を向上させる認知的メリットを探ります。',
        readTime: '6分で読める',
        category: '研究',
      },
      'daily-challenge-strategies': {
        title: 'リーダーボードを制覇する7つの実証済み戦略',
        excerpt: 'これらの専門家戦術をマスターして、スコアを最大化し、ワードゲーム大会で常にトップランクを維持しましょう。',
        readTime: '7分で読める',
        category: '戦略',
      },
      'multilingual-word-learning': {
        title: 'ゲームで学ぶ多言語単語習得の究極ガイド',
        excerpt: 'ヘブライ語、英語、スウェーデン語、日本語でのワードゲームが語彙習得を加速し、脳をスーパーチャージする方法。',
        readTime: '8分で読める',
        category: '言語学習',
      },
      'top-player-secrets': {
        title: 'トッププレイヤーが教えたくない7つの秘密',
        excerpt: 'チャンピオンとカジュアルプレイヤーを分けるインサイダーテクニックを発見—プロからの心理的トリックとトレーニング方法。',
        readTime: '9分で読める',
        category: 'インサイダー',
      },
      'improve-word-game-skills': {
        title: 'ワードゲームスキルを向上させる方法',
        excerpt: '語彙の拡張からパターン認識まで、ワードゲームのパフォーマンスを向上させる実証済みの戦略を発見しましょう。',
        readTime: '8分で読める',
        category: '戦略',
      },
    },
  },
};

export default function BlogIndexPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const isDarkMode = theme === 'dark';

  // Get localized content with fallback to English
  const content = contentByLocale[locale] || contentByLocale.en;

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
              {content.pageTitle}
            </h1>
            <p className={cn('text-sm mt-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              {content.pageSubtitle}
            </p>
          </div>
        </div>

        {/* Ad: Between header and post grid */}
        <AdPlaceholder zone="content-page" className="mb-6" />

        {/* Blog Posts Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => {
            const postContent = content.posts[post.slug];
            if (!postContent) return null;

            return (
              <Link
                key={post.slug}
                href={`/${locale}/blog/${post.slug}`}
                className={cn(
                  'group block rounded-neo border-3 border-neo-black transition-all hover:scale-[1.02] overflow-hidden',
                  isDarkMode
                    ? 'bg-slate-800 hover:bg-slate-700'
                    : 'bg-white hover:bg-neo-cream shadow-hard hover:shadow-hard-lg'
                )}
              >
                {/* Preview Image */}
                <div className="relative w-full aspect-[16/9] overflow-hidden">
                  <Image
                    src={post.image}
                    alt={postContent.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Category Badge overlaid on image */}
                  <div className="absolute top-3 start-3">
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
                      {new Date(post.date).toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' })}
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
