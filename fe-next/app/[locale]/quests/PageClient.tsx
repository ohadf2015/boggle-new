'use client';

/**
 * QuestsPageClient — Full-page quest hub.
 * Combines daily missions + weekly quest in an RPG-inspired layout.
 */

import Header from '@/components/Header';
import { QuestHub } from '@/components/quests/QuestHub';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAssetUrl } from '@/lib/assets/cdn';

export default function QuestsPageClient() {
  const { t } = useLanguage();

  return (
    <div className="flex-1 flex flex-col bg-neo-navy min-h-screen page-content-safe">
      <Header />
      <main className="flex-1 w-full max-w-lg mx-auto px-3 py-4 sm:px-4 sm:py-6 pb-24">
        <div className="flex items-center gap-3 mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- small pre-sized sticker */}
          <img
            src={getAssetUrl('/quests/crown.webp')}
            width={48}
            height={48}
            alt=""
            className="size-12 -rotate-12 rtl:rotate-12 object-contain"
          />
          <h1 className="font-neo-display text-3xl font-black text-neo-white uppercase tracking-wide">
            {t('quests.title')}
          </h1>
        </div>

        <QuestHub />
      </main>
    </div>
  );
}
