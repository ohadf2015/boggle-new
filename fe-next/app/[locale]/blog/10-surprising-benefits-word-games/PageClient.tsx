'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';

export default function BenefitsPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const isDarkMode = theme === 'dark';

  const benefits = [
    {
      number: 1,
      title: 'Slows Brain Aging by Up to 5 Years',
      content: 'Recent brain imaging studies reveal that crossword puzzle participants experienced less brain shrinkage in critical memory areas compared to those using computer-based games. Research shows word games can delay the onset of dementia symptoms by up to 5 years.',
    },
    {
      number: 2,
      title: 'Sharper Memory That Lasts',
      content: 'A landmark study published in the New England Journal of Medicine found that crossword puzzles showed a significant advantage over digital brain games in sharpening memory among older adults with mild cognitive impairment.',
    },
    {
      number: 3,
      title: 'Faster Processing Speed',
      content: 'Older people with mild cognitive impairment who engage in high levels of word games and hobbies show better processing speed than those who don&apos;t. Your brain literally responds faster when you train it regularly.',
    },
    {
      number: 4,
      title: 'Enhanced Attention Span',
      content: 'Word games stimulate key parts of the brain including attention and problem-solving. Regular players show measurably improved attention spans, which is crucial as these skills naturally decline with age.',
    },
    {
      number: 5,
      title: 'Vocabulary Expansion',
      content: 'Indonesian researchers found significant improvement in English vocabulary among participants who played Scrabble regularly. The study showed measurable differences between pre-test and post-test data, proving word games effectively expand vocabulary.',
    },
    {
      number: 6,
      title: 'Better Verbal Fluency',
      content: 'Improvements in verbal fluency are among the key outcomes of regular word game play. This means you&apos;ll find the right words faster in conversations and express yourself more clearly.',
    },
    {
      number: 7,
      title: 'Reduced Dementia Risk',
      content: 'The Lancet Commission reports that 45% of dementia risk is based on modifiable lifestyle factors. Regular mental stimulation through word games is one of the most accessible ways to reduce your risk.',
    },
    {
      number: 8,
      title: 'Improved Working Memory',
      content: 'Word games engage your working memory—the mental workspace that holds information while you&apos;re using it. Players consistently show better working memory performance than non-players.',
    },
    {
      number: 9,
      title: 'Enhanced Reasoning Skills',
      content: 'Puzzles and games stimulate reasoning, logic, and visual perception. These aren&apos;t just isolated skills—they transfer to real-world problem-solving and decision-making.',
    },
    {
      number: 10,
      title: 'Better Mental Health',
      content: 'Beyond cognitive benefits, word games provide stress relief and mental wellness. The focused attention creates a meditative state, reducing anxiety and improving mood. Plus, the sense of achievement boosts confidence.',
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
              'bg-neo-lime text-neo-black'
            )}>
              Research
            </span>
          </div>

          <h1 className={cn(
            'text-4xl md:text-5xl font-black mb-4',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            10 Surprising Benefits of Playing Word Games Daily
          </h1>

          <p className={cn('text-xl mb-6', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            Science-backed reasons why word games are more than just fun—they&apos;re essential brain training
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
              5 min read
            </span>
          </div>

          {/* Hero Image */}
          <div className="relative w-full h-64 md:h-96 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
            <Image
              src="/images/blog/10-benefits.jpg"
              alt="Illustration showing the number 10 surrounded by icons representing benefits of word games"
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
              Think word games are just a way to pass time? Think again. Recent research from 2024-2025 reveals that daily
              word puzzles provide remarkable benefits that go far beyond entertainment. Here are 10 science-backed reasons
              to make word games part of your daily routine.
            </p>
          </div>

          {/* Benefits List */}
          <div className="space-y-6 mb-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.number}
                className={cn(
                  'p-6 rounded-neo border-3 border-neo-black',
                  isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-neo border-2 border-neo-black flex items-center justify-center',
                    'bg-neo-yellow font-black text-2xl'
                  )}>
                    {benefit.number}
                  </div>
                  <div className="flex-1">
                    <h3 className={cn('text-xl font-bold mb-2 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                      <CheckCircle className="w-5 h-5 text-neo-lime" />
                      {benefit.title}
                    </h3>
                    <p className={cn('mb-0', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                      {benefit.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              How Much Do You Need to Play?
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              The good news: you don&apos;t need hours of gameplay. Experts recommend just 15-20 minutes of mentally
              stimulating activities daily for measurable cognitive benefits.
            </p>
            <div className={cn(
              'p-6 rounded-neo border-2 border-neo-black',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-cyan/20'
            )}>
              <p className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                💡 Consistency Is Key
              </p>
              <p className={cn('mb-0 text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                Playing 15 minutes every day is far more effective than playing 2 hours once a week. Daily engagement creates
                lasting neural changes that compound over time.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Important Context: Part of a Healthy Lifestyle
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              While word games provide significant cognitive benefits, experts emphasize they work best as part of a
              comprehensive approach to brain health. Research from the Center for Brain Health notes that lifestyle
              factors are crucial—including:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li><strong>Physical exercise:</strong> Cardio and strength training</li>
              <li><strong>Social connections:</strong> Regular interaction with friends and family</li>
              <li><strong>Mindfulness:</strong> Meditation and stress management</li>
              <li><strong>Purpose:</strong> Meaningful activities and goals</li>
              <li><strong>Mental stimulation:</strong> Word games, reading, learning new skills</li>
            </ul>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Think of word games as one powerful tool in your brain health toolkit—not a magic bullet, but a proven strategy
              that&apos;s enjoyable, accessible, and effective.
            </p>
          </section>

          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mt-8',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/20 border-neo-black'
          )}>
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Start Today, See Results Tomorrow
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              With benefits ranging from sharper memory to reduced dementia risk, there&apos;s never been a better time
              to make word games part of your daily routine. The research is clear: your brain will thank you.
            </p>
            <p className={cn('mb-0 font-bold', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Ready to invest 15 minutes in your cognitive future?
            </p>
          </div>

          {/* Research Sources */}
          <section className="mb-8 mt-8">
            <h3 className={cn('text-lg font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Research Sources
            </h3>
            <ul className={cn('text-sm space-y-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              <li>
                <a
                  href="https://www.psychologytoday.com/us/blog/the-full-picture/202412/word-puzzles-and-board-games-boost-brain-health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Psychology Today - Word Puzzles and Board Games Boost Brain Health (2024)
                </a>
              </li>
              <li>
                <a
                  href="https://mosait.com/blog/are-crossword-puzzles-good-for-your-brain-research-2025"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Latest 2025 Research & Scientific Evidence on Crossword Puzzles
                </a>
              </li>
              <li>
                <a
                  href="https://health.osu.edu/health/brain-and-spine/how-games-like-wordle-can-improve-brain-health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Ohio State Health & Discovery - How Games Like Wordle Can Improve Brain Health
                </a>
              </li>
              <li>
                <a
                  href="https://www.sciencedaily.com/releases/2024/09/240910155904.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  ScienceDaily - Games, Puzzles Can Slow Cognitive Decline (2024)
                </a>
              </li>
              <li>
                <a
                  href="https://centerforbrainhealth.org/article/wellness-wednesday-word-games"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Center for Brain Health - Word Games and Brain Health
                </a>
              </li>
            </ul>
          </section>

          <div className={cn('mt-8 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4 mt-6">
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  Play Daily Challenge
                </Button>
              </Link>
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-yellow text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  Start Practicing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
