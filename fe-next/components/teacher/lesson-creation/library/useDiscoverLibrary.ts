'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/lib/supabase/education/types';
import { defaultLibraryLanguage, paginate, type GradeBand, type LibraryTopic } from '@/lib/education/library';
import { fetchDiscover } from '@/lib/education/libraryClient';
import type { LibraryItem, LibrarySource } from '@/lib/education/libraryTypes';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';

export const DISCOVER_PAGE_SIZE = 12;
export type DiscoverSort = 'popular' | 'newest';

export interface DiscoverFilters {
  language: Language | 'all';
  query: string;
  grade: GradeBand | null;
  topic: LibraryTopic | null;
  source: LibrarySource | 'all';
  sort: DiscoverSort;
}

const BAND_ORDER: Record<string, number> = { k2: 0, g35: 1, g68: 2, g912: 3 };

// Teacher-made lists rank above verified ones so freshly shared content is seen and grows.
function score(item: LibraryItem): number {
  if (item.source === 'verified') return 4;
  return 5 + (item.copyCount ?? 0) * 3 + (item.playCount ?? 0);
}

export function sortItems(items: LibraryItem[], sort: DiscoverSort): LibraryItem[] {
  return [...items].sort((a, b) => {
    if (sort === 'newest') {
      const at = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (at !== bt) return bt - at;
    } else {
      const d = score(b) - score(a);
      if (d !== 0) return d;
    }
    return (BAND_ORDER[a.gradeBand ?? ''] ?? 9) - (BAND_ORDER[b.gradeBand ?? ''] ?? 9) || a.name.localeCompare(b.name);
  });
}

export function filterItems(items: LibraryItem[], f: Omit<DiscoverFilters, 'sort' | 'language'>): LibraryItem[] {
  const q = f.query.trim().toLowerCase();
  return items.filter((item) => {
    if (f.source !== 'all' && item.source !== f.source) return false;
    if (f.grade && item.gradeBand !== f.grade) return false;
    if (f.topic && item.topic !== f.topic) return false;
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.description ?? '').toLowerCase().includes(q) ||
      (item.authorName ?? '').toLowerCase().includes(q) ||
      item.words.some((w) => w.word.toLowerCase().includes(q))
    );
  });
}

export function useDiscoverLibrary() {
  const { t, language: uiLanguage } = useLanguage();
  const [filters, setFilters] = useState<DiscoverFilters>(() => ({
    language: defaultLibraryLanguage(uiLanguage),
    query: '',
    grade: null,
    topic: null,
    source: 'all',
    sort: 'popular',
  }));
  const [page, setPage] = useState(0);
  const [remote, setRemote] = useState<LibraryItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    fetchDiscover(filters.language)
      .then(({ items }) => {
        if (!alive) return;
        setRemote(items);
        setStatus('ready');
      })
      .catch(() => {
        if (!alive) return;
        setRemote([]);
        setStatus('error');
      });
    return () => { alive = false; };
  }, [filters.language, reloadTick]);

  const packs = useMemo<LibraryItem[]>(
    () =>
      STARTER_LESSON_PACKS.map((p, i) => ({ p, i }))
        .filter(({ p }) => filters.language === 'all' || p.language === filters.language)
        .map(({ p, i }) => ({
          id: `pack:${i}`,
          source: 'verified' as const,
          name: t(p.nameKey),
          description: t(p.descriptionKey),
          language: p.language,
          words: p.words.map((w) => ({ word: w.word, canIntegrate: true, ...(w.definition ? { definition: w.definition } : {}) })),
          wordCount: p.words.length,
          authorName: null,
          gradeBand: null,
          topic: p.category === 'academic' ? ('english' as const) : ('language' as const),
          copyCount: null,
          playCount: null,
          createdAt: null,
          isMine: false,
          remixedFrom: null,
        })),
    [filters.language, t],
  );

  const all = useMemo(() => [...remote, ...packs], [remote, packs]);
  const filtered = useMemo(() => sortItems(filterItems(all, filters), filters.sort), [all, filters]);
  const paged = useMemo(() => paginate(filtered, page, DISCOVER_PAGE_SIZE), [filtered, page]);
  const teacherCount = useMemo(() => all.filter((i) => i.source === 'teacher').length, [all]);

  const update = useCallback((patch: Partial<DiscoverFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  }, []);

  return {
    filters,
    update,
    page: paged.page,
    pageCount: paged.pageCount,
    setPage,
    items: paged.items,
    total: filtered.length,
    teacherCount,
    status,
    reload: () => setReloadTick((n) => n + 1),
    patchItem: (id: string, patch: Partial<LibraryItem>) =>
      setRemote((items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i))),
  };
}
