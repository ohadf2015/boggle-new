'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, Globe, Brain, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';

export default function MultilingualPageClient(): React.ReactElement {
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
              'bg-neo-pink text-neo-black'
            )}>
              Language Learning
            </span>
          </div>

          <h1 className={cn(
            'text-4xl md:text-5xl font-black mb-4',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            The Ultimate Guide to Multilingual Word Learning Through Games
          </h1>

          <p className={cn('text-xl mb-6', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            How playing word games in multiple languages accelerates vocabulary acquisition and supercharges your brain
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
              8 min read
            </span>
          </div>

          {/* Hero Image */}
          <div className="relative w-full h-64 md:h-96 rounded-neo border-3 border-neo-black overflow-hidden shadow-hard mb-6">
            <Image
              src="/images/blog/multilingual-learning.jpg"
              alt="Multilingual word learning with Hebrew, English, Swedish and Japanese characters connecting"
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
              Learning vocabulary in multiple languages doesn&apos;t have to mean boring flashcards and endless drills.
              Recent research from 2025 shows that game-based vocabulary learning produces dramatically better results
              than traditional methods—with a large effect size of 0.962 across 38 studies involving over 4,000 learners.
              Here&apos;s how to leverage word games for multilingual mastery.
            </p>
          </div>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
              <Brain className="w-6 h-6 text-neo-pink" />
              Why Games Work Better Than Traditional Study
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              A 2025 meta-analysis revealed that mobile games significantly outperform traditional vocabulary learning methods.
              Why? Games provide:
            </p>

            <div className={cn(
              'grid md:grid-cols-2 gap-4 mb-6',
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            )}>
              <div className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-yellow/20'
              )}>
                <h3 className={cn('font-bold mb-2 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  <Sparkles className="w-5 h-5 text-neo-yellow" />
                  Active Engagement
                </h3>
                <p className="text-sm">Games require you to actively use words in context, not just passively read them. This
                  creates stronger memory traces.</p>
              </div>

              <div className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-lime/20'
              )}>
                <h3 className={cn('font-bold mb-2 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  <Users className="w-5 h-5 text-neo-lime" />
                  Intrinsic Motivation
                </h3>
                <p className="text-sm">Rewards, points, and challenges trigger dopamine release, making learning feel rewarding
                  rather than effortful.</p>
              </div>

              <div className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-cyan/20'
              )}>
                <h3 className={cn('font-bold mb-2 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  <Globe className="w-5 h-5 text-neo-cyan" />
                  Spaced Repetition
                </h3>
                <p className="text-sm">Daily challenges naturally implement spaced repetition—the gold standard for long-term
                  vocabulary retention.</p>
              </div>

              <div className={cn(
                'p-4 rounded-neo border-2 border-neo-black',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-pink/20'
              )}>
                <h3 className={cn('font-bold mb-2 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  <Brain className="w-5 h-5 text-neo-pink" />
                  Low Anxiety
                </h3>
                <p className="text-sm">Game contexts reduce foreign language anxiety compared to traditional classroom
                  settings, improving performance.</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Language-Specific Strategies
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Each language has unique characteristics that affect how you should approach word games. Here are strategies
              tailored to the languages LexiClash supports:
            </p>

            {/* Hebrew */}
            <div className={cn(
              'p-6 rounded-neo border-3 border-neo-black mb-6',
              isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
            )}>
              <h3 className={cn('text-xl font-bold mb-3 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                🇮🇱 Hebrew: Root-Based Learning
              </h3>
              <p className={cn('mb-3', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                Hebrew words are built from 3-letter roots (shoresh). Once you recognize a root, you can often guess
                related words.
              </p>
              <div className={cn(
                'p-4 rounded border-2 border-neo-black mb-3',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-yellow/10'
              )}>
                <p className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  Example: Root כ-ת-ב (K-T-B) = &quot;write&quot;
                </p>
                <ul className={cn('text-sm space-y-1', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                  <li>כָּתַב (katav) = wrote</li>
                  <li>מִכְתָּב (michtav) = letter</li>
                  <li>כִּתְבָה (kitva) = writing</li>
                  <li>כָּתוּב (katuv) = written</li>
                </ul>
              </div>
              <p className={cn('text-sm font-bold', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                Strategy: When you find a Hebrew word in the game, identify its root and look for related words with
                the same 3-letter pattern.
              </p>
            </div>

            {/* English */}
            <div className={cn(
              'p-6 rounded-neo border-3 border-neo-black mb-6',
              isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
            )}>
              <h3 className={cn('text-xl font-bold mb-3 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                🇬🇧 English: Prefix & Suffix Power
              </h3>
              <p className={cn('mb-3', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                English has rich morphology—adding prefixes and suffixes transforms base words into multiple forms.
              </p>
              <div className={cn(
                'p-4 rounded border-2 border-neo-black mb-3',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-lime/10'
              )}>
                <p className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  Example: Base word &quot;happy&quot;
                </p>
                <ul className={cn('text-sm space-y-1', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                  <li>unhappy (prefix: un-)</li>
                  <li>happiness (suffix: -ness)</li>
                  <li>happily (suffix: -ly)</li>
                  <li>happier (suffix: -er)</li>
                </ul>
              </div>
              <p className={cn('text-sm font-bold', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                Strategy: Master common prefixes (un-, re-, pre-) and suffixes (-ness, -tion, -ly) to multiply your
                vocabulary exponentially.
              </p>
            </div>

            {/* Swedish */}
            <div className={cn(
              'p-6 rounded-neo border-3 border-neo-black mb-6',
              isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
            )}>
              <h3 className={cn('text-xl font-bold mb-3 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                🇸🇪 Swedish: Compound Word Creation
              </h3>
              <p className={cn('mb-3', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                Swedish loves compound words—combining simple words creates specific, expressive vocabulary.
              </p>
              <div className={cn(
                'p-4 rounded border-2 border-neo-black mb-3',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-cyan/10'
              )}>
                <p className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  Example: Building compounds
                </p>
                <ul className={cn('text-sm space-y-1', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                  <li>sol (sun) + sken (shine) = solsken (sunshine)</li>
                  <li>barn (child) + bok (book) = barnbok (children&apos;s book)</li>
                  <li>katt (cat) + dörr (door) = kattdörr (cat door)</li>
                </ul>
              </div>
              <p className={cn('text-sm font-bold', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                Strategy: Learn common Swedish words, then experiment combining them. Many valid Swedish words are
                logical compounds.
              </p>
            </div>

            {/* Japanese */}
            <div className={cn(
              'p-6 rounded-neo border-3 border-neo-black mb-6',
              isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
            )}>
              <h3 className={cn('text-xl font-bold mb-3 flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                🇯🇵 Japanese: Reading vs. Meaning
              </h3>
              <p className={cn('mb-3', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                Japanese uses hiragana, katakana, and kanji. Focus on hiragana first for pure word-finding practice.
              </p>
              <div className={cn(
                'p-4 rounded border-2 border-neo-black mb-3',
                isDarkMode ? 'bg-slate-700' : 'bg-neo-pink/10'
              )}>
                <p className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  Reading Practice Progression
                </p>
                <ul className={cn('text-sm space-y-1', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                  <li><strong>Beginner:</strong> Hiragana-only games (あいうえお)</li>
                  <li><strong>Intermediate:</strong> Mix hiragana + common kanji (犬, 猫, 山)</li>
                  <li><strong>Advanced:</strong> Kanji compounds (学校, 図書館)</li>
                </ul>
              </div>
              <p className={cn('text-sm font-bold', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                Strategy: Master hiragana recognition first through word games before tackling kanji. The pattern
                recognition skills transfer.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              The Multilingual Advantage: Cognitive Benefits
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Playing word games across multiple languages isn&apos;t just about vocabulary—it fundamentally changes
              how your brain works:
            </p>
            <ul className={cn('space-y-3 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li>
                <strong className={isDarkMode ? 'text-white' : 'text-neo-black'}>
                  Enhanced Executive Function:
                </strong> Switching between languages strengthens your brain&apos;s control systems, improving focus
                and multitasking.
              </li>
              <li>
                <strong className={isDarkMode ? 'text-white' : 'text-neo-black'}>
                  Metalinguistic Awareness:
                </strong> Understanding how different languages structure words (Hebrew roots, English affixes, Swedish
                compounds) gives you insight into language itself.
              </li>
              <li>
                <strong className={isDarkMode ? 'text-white' : 'text-neo-black'}>
                  Cognitive Reserve:
                </strong> Research shows multilingualism delays cognitive aging—essentially building a buffer against
                dementia.
              </li>
              <li>
                <strong className={isDarkMode ? 'text-white' : 'text-neo-black'}>
                  Pattern Recognition:
                </strong> Spotting cognates and word patterns across languages accelerates learning in all languages.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Practical Study Plan: The 4-Language Rotation
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Don&apos;t try to master all languages at once. Use this proven rotation strategy:
            </p>

            <div className={cn(
              'p-6 rounded-neo border-2 border-neo-black mb-4',
              isDarkMode ? 'bg-slate-700' : 'bg-neo-yellow/20'
            )}>
              <h3 className={cn('font-bold mb-3', isDarkMode ? 'text-white' : 'text-neo-black')}>
                Weekly Language Focus
              </h3>
              <ul className={cn('space-y-2', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
                <li><strong>Week 1:</strong> English (builds confidence with your strongest language)</li>
                <li><strong>Week 2:</strong> Hebrew (practice root recognition)</li>
                <li><strong>Week 3:</strong> Swedish (experiment with compounds)</li>
                <li><strong>Week 4:</strong> Japanese (hiragana pattern recognition)</li>
                <li><strong>Repeat cycle</strong> - each round deepens mastery</li>
              </ul>
            </div>

            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              This rotation prevents burnout while maintaining exposure to all languages. Research shows that distributed
              practice (spacing out languages) beats massed practice (cramming one language).
            </p>
          </section>

          <section className="mb-8">
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Measuring Your Progress
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Track these metrics to see your multilingual vocabulary growth:
            </p>
            <ul className={cn('space-y-2 mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              <li><strong>Words per minute:</strong> Speed of word recognition in each language</li>
              <li><strong>Longest words found:</strong> Indicates depth of vocabulary</li>
              <li><strong>Pattern recall:</strong> How quickly you spot roots/compounds/affixes</li>
              <li><strong>Cross-language cognates:</strong> Words you recognize across languages</li>
            </ul>
          </section>

          <div className={cn(
            'p-6 rounded-neo border-3 border-neo-black mt-8',
            isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/20 border-neo-black'
          )}>
            <h2 className={cn('text-2xl font-bold mb-4', isDarkMode ? 'text-white' : 'text-neo-black')}>
              Start Your Multilingual Journey
            </h2>
            <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              The research is clear: game-based multilingual vocabulary learning works. It&apos;s more effective,
              more enjoyable, and more sustainable than traditional study methods. Whether you&apos;re learning
              for travel, career, or cognitive health, word games provide a proven path to fluency.
            </p>
            <p className={cn('mb-0 font-bold', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
              Ready to unlock the power of multilingual word games? Start with your strongest language today and
              watch your brain transform!
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
                  href="https://www.tandfonline.com/doi/full/10.1080/09588221.2025.2528786"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Do mobile games improve language learning? A meta-analysis (2025)
                </a>
              </li>
              <li>
                <a
                  href="https://www.sciencedirect.com/science/article/pii/S2666557324000028"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Digital game-based language learning for vocabulary development - ScienceDirect
                </a>
              </li>
              <li>
                <a
                  href="https://ilcentres.com/post/language-learning-trends-for-2025-whats-new-and-whats-next"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Language Learning Trends for 2025: What&apos;s New and What&apos;s Next?
                </a>
              </li>
              <li>
                <a
                  href="https://www.tandfonline.com/doi/full/10.1080/01434632.2025.2580563"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Conceptualising multilingual classrooms as a digital gamified translanguaging space (2025)
                </a>
              </li>
              <li>
                <a
                  href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11260936/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neo-cyan underline"
                >
                  Exploring the relationship between digital gaming, language attitudes, and academic success - PMC
                </a>
              </li>
            </ul>
          </section>

          <div className={cn('mt-8 pt-6 border-t', isDarkMode ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex gap-4 mt-6">
              <Link href={`/${locale}/singleplayer`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-pink text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  Start Learning Now
                </Button>
              </Link>
              <Link href={`/${locale}/daily`}>
                <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
                  Daily Challenge
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
