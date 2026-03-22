'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LayoutGrid, Package, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';

const BoardGallery = dynamic(
  () => import('@/components/ugc/BoardGallery'),
  { ssr: false }
);
const WordPackGallery = dynamic(
  () => import('@/components/ugc/WordPackGallery'),
  { ssr: false }
);
const UGCFeaturedStrip = dynamic(
  () => import('@/components/ugc/UGCFeaturedStrip'),
  { ssr: false }
);
const CreatorLeaderboard = dynamic(
  () => import('@/components/ugc/CreatorLeaderboard'),
  { ssr: false }
);

type Tab = 'boards' | 'packs' | 'creators';

const TAB_CONFIG: { key: Tab; icon: typeof LayoutGrid; labelKey: string }[] = [
  { key: 'boards', icon: LayoutGrid, labelKey: 'ugc.community.tabBoards' },
  { key: 'packs', icon: Package, labelKey: 'ugc.community.tabPacks' },
  { key: 'creators', icon: Crown, labelKey: 'ugc.community.tabCreators' },
];

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

        {/* Hero header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-neo-pink" />
            <h1 className="font-neo-display font-bold text-2xl sm:text-3xl text-neo-white">
              {t('ugc.community.title')}
            </h1>
          </div>
          <p className="text-neo-white/60 font-neo-body text-sm max-w-md mx-auto">
            {t('ugc.community.subtitle')}
          </p>
        </div>

        {/* Featured boards at the top — always visible */}
        <div className="mb-6">
          <UGCFeaturedStrip
            titleKey="ugc.strip.featured"
            sort="featured"
            limit={3}
            variant="default"
            showCreateCTA
            showViewAll={false}
            minToShow={1}
          />
        </div>

        {/* Tab switcher — 3 tabs with icons */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide" role="tablist">
          {TAB_CONFIG.map(({ key, icon: Icon, labelKey }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 font-neo-display font-bold text-sm',
                'border-3 border-black rounded-neo whitespace-nowrap',
                'transition-all duration-100',
                activeTab === key
                  ? 'bg-neo-lime text-black shadow-hard'
                  : 'bg-neo-navy text-neo-white/60 hover:text-neo-white shadow-hard-sm hover:shadow-hard'
              )}
            >
              <Icon className="w-4 h-4" />
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'boards' && <BoardGallery />}
        {activeTab === 'packs' && <WordPackGallery />}
        {activeTab === 'creators' && <CreatorLeaderboard />}
      </div>
    </div>
  );
}
