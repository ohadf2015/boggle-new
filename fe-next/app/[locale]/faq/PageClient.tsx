'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import { AdPlaceholder } from '@/components/ads';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'What is LexiClash?',
    answer: 'LexiClash is a multiplayer word game where you compete against friends or AI opponents to find words on a shared board. Play solo, challenge daily puzzles, or compete in real-time multiplayer matches across Hebrew, English, Swedish, and Japanese.',
  },
  {
    category: 'Getting Started',
    question: 'How do I create an account?',
    answer: 'You can play as a guest or create an account using Google Sign-In. Having an account lets you save your progress, track statistics, compete on leaderboards, and play across devices.',
  },
  {
    category: 'Getting Started',
    question: 'Is LexiClash free to play?',
    answer: 'Yes! LexiClash is completely free to play. All game modes including singleplayer, multiplayer, and daily challenges are available at no cost.',
  },
  {
    category: 'Gameplay',
    question: 'How do I score points?',
    answer: 'Points are awarded based on word length and letter values. Longer words score more points. Rare letters like Q, Z, and X have higher values. Bonus points are awarded for finding all words on the board.',
  },
  {
    category: 'Gameplay',
    question: 'What game modes are available?',
    answer: 'LexiClash offers three main modes: (1) Singleplayer - practice against AI with various difficulty levels, (2) Multiplayer - real-time matches against other players, (3) Daily Challenge - compete on the same puzzle as players worldwide.',
  },
  {
    category: 'Gameplay',
    question: 'How does the Daily Challenge work?',
    answer: 'Every day at midnight UTC, a new puzzle is generated that all players worldwide can attempt. You get one chance per day to find as many words as possible. Your score is recorded on the daily leaderboard.',
  },
  {
    category: 'Gameplay',
    question: 'Can I play in multiple languages?',
    answer: 'Yes! LexiClash supports Hebrew, English, Swedish, and Japanese. You can switch languages in Settings. Each language has its own word dictionary and leaderboards.',
  },
  {
    category: 'Technical',
    question: 'Which devices are supported?',
    answer: 'LexiClash works on all modern devices including desktop computers, tablets, and smartphones. We support the latest versions of Chrome, Firefox, Safari, and Edge browsers.',
  },
  {
    category: 'Technical',
    question: 'Do I need an internet connection to play?',
    answer: 'Yes, an internet connection is required for multiplayer and daily challenges. However, you can play singleplayer mode offline if you have previously loaded the game.',
  },
  {
    category: 'Technical',
    question: 'How do I report a bug or technical issue?',
    answer: 'If you encounter a bug, please contact us at lexiclash.game@gmail.com or reach out on Instagram @lexi.clash. Include details about what happened and which device/browser you were using.',
  },
  {
    category: 'Account',
    question: 'How do I change my username or profile?',
    answer: 'Go to Settings (gear icon in the header) and navigate to the Profile section. You can update your username, avatar, and other profile details there.',
  },
  {
    category: 'Account',
    question: 'Can I play on multiple devices?',
    answer: 'Yes! If you create an account using Google Sign-In, your progress, statistics, and settings sync automatically across all your devices.',
  },
  {
    category: 'Account',
    question: 'How do I delete my account?',
    answer: 'To delete your account, go to Settings > Account > Delete Account. This action is permanent and will erase all your data including statistics, achievements, and game history.',
  },
  {
    category: 'Privacy & Safety',
    question: 'Is my data safe?',
    answer: 'Yes. We take privacy seriously and only collect necessary data to operate the game. We use industry-standard encryption and never sell your personal information. See our Privacy Policy for full details.',
  },
  {
    category: 'Privacy & Safety',
    question: 'Does LexiClash show ads?',
    answer: 'We partner with Google AdSense to display relevant advertisements. Ads help us keep the game free for everyone. You can learn more about ad personalization and opt-out options in our Privacy Policy.',
  },
  {
    category: 'Privacy & Safety',
    question: 'Can I opt out of data collection?',
    answer: 'While some data collection is necessary for the game to function (like your username and scores), you can opt out of analytics and personalized ads in Settings > Privacy.',
  },
];

export default function FAQPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const params = useParams();
  const locale = params.locale as string;
  const isDarkMode = theme === 'dark';

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const categories = Array.from(new Set(faqData.map(item => item.category)));

  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-gradient-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <div className="max-w-4xl mx-auto px-4 py-8 page-content-safe">
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
              <HelpCircle className="w-8 h-8 text-neo-yellow" />
              FAQ
            </h1>
            <p className={cn('text-sm mt-2', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              Frequently Asked Questions
            </p>
          </div>
        </div>

        {/* FAQ by Category */}
        {categories.map((category, catIdx) => (
          <div key={category} className="mb-8">
            {/* Ad: Between category sections (after ~8 items) */}
            {catIdx === 2 && <AdPlaceholder zone="content-page" className="mb-8" />}
            <h2 className={cn(
              'text-2xl font-bold mb-4',
              isDarkMode ? 'text-white' : 'text-neo-black'
            )}>
              {category}
            </h2>
            <div className="space-y-3">
              {faqData
                .filter(item => item.category === category)
                .map((item, idx) => {
                  const globalIndex = faqData.indexOf(item);
                  const isOpen = openIndex === globalIndex;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'rounded-neo border-3 border-neo-black transition-all',
                        isDarkMode
                          ? 'bg-slate-800'
                          : 'bg-white shadow-hard',
                        isOpen && 'shadow-hard-lg'
                      )}
                    >
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                        className="w-full flex items-center justify-between p-4 text-left"
                      >
                        <span className={cn(
                          'font-bold text-lg pe-4',
                          isDarkMode ? 'text-white' : 'text-neo-black'
                        )}>
                          {item.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 flex-shrink-0 text-neo-yellow" />
                        ) : (
                          <ChevronDown className="w-5 h-5 flex-shrink-0 text-gray-500" />
                        )}
                      </button>
                      {isOpen && (
                        <div className={cn(
                          'px-4 pb-4 pt-0',
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        )}>
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}

        {/* Contact CTA */}
        <div className={cn(
          'mt-12 p-6 rounded-neo border-3 border-neo-black text-center',
          isDarkMode ? 'bg-slate-800' : 'bg-neo-yellow/20'
        )}>
          <h3 className={cn('text-xl font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
            Still have questions?
          </h3>
          <p className={cn('mb-4', isDarkMode ? 'text-gray-300' : 'text-gray-700')}>
            We&apos;re here to help! Reach out to us anytime.
          </p>
          <Link href={`/${locale}/contact`}>
            <Button className="rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg">
              Contact Us
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
