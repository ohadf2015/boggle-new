'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import Header from '../../../components/Header';

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
  const { t, dir } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('boards');

  return (
    <div className="min-h-screen bg-neo-navy">
      <Header />
      <div className="p-4 pt-20 pb-24 max-w-5xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className={cn(
            'flex items-center gap-1.5 mb-4 px-3 py-1.5',
            'text-neo-white/70 hover:text-neo-white',
            'font-neo-body text-sm transition-colors'
          )}
        >
          <ArrowLeft className={cn('w-4 h-4', dir === 'rtl' && 'rotate-180')} />
          {t('common.back')}
        </button>
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
    </div>
  );
}
