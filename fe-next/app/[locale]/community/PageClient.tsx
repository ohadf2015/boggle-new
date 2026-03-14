'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '../../../lib/utils';
import { useLanguage } from '../../../contexts/LanguageContext';

const BoardGallery = dynamic(
  () => import('../../../components/ugc/BoardGallery'),
  { ssr: false }
);
const WordPackGallery = dynamic(
  () => import('../../../components/ugc/WordPackGallery'),
  { ssr: false }
);

type Tab = 'boards' | 'packs';

export default function CommunityPageClient() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('boards');

  return (
    <main className="min-h-screen bg-neo-navy p-4 pt-20 pb-24">
      <div className="max-w-5xl mx-auto">
        {/* Tab switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('boards')}
            className={cn(
              'px-4 py-2 font-neo-display font-bold text-sm',
              'border-3 border-neo-black rounded-neo',
              'transition-all duration-100',
              activeTab === 'boards'
                ? 'bg-neo-lime text-neo-black shadow-hard'
                : 'bg-neo-navy text-neo-white/60 hover:text-neo-white'
            )}
          >
            {t('ugc.gallery.title')}
          </button>
          <button
            onClick={() => setActiveTab('packs')}
            className={cn(
              'px-4 py-2 font-neo-display font-bold text-sm',
              'border-3 border-neo-black rounded-neo',
              'transition-all duration-100',
              activeTab === 'packs'
                ? 'bg-neo-lime text-neo-black shadow-hard'
                : 'bg-neo-navy text-neo-white/60 hover:text-neo-white'
            )}
          >
            {t('ugc.myPacks')}
          </button>
        </div>

        {activeTab === 'boards' ? <BoardGallery /> : <WordPackGallery />}
      </div>
    </main>
  );
}
