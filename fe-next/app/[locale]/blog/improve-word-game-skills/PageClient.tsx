'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';

export default function ImproveSkillsPageClient(): React.ReactElement {
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
              'bg-neo-yellow text-neo-black'
            )}>
              Strategy
            </span>
          </div>

          <h1 className={cn(
            'text-4xl md:text-5xl font-black mb-4',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            How to Improve Your Word Game Skills
          </h1>

          <div className={cn(
            'flex flex-wrap items-center gap-4 text-sm',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              January 30, 2026
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              8 min read
            </span>
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
              Whether you're a casual player or a competitive word game enthusiast, there's always room to improve.
              This guide shares battle-tested strategies that top players use to dominate word games like LexiClash.
            </p>
          </div>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              1. Build Your Foundation: Vocabulary Expansion
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              The most obvious—yet often neglected—aspect of word games is vocabulary. You can't find words you don't know exist.
              Here's how to systematically expand your word arsenal:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li><strong>Read actively:</strong> Don't just read for content. When you encounter unfamiliar words, write them down.
              Keep a running list on your phone and review it weekly.</li>
              <li><strong>Learn word roots:</strong> Understanding Latin and Greek roots helps you decode unfamiliar words.
              For example, knowing that "bene" means "good" helps you recognize words like benevolent, benefactor, and benediction.</li>
              <li><strong>Focus on 2-letter and 3-letter words:</strong> These short words are game-changers. Words like "qi," "xu," "jo,"
              and "aa" might seem odd, but they're valid and incredibly useful when you're stuck with difficult letters.</li>
              <li><strong>Study word lists strategically:</strong> Don't try to memorize everything. Start with high-value categories like
              Q-without-U words, words with rare letters (Z, X, J), and common word endings (-tion, -ing, -ed).</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              2. Master Pattern Recognition
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Expert players don't see random letters—they see patterns. This skill transforms you from a beginner to an advanced player.
            </p>

            <h3 className={cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Common Prefixes and Suffixes
            </h3>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Train your brain to automatically recognize word building blocks:
            </p>
            <div className={cn(
              'grid md:grid-cols-2 gap-4 mb-6 p-4 rounded-neo border-2 border-neo-black',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-cream'
            )}>
              <div>
                <h4 className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>Prefixes:</h4>
                <ul className={cn('text-sm space-y-1', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                  <li>UN-, RE-, IN-, DIS-</li>
                  <li>PRE-, POST-, ANTI-</li>
                  <li>OVER-, UNDER-, OUT-</li>
                </ul>
              </div>
              <div>
                <h4 className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>Suffixes:</h4>
                <ul className={cn('text-sm space-y-1', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                  <li>-ING, -ED, -ER, -EST</li>
                  <li>-LY, -TION, -ABLE</li>
                  <li>-NESS, -MENT, -ISH</li>
                </ul>
              </div>
            </div>

            <h3 className={cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Letter Combinations
            </h3>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Some letters love hanging out together. Recognizing these common pairs speeds up word finding:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li><strong>TH, CH, SH, WH:</strong> These consonant digraphs appear constantly</li>
              <li><strong>QU:</strong> Q is almost always followed by U (with rare exceptions)</li>
              <li><strong>-TION, -SION:</strong> These endings are incredibly common</li>
              <li><strong>-ING, -ED:</strong> Verb endings that can extend almost any base word</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              3. Develop a Strategic Mindset
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Word games aren't just about vocabulary—they're about strategy. Here are tactics that separate good players from great ones:
            </p>

            <h3 className={cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Think Several Moves Ahead
            </h3>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Don't just look for the best word right now. Consider how your move affects future turns.
              Sometimes playing a medium-scoring word that sets you up perfectly for the next round is smarter than
              going for maximum points immediately.
            </p>

            <h3 className={cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Manage Your Letters
            </h3>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              In games like LexiClash where letter management matters:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li>Avoid hoarding difficult letters (Q, Z, X) unless you have a plan for them</li>
              <li>Keep a balanced mix of vowels and consonants when possible</li>
              <li>Use your high-value letters strategically, not impulsively</li>
            </ul>

            <h3 className={cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Time Management
            </h3>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              In timed games, speed matters. Practice these techniques:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li>Don't overthink obvious words. If you see a decent word, play it and keep moving.</li>
              <li>Save your thinking time for difficult situations, not every single turn.</li>
              <li>Set a mental timer for each turn (e.g., "I'll spend max 15 seconds finding a word").</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              4. Practice Deliberately
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Random practice helps, but deliberate practice transforms your game. Here's how to make every session count:
            </p>

            <div className={cn(
              'p-4 mb-4 rounded-neo border-2 border-neo-black',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-cream'
            )}>
              <h4 className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>Daily Challenges</h4>
              <p className={cn('text-sm mb-2', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                LexiClash's daily challenges are perfect for deliberate practice because everyone gets the same puzzle.
                After completing it, compare your score with top players to see where you missed words.
              </p>
            </div>

            <h3 className={cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Analyze Your Mistakes
            </h3>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              After each game, especially losses, ask yourself:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li>Which words did I miss that I should have known?</li>
              <li>Were there patterns I didn't recognize?</li>
              <li>Did I make strategic mistakes (not just vocabulary gaps)?</li>
              <li>How could I have used my time better?</li>
            </ul>

            <h3 className={cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Focused Drills
            </h3>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Identify your weaknesses and target them specifically:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li>Struggle with rare letters? Practice games focusing only on Q, Z, X words.</li>
              <li>Slow to find words? Use a timer to pressure yourself during practice.</li>
              <li>Miss long words? Challenge yourself to find 6+ letter words in every game.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              5. Learn from Better Players
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              You improve fastest by studying those ahead of you:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li><strong>Watch competitive games:</strong> Observe how top players approach different situations.</li>
              <li><strong>Join communities:</strong> Discuss strategies with other enthusiasts. You'll learn tricks you'd never discover alone.</li>
              <li><strong>Play against stronger opponents:</strong> You'll lose more, but you'll learn faster.</li>
              <li><strong>Ask questions:</strong> Most expert players enjoy sharing knowledge. Don't be shy about asking how they found a particular word.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              6. Stay Mentally Sharp
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Your mental state dramatically affects performance. Follow these tips for peak gameplay:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li><strong>Play when you're fresh:</strong> Your first game of the day is usually your best. Don't grind when you're exhausted.</li>
              <li><strong>Take breaks:</strong> After intense sessions, step away. Your brain needs recovery time to consolidate learning.</li>
              <li><strong>Stay hydrated:</strong> Sounds obvious, but dehydration kills cognitive performance.</li>
              <li><strong>Don't tilt:</strong> After a bad loss, take a breather instead of immediately queuing another game. Frustration clouds judgment.</li>
            </ul>
          </section>

          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mt-8',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/20 border-neo-black'
          )}>
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Your Action Plan
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Improvement doesn't happen overnight, but it does happen with consistent effort. Here's your roadmap:
            </p>
            <ol className={cn('space-y-3', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li><strong>Week 1-2:</strong> Learn 10 new 2-3 letter words daily. Master the fundamentals.</li>
              <li><strong>Week 3-4:</strong> Focus on pattern recognition. Study common prefixes, suffixes, and letter combinations.</li>
              <li><strong>Week 5-8:</strong> Play daily challenges consistently. Analyze every missed word.</li>
              <li><strong>Ongoing:</strong> Expand into specialized word lists (Q without U, words with J/Z/X).</li>
            </ol>
          </div>

          <div className={cn('mt-8 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <p className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              Remember: every expert was once a beginner. The difference is they kept playing, kept learning, and kept improving.
              Your journey to word game mastery starts with a single game. Why not make it right now?
            </p>
            <div className="flex gap-4 mt-6">
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-yellow text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  Practice Now
                </Button>
              </Link>
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  Try Daily Challenge
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
