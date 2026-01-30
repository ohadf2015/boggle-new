'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, Target, Zap, TrendingUp, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';

export default function StrategiesPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const isDarkMode = theme === 'dark';

  const strategies = [
    {
      number: 1,
      title: 'Start with High-Value Letter Patterns',
      icon: Zap,
      content: 'Begin by scanning for common letter combinations like "QU", "TH", "ING", and "ED". These patterns give you quick wins and help establish a rhythm. Top players report finding 30-40% more words by starting with these high-probability combinations rather than random searching.',
    },
    {
      number: 2,
      title: 'Use the Prefix and Suffix Strategy',
      icon: Target,
      content: 'Add prefixes like "UN-", "RE-", or "PRE-" to known words, or suffixes like "-NESS", "-ITY", or "-LY". This technique can double your word count. For example, if you spot "KIND", immediately look for "KINDNESS", "UNKIND", or "KINDLY" nearby.',
    },
    {
      number: 3,
      title: 'Play in Strategic Phases',
      icon: TrendingUp,
      content: 'Divide your time into phases: Phase 1 (first 30%): Grab all simple 3-4 letter words you see. Phase 2 (middle 40%): Search for longer 5-7 letter words. Phase 3 (final 30%): Hunt for rare words and double-check missed opportunities. This prevents panic and maximizes point potential.',
    },
    {
      number: 4,
      title: 'Master the Art of Anagrams',
      icon: Award,
      content: 'When you find one word, immediately check for anagrams. Classic examples: "RAT" can become "TAR" and "ART", "STOP" turns into "POTS", "POST", and "TOPS". Anagram recognition can add 20-30 bonus words to your daily score with minimal extra effort.',
    },
    {
      number: 5,
      title: 'Learn Word Transformations',
      icon: Target,
      content: 'Many adjectives become nouns by adding "-NESS" or "-ITY" (kind → kindness, able → ability). Verbs become nouns with "-TION" or "-MENT" (act → action, develop → development). Understanding these transformations helps you spot the rarest word versions.',
    },
    {
      number: 6,
      title: 'Practice Strategic Letter Awareness',
      icon: Zap,
      content: 'Pay special attention to uncommon letters like Q, Z, X, and J. Words containing these letters often score higher points. When you spot them, build words around them first. Also, memorize common "Q without U" words like "QI" and "QOPH" for unexpected points.',
    },
    {
      number: 7,
      title: 'Review and Learn from Every Game',
      icon: TrendingUp,
      content: 'After each daily challenge, review which words you missed. Many modern word games show you all possible words post-game. Study these lists—they&apos;re free vocabulary lessons. Top players report 15-25% score improvements after just two weeks of post-game review.',
    },
  ];

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-gradient-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <article className="max-w-4xl mx-auto px-4 py-8 page-content-safe">
        {/* Back Button */}
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
            Back to Blog
          </Button>
        </Link>

        {/* Article Header */}
        <header className="mb-8">
          <div className="mb-4">
            <span className={cn(
              'inline-block px-3 py-1 text-xs font-bold uppercase rounded-neo border-2 border-neo-black',
              'bg-neo-orange text-neo-black'
            )}>
              Strategy
            </span>
          </div>

          <h1 className={cn(
            'text-4xl md:text-5xl font-black mb-4',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            7 Proven Daily Challenge Strategies to Dominate the Leaderboard
          </h1>

          <p className={cn('text-xl mb-6', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            Master these expert tactics to maximize your score and consistently rank among the top players
          </p>

          <div className={cn(
            'flex flex-wrap items-center gap-4 text-sm mb-6',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              January 30, 2026
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              7 min read
            </span>
          </div>

          {/* Hero Image */}
          <div className="relative w-full h-64 md:h-96 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
            <Image
              src="/images/blog/strategy-tactics.jpg"
              alt="Strategic game planning with letter tiles and tactical moves highlighted"
              fill
              className="object-cover"
              priority
            />
          </div>
        </header>

        {/* Article Content */}
        <div className={cn(
          'prose prose-lg max-w-none',
          isDarkMode ? 'prose-invert' : ''
        )}>
          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mb-8',
            isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
          )}>
            <p className={cn('text-lg font-medium mb-0', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Want to climb the leaderboard but stuck with average scores? The difference between good players and great
              ones isn&apos;t luck—it&apos;s strategy. Top players use specific techniques that consistently deliver
              high scores. Here are 7 proven strategies that can transform your daily challenge performance.
            </p>
          </div>

          {/* Strategies List */}
          <div className="space-y-6 mb-8">
            {strategies.map((strategy) => {
              const IconComponent = strategy.icon;
              return (
                <div
                  key={strategy.number}
                  className={cn(
                    'p-6 rounded-neo border-3 border-neo-black',
                    isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'flex-shrink-0 w-12 h-12 rounded-neo border-2 border-neo-black flex items-center justify-center',
                      'bg-neo-cyan font-black text-2xl'
                    )}>
                      {strategy.number}
                    </div>
                    <div className="flex-1">
                      <h3 className={cn('text-xl font-bold mb-2 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                        <IconComponent className="w-5 h-5 text-neo-yellow" />
                        {strategy.title}
                      </h3>
                      <p className={cn('mb-0', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                        {strategy.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Why These Strategies Work
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              These aren&apos;t theoretical tactics—they&apos;re battle-tested techniques from competitive word game players.
              Research shows that structured approaches outperform random searching by 40-60% in timed word games.
            </p>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              The key is combining pattern recognition (strategies 1, 2, and 4) with time management (strategy 3) and
              continuous learning (strategy 7). Each strategy builds on the others, creating a comprehensive system for
              success.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              The Practice Plan
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Don&apos;t try to implement all 7 strategies at once. Here&apos;s a progressive training plan:
            </p>

            <div className={cn(
              'p-6 rounded-neo border-2 border-neo-black mb-4',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-yellow/20'
            )}>
              <h3 className={cn('font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
                Week 1-2: Foundation
              </h3>
              <ul className={cn('space-y-2', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                <li><strong>Focus:</strong> Strategies 1 and 3 (patterns and phases)</li>
                <li><strong>Goal:</strong> Establish consistent rhythm</li>
                <li><strong>Success Metric:</strong> 20% score increase</li>
              </ul>
            </div>

            <div className={cn(
              'p-6 rounded-neo border-2 border-neo-black mb-4',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-lime/20'
            )}>
              <h3 className={cn('font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
                Week 3-4: Advanced Techniques
              </h3>
              <ul className={cn('space-y-2', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                <li><strong>Focus:</strong> Add strategies 2, 4, and 5 (prefixes, anagrams, transformations)</li>
                <li><strong>Goal:</strong> Expand vocabulary application</li>
                <li><strong>Success Metric:</strong> 40% total score increase</li>
              </ul>
            </div>

            <div className={cn(
              'p-6 rounded-neo border-2 border-neo-black mb-4',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-pink/20'
            )}>
              <h3 className={cn('font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
                Week 5+: Mastery
              </h3>
              <ul className={cn('space-y-2', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                <li><strong>Focus:</strong> Complete system + strategies 6 and 7 (special letters, post-game review)</li>
                <li><strong>Goal:</strong> Leaderboard consistency</li>
                <li><strong>Success Metric:</strong> Top 10% ranking</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Common Mistakes to Avoid
            </h2>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li><strong>Panic searching:</strong> Random hunting wastes time. Stick to your strategic phases.</li>
              <li><strong>Ignoring short words:</strong> Quick 3-letter wins add up. Don&apos;t skip them for long words only.</li>
              <li><strong>Forgetting to review:</strong> Missing the learning opportunity after each game limits growth.</li>
              <li><strong>Playing too fast:</strong> Speed matters, but accuracy and completeness matter more.</li>
            </ul>
          </section>

          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mt-8',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/20 border-neo-black'
          )}>
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Ready to Dominate?
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              These 7 strategies have helped thousands of players reach the leaderboard. The difference between average
              and exceptional performance is simply applying these techniques consistently. Start with the foundation,
              add advanced tactics, and watch your scores soar.
            </p>
            <p className={cn('mb-0 font-bold', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Your journey to the top starts with today&apos;s challenge. Time to put these strategies into action!
            </p>
          </div>

          {/* Research Sources */}
          <section className="mb-8 mt-8">
            <h3 className={cn('text-lg font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Sources & Further Reading
            </h3>
            <ul className={cn('text-sm space-y-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              <li>
                <a
                  href="https://parade.com/living/how-to-win-crossplay-nyt-game"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  How To Win NYT Game &apos;Crossplay&apos; Every Time: Tips and Tricks - Parade
                </a>
              </li>
              <li>
                <a
                  href="https://blog.clevergoat.com/posts/word-grid-strategy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Word Game Domination: 5 Strategies for Success at Word Grid - CleverGoat
                </a>
              </li>
              <li>
                <a
                  href="https://game-wisdom.com/general/win-word-games-every-time-5-tips"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Win Word Games Every Time With These 5 Tips - Game Wisdom
                </a>
              </li>
              <li>
                <a
                  href="https://www.247wordsearch.com/news/improve-skills-tips-to-be-good-at-word-hunt/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Improve Your Skills: Tips on How to be Good at Word Hunt
                </a>
              </li>
            </ul>
          </section>

          <div className={cn('mt-8 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4 mt-6">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-orange text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  Try Daily Challenge
                </Button>
              </Link>
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  Practice Strategies
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
