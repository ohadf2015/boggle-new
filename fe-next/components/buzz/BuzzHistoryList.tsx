'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Clock, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader } from '@/components/ui/Loader';
import type { Language } from '@/types';

interface PastChallenge {
  puzzle_date: string;
  trending_summary: string;
  image_url?: string;
}

interface BuzzHistoryListProps {
  language: Language;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

/**
 * BuzzHistoryList - Browse and select past Daily Buzz challenges
 * Fetches available past challenges from the API and displays them in a list
 */
export default function BuzzHistoryList({
  language,
  onSelectDate,
  onClose,
}: BuzzHistoryListProps) {
  const { t } = useLanguage();
  const [challenges, setChallenges] = useState<PastChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Fetch past challenges
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/buzz/history/${language}?limit=${limit}&offset=${offset}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch challenge history');
        }

        const data = await response.json();
        if (data.success) {
          setChallenges(data.data || []);
          setHasMore(data.pagination?.hasMore || false);
          setTotal(data.pagination?.total || 0);
        } else {
          throw new Error('Invalid response');
        }
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to fetch buzz history:', errMessage);
        setError(errMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [language, offset]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = dateStr === today.toISOString().split('T')[0];
    const isYesterday = dateStr === yesterday.toISOString().split('T')[0];

    if (isToday) return t('common.today');
    if (isYesterday) return t('common.yesterday');

    return date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePrevPage = () => {
    if (offset >= limit) {
      setOffset(offset - limit);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setOffset(offset + limit);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-neo-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-neo-navy border-3 border-neo-black rounded-2xl shadow-hard-lg w-full max-w-md max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-3 border-neo-black bg-neo-pink/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neo-pink/20 rounded-lg">
                <Calendar className="w-5 h-5 text-neo-pink" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">
                  {t('buzz.history.title')}
                </h2>
                <p className="text-xs text-slate-400">
                  {total} {t('buzz.history.available')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neo-black/20 rounded-lg transition-colors"
            >
              <span className="text-slate-400 text-2xl">&times;</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader size="md" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-neo-red">{error}</p>
            </div>
          ) : challenges.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">
                {t('buzz.history.empty')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neo-black/30">
              <AnimatePresence mode="wait">
                {challenges.map((challenge, index) => (
                  <motion.button
                    key={challenge.puzzle_date}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onSelectDate(challenge.puzzle_date)}
                    className="w-full p-4 hover:bg-neo-pink/10 transition-colors flex items-center gap-4 text-left"
                  >
                    {/* Date badge */}
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="text-xs text-slate-500 uppercase">
                        {formatDate(challenge.puzzle_date)}
                      </div>
                      <div className="text-lg font-black text-white">
                        {new Date(challenge.puzzle_date).getDate()}
                      </div>
                    </div>

                    {/* Challenge preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-neo-pink" />
                        <span className="text-sm font-bold text-white truncate">
                          {challenge.trending_summary || 'Daily Buzz'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {challenge.puzzle_date}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0 rtl:rotate-180" />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && challenges.length > 0 && (
          <div className="p-4 border-t-3 border-neo-black flex items-center justify-between">
            <button
              onClick={handlePrevPage}
              disabled={offset === 0}
              className={`p-2 rounded-lg transition-colors ${
                offset === 0
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-white hover:bg-neo-pink/20'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-sm text-slate-400">
              {offset + 1}-{Math.min(offset + limit, total)} / {total}
            </span>

            <button
              onClick={handleNextPage}
              disabled={!hasMore}
              className={`p-2 rounded-lg transition-colors ${
                !hasMore
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-white hover:bg-neo-pink/20'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
