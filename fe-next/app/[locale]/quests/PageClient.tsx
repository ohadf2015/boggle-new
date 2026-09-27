'use client';

/**
 * QuestsPageClient — Full-page quest hub.
 * Combines daily missions + weekly quest in an RPG-inspired layout.
 */

import { ScrollText } from 'lucide-react';
import Header from '@/components/Header';
import { QuestHub } from '@/components/quests/QuestHub';
import { useLanguage } from '@/contexts/LanguageContext';

export default function QuestsPageClient() {
  const { t } = useLanguage();

  return (
    <div className="flex-1 flex flex-col bg-neo-navy min-h-screen page-content-safe">
      <Header />
      <main className="flex-1 w-full max-w-lg mx-auto px-3 py-4 sm:px-4 sm:py-6 pb-24">
        {/* Page title with icon */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-neo border-2 border-neo-black bg-neo-cyan/20 flex items-center justify-center shadow-hard-sm">
            <ScrollText className="w-5 h-5 text-neo-cyan" aria-hidden="true" />
          </div>
          <h1 className="font-neo-display text-2xl font-black text-neo-white uppercase tracking-wide">
            {t('quests.title')}
          </h1>
        </div>

        <QuestHub />
      </main>
    </div>
  );
}
