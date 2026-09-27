'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Plus, TrendingUp, Clock, Users, Hash, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/PageLoader';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { NeoPanel } from '@/components/ui/panel';
import CustomPuzzleCreator from './CustomPuzzleCreator';

interface BrowsePuzzle {
  puzzleCode: string;
  creatorDisplayName: string;
  language: string;
  wordLength: number;
  creatorScore: number;
  creatorSolved: boolean;
  totalPlays: number;
  createdAt: string;
}

type SortMode = 'newest' | 'popular';

function getDifficultyLabel(wordLength: number, t: (key: string) => string): string {
  if (wordLength <= 4) return t('puzzleBrowse.difficultyEasy');
  if (wordLength <= 6) return t('puzzleBrowse.difficultyMedium');
  return t('puzzleBrowse.difficultyHard');
}

function getDifficultyColor(wordLength: number): string {
  if (wordLength <= 4) return 'bg-neo-lime text-neo-black';
  if (wordLength <= 6) return 'bg-neo-orange text-neo-black';
  return 'bg-neo-pink text-neo-white';
}

function timeAgo(dateStr: string, t: (key: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t('puzzleBrowse.minutesAgo').replace('{n}', String(mins || 1));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('puzzleBrowse.hoursAgo').replace('{n}', String(hours));
  const days = Math.floor(hours / 24);
  return t('puzzleBrowse.daysAgo').replace('{n}', String(days));
}

const PuzzleBrowse: React.FC = () => {
  const { t, language } = useLanguage();
  const [puzzles, setPuzzles] = useState<BrowsePuzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('newest');
  const [showCreator, setShowCreator] = useState(false);

  const fetchPuzzles = useCallback(async (sortMode: SortMode) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/custom-puzzles?sort=${sortMode}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setPuzzles(data.puzzles);
      } else {
        setError(data.error || t('common.errorOccurred'));
      }
    } catch {
      setError(t('common.errorOccurred'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchPuzzles(sort);
  }, [sort, fetchPuzzles]);

  const handleSortChange = useCallback((newSort: SortMode) => {
    setSort(newSort);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy p-4 sm:p-6">
      <TopBackLink className="mb-4" />
      {/* Header */}
      <div className="max-w-4xl mx-auto w-full mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-neo-white font-neo-display">
              {t('puzzleBrowse.title')}
            </h1>
            <p className="text-neo-white mt-1">
              {t('puzzleBrowse.subtitle')}
            </p>
          </div>
          <Button
            onClick={() => setShowCreator(true)}
            className="bg-linear-to-r from-neo-pink to-neo-orange text-neo-white border-3 border-neo-black rounded-neo shadow-hard font-bold hover:shadow-hard-lg hover:-translate-y-1 active:translate-y-0 active:shadow-hard-pressed transition-all"
          >
            <Plus className="w-5 h-5 me-2" />
            {t('puzzleBrowse.createYourOwn')}
          </Button>
        </div>

        {/* Sort Tabs */}
        <div className="flex gap-2 mt-4">
          <button type="button"
            onClick={() => handleSortChange('newest')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-neo border-2 border-neo-black font-bold text-sm transition-all ${
              sort === 'newest'
                ? 'bg-neo-cyan text-neo-black shadow-hard-sm'
                : 'bg-neo-navy-light text-neo-white hover:bg-neo-navy-light/80'
            }`}
          >
            <Clock className="w-4 h-4" />
            {t('puzzleBrowse.sortNewest')}
          </button>
          <button type="button"
            onClick={() => handleSortChange('popular')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-neo border-2 border-neo-black font-bold text-sm transition-all ${
              sort === 'popular'
                ? 'bg-neo-cyan text-neo-black shadow-hard-sm'
                : 'bg-neo-navy-light text-neo-white hover:bg-neo-navy-light/80'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {t('puzzleBrowse.sortPopular')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto w-full flex-1">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <PageLoader text={t('puzzleBrowse.loading')} />
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-neo-white mb-4">{error}</p>
            <Button variant="outline" onClick={() => fetchPuzzles(sort)}>
              {t('common.retry')}
            </Button>
          </div>
        )}

        {!loading && !error && puzzles.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 text-neo-white mx-auto mb-4" />
            <p className="text-neo-white text-lg mb-2">
              {t('puzzleBrowse.empty')}
            </p>
            <p className="text-neo-white text-sm mb-6">
              {t('puzzleBrowse.emptyHint')}
            </p>
            <Button
              onClick={() => setShowCreator(true)}
              className="bg-neo-pink text-neo-white border-3 border-neo-black rounded-neo shadow-hard font-bold"
            >
              <Plus className="w-5 h-5 me-2" />
              {t('puzzleBrowse.createFirst')}
            </Button>
          </div>
        )}

        {!loading && !error && puzzles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {puzzles.map((puzzle, i) => (
              <AdaptiveMotion.div
                key={puzzle.puzzleCode}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/${language}/custom/${puzzle.puzzleCode}`}>
                  <NeoPanel tone="cream" className="hover:shadow-hard-lg hover:-translate-y-1 active:translate-y-0 active:shadow-hard-pressed transition-all p-4 cursor-pointer h-full flex flex-col">
                    {/* Top row: code + difficulty */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 text-neo-black/50">
                        <Hash className="w-3.5 h-3.5" />
                        <span className="font-mono text-sm font-bold uppercase">
                          {puzzle.puzzleCode}
                        </span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-neo border border-neo-black ${getDifficultyColor(puzzle.wordLength)}`}>
                        {getDifficultyLabel(puzzle.wordLength, t)}
                      </span>
                    </div>

                    {/* Creator */}
                    <p className="text-sm font-bold text-neo-black truncate mb-1">
                      {t('puzzleBrowse.by').replace('{name}', puzzle.creatorDisplayName)}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-auto pt-3 text-xs text-neo-black/50">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {puzzle.totalPlays} {t('puzzleBrowse.plays')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {timeAgo(puzzle.createdAt, t)}
                      </span>
                    </div>
                  </NeoPanel>
                </Link>
              </AdaptiveMotion.div>
            ))}
          </div>
        )}
      </div>

      {/* Creator Modal */}
      <CustomPuzzleCreator
        isOpen={showCreator}
        onClose={() => setShowCreator(false)}
        language={language}
      />
    </div>
  );
};

export default PuzzleBrowse;
