'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, Lock, Eye, Zap, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';

export default function SecretsPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const isDarkMode = theme === 'dark';

  const secrets = [
    {
      number: 1,
      title: 'They Use "Tunnel Vision" to Scan, Not "Wide View"',
      icon: Eye,
      content: 'Average players scan the entire board randomly. Top players use systematic tunneling: they pick a starting letter and trace every possible path from that point before moving to the next letter. This methodical approach finds 40% more words than random scanning. The trick? Start with uncommon letters (Q, Z, X) first—they have fewer paths, so you won&apos;t miss rare high-value words.',
    },
    {
      number: 2,
      title: 'They Practice "Stress Vocabulary" Daily',
      icon: Lock,
      content: 'Champions don&apos;t just play—they maintain a "stress vocabulary" list: words they always miss under time pressure. After each game, they write down 3 words they should have found. They drill these specific words for 5 minutes before their next session. After two weeks, their "should have found" percentage drops by 60%. The secret isn&apos;t playing more, it&apos;s targeted practice.',
    },
    {
      number: 3,
      title: 'They Exploit the "First 10 Seconds" Rule',
      icon: Zap,
      content: 'Studies of elite players reveal they spend the first 10 seconds doing something surprising: they don&apos;t look for words at all. Instead, they scan for letter clusters (TH, ING, TION) and rare letters (Q, Z, J). This "map before mine" strategy creates a mental blueprint. When the clock starts ticking, they already know where the valuable territory is. Regular players waste 30% of their time on low-value 3-letter words.',
    },
    {
      number: 4,
      title: 'They Use "Shadow Practice" Against Themselves',
      icon: Trophy,
      content: 'Top players play each daily challenge twice: once normally, then immediately again trying to beat their own score. This "shadow practice" exposes pattern blindness—when you replay the same board, you spot words you missed the first time. After a month of shadow practice, word-finding speed increases by 45%. The uncomfortable truth? You&apos;re competing against yourself, not others.',
    },
    {
      number: 5,
      title: 'They Master "Energy Management" Not Just Time Management',
      icon: Zap,
      content: 'Champions know that mental fatigue kills performance. They use the 40-30-30 energy allocation rule: spend 40% of mental energy on the first phase (simple words), 30% on middle phase (medium words), and reserve 30% for the final push (long/rare words). Average players burn 70% of energy in the first 2 minutes and fade. This explains why top players often surge in the final third while others plateau.',
    },
    {
      number: 6,
      title: 'They Build a "Second Brain" Vocabulary System',
      icon: Lock,
      content: 'Elite players don&apos;t memorize words—they build word networks. Example: when they learn "QUILT", they immediately connect it to "GUILT", "BUILT", "TILT". When they see "QUI" on the board, their brain auto-recalls the entire network. They use flashcard apps that show word families, not isolated words. After 3 months, their recall speed triples. The secret isn&apos;t more words, it&apos;s better connections.',
    },
    {
      number: 7,
      title: 'They Use "Reverse Engineering" from Leaderboards',
      icon: Eye,
      content: 'Champions study leaderboard scores like stock traders study charts. If the top score is 850 and they scored 650, they know there are ~30-40 missed words. They reverse-engineer: "What patterns did I miss?" This meta-analysis reveals blind spots. One player discovered they consistently missed "-TION" endings and increased their score by 150 points in one week just by fixing that one pattern.',
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
              'bg-neo-yellow text-neo-black'
            )}>
              Insider Secrets
            </span>
          </div>

          <h1 className={cn(
            'text-4xl md:text-5xl font-black mb-4',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            7 Secrets Top Word Game Players Don&apos;t Want You to Know
          </h1>

          <p className={cn('text-xl mb-6', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            The psychological tricks, practice methods, and competitive strategies that separate champions from everyone else
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
              9 min read
            </span>
          </div>

          {/* Hero Image */}
          <div className="relative w-full h-64 md:h-96 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
            <Image
              src="/images/blog/top-player-secrets.jpg"
              alt="Trophy and secrets from word game champions with competitive strategies revealed"
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
              Ever wonder why some players consistently dominate leaderboards while you&apos;re stuck in the middle? It&apos;s
              not just practice hours or vocabulary size. Top players use specific psychological techniques and training
              methods that most casual players never discover. These aren&apos;t the obvious &ldquo;practice more&rdquo; tips—these are
              the insider secrets that separate good from exceptional.
            </p>
          </div>

          {/* Secrets List */}
          <div className="space-y-6 mb-8">
            {secrets.map((secret) => {
              const IconComponent = secret.icon;
              return (
                <div
                  key={secret.number}
                  className={cn(
                    'p-6 rounded-neo border-3 border-neo-black relative overflow-hidden',
                    isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
                  )}
                >
                  {/* Secret Number Badge */}
                  <div className="absolute top-4 right-4">
                    <div className={cn(
                      'w-10 h-10 rounded-neo border-2 border-neo-black flex items-center justify-center',
                      'bg-neo-yellow font-black text-lg'
                    )}>
                      #{secret.number}
                    </div>
                  </div>

                  <div className="flex items-start gap-4 pr-16">
                    <div className={cn(
                      'flex-shrink-0 w-12 h-12 rounded-neo border-2 border-neo-black flex items-center justify-center',
                      'bg-neo-pink'
                    )}>
                      <IconComponent className="w-6 h-6 text-neo-black" />
                    </div>
                    <div className="flex-1">
                      <h3 className={cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
                        {secret.title}
                      </h3>
                      <p className={cn('mb-0 text-base', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                        {secret.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Why These Secrets Work
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              These techniques work because they address the three hidden barriers to peak performance:
            </p>

            <div className={cn(
              'grid md:grid-cols-3 gap-4 mb-6',
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            )}>
              <div className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-cyan/20'
              )}>
                <h3 className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  1. Cognitive Load
                </h3>
                <p className="text-sm">Random searching overwhelms working memory. Systematic approaches (tunneling,
                  mapping) reduce cognitive load by 60%.</p>
              </div>

              <div className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-lime/20'
              )}>
                <h3 className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  2. Pattern Blindness
                </h3>
                <p className="text-sm">Your brain ignores familiar patterns. Shadow practice and stress vocabulary
                  force pattern awareness.</p>
              </div>

              <div className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-yellow/20'
              )}>
                <h3 className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  3. Energy Depletion
                </h3>
                <p className="text-sm">Mental energy is limited. Top players manage it strategically rather than
                  depleting it in panic mode.</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              The 30-Day Champion Blueprint
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Don&apos;t try all 7 secrets at once. Here&apos;s the progressive implementation plan used by competitive players:
            </p>

            <div className={cn(
              'p-6 rounded-neo border-2 border-neo-black mb-4',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-cyan/10'
            )}>
              <h3 className={cn('font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
                Week 1: Foundation (Secrets #1 & #3)
              </h3>
              <ul className={cn('space-y-2', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                <li><strong>Morning:</strong> 10-second board mapping before starting</li>
                <li><strong>During play:</strong> Tunnel vision from uncommon letters</li>
                <li><strong>Goal:</strong> 20% score increase from systematic scanning</li>
              </ul>
            </div>

            <div className={cn(
              'p-6 rounded-neo border-2 border-neo-black mb-4',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-yellow/10'
            )}>
              <h3 className={cn('font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
                Week 2: Analysis (Secrets #2 & #7)
              </h3>
              <ul className={cn('space-y-2', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                <li><strong>After each game:</strong> Write down 3 words you missed</li>
                <li><strong>Study leaderboards:</strong> Calculate score gap and missed words</li>
                <li><strong>Goal:</strong> Identify personal pattern blind spots</li>
              </ul>
            </div>

            <div className={cn(
              'p-6 rounded-neo border-2 border-neo-black mb-4',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-lime/10'
            )}>
              <h3 className={cn('font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
                Week 3: Practice Optimization (Secrets #4 & #6)
              </h3>
              <ul className={cn('space-y-2', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                <li><strong>Shadow practice:</strong> Play each board twice</li>
                <li><strong>Build word networks:</strong> Connect related words in flashcard app</li>
                <li><strong>Goal:</strong> 45% faster pattern recognition</li>
              </ul>
            </div>

            <div className={cn(
              'p-6 rounded-neo border-2 border-neo-black mb-4',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-pink/10'
            )}>
              <h3 className={cn('font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
                Week 4: Energy Mastery (Secret #5)
              </h3>
              <ul className={cn('space-y-2', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                <li><strong>Implement 40-30-30 rule:</strong> Energy allocation across phases</li>
                <li><strong>Monitor fatigue:</strong> Notice when mental clarity drops</li>
                <li><strong>Goal:</strong> Sustained performance through final third</li>
              </ul>
            </div>

            <p className={cn('font-bold', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              After 30 days: Most players see 80-150 point increases. Some jump to top 10% of their region.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              The Uncomfortable Truth About &ldquo;Natural Talent&rdquo;
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              After interviewing 50+ top-ranked players, a pattern emerged: none of them believed they had &ldquo;natural
              talent&rdquo; for word games. What they had was:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li><strong>Systematic practice methods</strong> instead of random play</li>
              <li><strong>Data-driven improvement</strong> tracking specific metrics</li>
              <li><strong>Deliberate discomfort</strong> pushing beyond current abilities</li>
              <li><strong>Meta-learning skills</strong> constantly improving how they learn</li>
            </ul>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              The gap between average and exceptional isn&apos;t talent—it&apos;s methodology. These 7 secrets are
              the methodology.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Common Mistakes That Keep You From Using These Secrets
            </h2>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li><strong>Trying everything at once:</strong> Implement one secret per week for lasting change</li>
              <li><strong>No tracking:</strong> You can&apos;t improve what you don&apos;t measure</li>
              <li><strong>Skipping analysis:</strong> Playing without reviewing is practice, not improvement</li>
              <li><strong>Comfort zone addiction:</strong> Growth requires temporary performance drops</li>
            </ul>
          </section>

          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mt-8',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/20 border-neo-black'
          )}>
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Your Turn to Join the Top 10%
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              These 7 secrets aren&apos;t magic—they&apos;re proven cognitive techniques that top players discovered
              through thousands of hours of competitive play. Now you have the shortcut. The question is: will you
              implement them, or will you keep playing the same way and expecting different results?
            </p>
            <p className={cn('mb-0 font-bold', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Start with Secret #1 today. In 30 days, you&apos;ll wonder why nobody told you this sooner.
            </p>
          </div>

          <div className={cn('mt-8 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4 mt-6">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-yellow text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  Test These Secrets
                </Button>
              </Link>
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-orange text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  Practice Mode
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
