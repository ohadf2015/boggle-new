'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, Brain, Lightbulb, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';

export default function SciencePageClient(): React.ReactElement {
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
              'bg-neo-cyan text-neo-black'
            )}>
              Research
            </span>
          </div>

          <h1 className={cn(
            'text-4xl md:text-5xl font-black mb-4',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            The Science Behind Word Games and Brain Health
          </h1>

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
              6 min read
            </span>
          </div>

          {/* Hero Image */}
          <div className="relative w-full h-64 md:h-96 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
            <Image
              src="/images/blog/brain-health.jpg"
              alt="Illustration of a glowing brain made of interconnected words showing cognitive benefits of word games"
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
              Ever wondered why word games feel so satisfying? It&apos;s not just fun—your brain is actually getting a comprehensive workout.
              Science shows that playing word games regularly can improve memory, expand vocabulary, and even help protect against cognitive decline.
            </p>
          </div>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
              <Brain className="w-6 h-6 text-neo-cyan" />
              How Word Games Boost Your Brain
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              When you play word games, you&apos;re not just having fun—you&apos;re engaging multiple cognitive systems simultaneously.
              Here&apos;s what happens in your brain:
            </p>

            <div className={cn(
              'grid md:grid-cols-3 gap-4 mb-6',
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            )}>
              <div className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-yellow/20'
              )}>
                <h3 className={cn('font-bold mb-2 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  <Lightbulb className="w-5 h-5 text-neo-yellow" />
                  Pattern Recognition
                </h3>
                <p className="text-sm">Your brain strengthens neural pathways responsible for identifying patterns and sequences.</p>
              </div>

              <div className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-lime/20'
              )}>
                <h3 className={cn('font-bold mb-2 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  <TrendingUp className="w-5 h-5 text-neo-lime" />
                  Memory Activation
                </h3>
                <p className="text-sm">Retrieving words from memory exercises both short-term and long-term memory systems.</p>
              </div>

              <div className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-pink/20'
              )}>
                <h3 className={cn('font-bold mb-2 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  <Brain className="w-5 h-5 text-neo-pink" />
                  Executive Function
                </h3>
                <p className="text-sm">Planning strategies and making decisions activates your brain&apos;s control center.</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              The Vocabulary Connection
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Research shows that people who regularly play word games have significantly larger vocabularies than non-players.
              But it&apos;s not just about knowing more words—it&apos;s about how you use them.
            </p>

            <h3 className={cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Active vs. Passive Vocabulary
            </h3>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Most people have two vocabularies:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li><strong>Passive vocabulary:</strong> Words you recognize when reading or hearing</li>
              <li><strong>Active vocabulary:</strong> Words you actually use in speaking and writing</li>
            </ul>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Word games are particularly effective because they force you to actively recall and use words, converting passive
              vocabulary into active vocabulary. This creates stronger neural connections and makes these words more accessible
              in daily life.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Cognitive Reserve: Your Brain&apos;s Retirement Fund
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              One of the most exciting discoveries in neuroscience is the concept of &ldquo;cognitive reserve&rdquo;—essentially,
              your brain&apos;s ability to compensate for age-related changes and damage.
            </p>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Studies have found that people who engage in mentally stimulating activities throughout their lives, including word
              games, show:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li>Delayed onset of dementia symptoms by up to 5 years</li>
              <li>Better maintenance of memory and thinking skills in old age</li>
              <li>Faster processing speed and mental flexibility</li>
              <li>Enhanced problem-solving abilities</li>
            </ul>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Think of it like a savings account for your brain—every word game you play is a small deposit that pays dividends later in life.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              The Multilingual Advantage
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Playing word games in multiple languages—like LexiClash offers with Hebrew, English, Swedish, and Japanese—provides
              even greater cognitive benefits. Bilingual and multilingual individuals show:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li><strong>Enhanced executive function:</strong> Better at task-switching and focusing attention</li>
              <li><strong>Improved metalinguistic awareness:</strong> Greater understanding of how language works</li>
              <li><strong>Stronger cognitive control:</strong> Better at ignoring irrelevant information</li>
              <li><strong>Delayed cognitive aging:</strong> Multilingualism has been linked to later onset of Alzheimer&apos;s disease</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Stress Reduction and Mental Wellness
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Beyond cognitive benefits, word games serve as excellent stress relievers. The focused attention required creates
              a state similar to meditation, known as &ldquo;flow.&rdquo;
            </p>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              When you&apos;re absorbed in finding words, you&apos;re not ruminating about work stress or daily worries. This mental
              break allows your brain to reset, reducing cortisol levels and improving overall mood.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              How Much Do You Need to Play?
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              The good news? You don&apos;t need hours of gameplay to see benefits. Research suggests that even 15-20 minutes
              of mentally stimulating activities daily can make a significant difference.
            </p>
            <div className={cn(
              'p-4 rounded-neo border-2 border-neo-black mb-4',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-cyan/20'
            )}>
              <p className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                💡 Pro Tip: Consistency beats intensity
              </p>
              <p className={cn('text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                Playing 15 minutes every day is more beneficial than playing 2 hours once a week. Regular engagement creates
                lasting neural changes.
              </p>
            </div>
          </section>

          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mt-8',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/20 border-neo-black'
          )}>
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              The Bottom Line
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Word games aren&apos;t just entertainment—they&apos;re a scientifically-backed way to keep your brain healthy,
              sharp, and resilient throughout your life. Every puzzle you solve, every word you find, contributes to building
              a stronger, more flexible mind.
            </p>
            <p className={cn('mb-0', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              So the next time someone says you&apos;re &ldquo;just playing games,&rdquo; you can tell them you&apos;re actually
              investing in your cognitive health. Science has your back!
            </p>
          </div>

          <div className={cn('mt-8 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4 mt-6">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  Try Daily Challenge
                </Button>
              </Link>
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  Practice Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
