'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WordPackCard from './WordPackCard';
import WordPackBuilder from './WordPackBuilder';

type SortOption = 'popular' | 'newest' | 'upvoted';

interface WordPack {
  id: string;
  name: string;
  description?: string | null;
  theme_emoji?: string | null;
  word_count: number;
  play_count: number;
  upvote_count: number;
  tags?: string[] | null;
  creator_display_name: string;
  creator_avatar?: Record<string, unknown> | null;
}

interface GalleryState {
  packs: WordPack[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
}

const LANGUAGES = [
  { value: 'all', label: 'ugc.gallery.filterAll' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'he', label: 'Hebrew' },
  { value: 'sv', label: 'Swedish' },
  { value: 'ja', label: 'Japanese' },
];

const SORT_TABS: { value: SortOption; labelKey: string }[] = [
  { value: 'popular', labelKey: 'ugc.gallery.sortPopular' },
  { value: 'newest', labelKey: 'ugc.gallery.sortNewest' },
  { value: 'upvoted', labelKey: 'ugc.gallery.sortUpvoted' },
];

export default function WordPackGallery() {
  const { t, language: uiLanguage } = useLanguage();
  const router = useRouter();
  const [sort, setSort] = useState<SortOption>('popular');
  const [language, setLanguage] = useState('all');
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [showBuilder, setShowBuilder] = useState(false);
  const [state, setState] = useState<GalleryState>({
    packs: [],
    page: 1,
    hasMore: false,
    isLoading: false,
    error: null,
  });

  const fetchPacks = useCallback(
    async (page: number, reset: boolean) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const params = new URLSearchParams({
          sort,
          page: String(page),
          limit: '12',
        });
        if (language !== 'all') params.set('language', language);

        const res = await fetch(`/api/ugc/packs?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch packs');
        const data = await res.json();

        setState((prev) => ({
          packs: reset ? data.packs : [...prev.packs, ...data.packs],
          page,
          hasMore: data.hasMore ?? false,
          isLoading: false,
          error: null,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    },
    [sort, language]
  );

  useEffect(() => {
    fetchPacks(1, true);
  }, [fetchPacks]);

  const handleLoadMore = useCallback(() => {
    fetchPacks(state.page + 1, false);
  }, [fetchPacks, state.page]);

  const handlePlay = useCallback((packId: string) => {
    // Navigate to multiplayer with word pack pre-selected
    router.push(`/${uiLanguage}/multiplayer?autoCreate=true&wordPack=${packId}`);
  }, [router, uiLanguage]);

  const handleUpvote = useCallback(async (packId: string) => {
    setUpvotedIds((prev) => {
      const next = new Set(prev);
      if (next.has(packId)) {
        next.delete(packId);
      } else {
        next.add(packId);
      }
      return next;
    });

    // Optimistic — fire and forget
    fetch(`/api/ugc/packs/${packId}/upvote`, { method: 'POST' }).catch(() => {});
  }, []);

  const handleBuilderClose = useCallback(() => {
    setShowBuilder(false);
    // Refresh on successful publish
    fetchPacks(1, true);
  }, [fetchPacks]);

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Title row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-neo-display text-2xl text-neo-white">
          {t('ugc.gallery.title')}
        </h2>
        <button
          type="button"
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neo-lime text-black font-neo-display text-sm border-neo border-black rounded-neo shadow-hard hover:shadow-hard-pressed active:animate-neo-press"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {t('ugc.gallery.createPack')}
        </button>
      </div>

      {/* Sort tabs */}
      <Tabs value={sort} onValueChange={(v) => setSort(v as SortOption)} className="mb-4">
        <TabsList
          variant="pill"
          className="h-auto gap-1 bg-transparent p-0"
          aria-label={t('ugc.gallery.sortLabel')}
        >
          {SORT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              variant="pill"
              className="rounded-neo border-neo border-black bg-neo-navy px-4 py-2 text-sm font-neo-display text-neo-white transition-colors hover:bg-neo-navy/80 data-[state=active]:bg-neo-yellow data-[state=active]:text-black data-[state=active]:shadow-hard-sm"
            >
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Language filter */}
      <div className="mb-6">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger
            className="w-auto bg-neo-navy border-black text-neo-white text-sm focus:ring-neo-yellow"
            aria-label={t('ugc.gallery.languageFilter')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.value === 'all' ? t(lang.label) : lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {state.error && (
        <p className="text-neo-orange font-neo-body text-sm mb-4">{state.error}</p>
      )}

      {/* Grid */}
      {state.packs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.packs.map((pack, i) => (
            <m.div
              key={pack.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * Math.min(i, 12), type: 'spring', stiffness: 350, damping: 24 }}
            >
              <WordPackCard
                pack={pack}
                isUpvoted={upvotedIds.has(pack.id)}
                onPlay={handlePlay}
                onUpvote={handleUpvote}
              />
            </m.div>
          ))}
        </div>
      ) : !state.isLoading ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-4" aria-hidden="true">📦</span>
          <p className="font-neo-display text-xl text-neo-white mb-2">
            {t('ugc.gallery.emptyTitle')}
          </p>
          <p className="text-sm text-neo-white font-neo-body mb-6">
            {t('ugc.gallery.emptySubtitle')}
          </p>
          <button
            type="button"
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 px-6 py-3 bg-neo-lime text-black font-neo-display border-neo border-black rounded-neo shadow-hard hover:shadow-hard-pressed active:animate-neo-press"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t('ugc.gallery.createPack')}
          </button>
        </div>
      ) : null}

      {/* Loading */}
      {state.isLoading && (
        <div className="flex justify-center py-8" aria-live="polite">
          <Loader2 className="w-8 h-8 text-neo-yellow animate-spin" aria-label={t('common.loading')} />
        </div>
      )}

      {/* Load more */}
      {state.hasMore && !state.isLoading && (
        <div className="flex justify-center mt-8">
          <button
            type="button"
            onClick={handleLoadMore}
            className="px-6 py-3 bg-neo-navy text-neo-white font-neo-display border-neo border-black rounded-neo shadow-hard hover:shadow-hard-pressed active:animate-neo-press"
          >
            {t('ugc.gallery.loadMore')}
          </button>
        </div>
      )}

      {/* Builder modal */}
      {showBuilder && (
        <WordPackBuilder isOpen={showBuilder} onClose={handleBuilderClose} />
      )}
    </section>
  );
}
