'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestFingerprint } from '@/utils/guestManager';
import BuzzReadyScreen from './BuzzReadyScreen';
import BuzzGameScreen from './BuzzGameScreen';
import BuzzResultsScreen from './BuzzResultsScreen';
import { NeoLoader } from '@/components/ui/NeoLoader';
import type { Language } from '@/types';

interface BuzzChallengeProps {
  language: Language;
  onBack: () => void;
  /** Optional date to load a specific past challenge (format: YYYY-MM-DD). Defaults to today. */
  date?: string;
}

interface BuzzChallengeData {
  id: number;
  puzzleDate: string;
  language: string;
  trendingSummary: string;
  trendingTopics: Array<{
    query: string;
    volume?: number;
    newsSnippet?: string;
  }>;
  challenges: Array<{
    type: 'scrambled' | 'fillBlank' | 'chain' | 'spotOn' | 'trio' | 'wordle';
    trendTopic: string;
    prompt: string;
    answer: string;
    hint?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    trendingContext?: string;
    options?: string[];
  }>;
  imageUrl?: string;
}

interface BuzzResultData {
  challengeId: number;
  score: number;
  challengesSolved: Array<{
    challengeIndex: number;
    userAnswer: string;
    correct: boolean;
    timeTakenSeconds: number;
  }>;
  completionTimeSeconds: number;
}

type BuzzPhase = 'loading' | 'ready' | 'playing' | 'results' | 'error';

/**
 * BuzzChallenge - Main orchestrator for Daily Buzz challenge flow
 * Phases: loading → ready → playing → results
 * Supports playing today's challenge or past challenges via the date prop
 */
export default function BuzzChallenge({ language, onBack, date }: BuzzChallengeProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();

  const [phase, setPhase] = useState<BuzzPhase>('loading');
  const [challengeData, setChallengeData] = useState<BuzzChallengeData | null>(null);
  const [resultData, setResultData] = useState<BuzzResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);

  // Determine which date to fetch (today or specified past date)
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Fetch buzz challenge for the target date
  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        setPhase('loading');
        const response = await fetch(`/api/buzz/${targetDate}/${language}`);

        if (!response.ok) {
          throw new Error('Failed to fetch daily buzz');
        }

        const data = await response.json();
        if (data.success && data.data && data.data.challenges?.length > 0) {
          setChallengeData(data.data);

          // Check if already played this challenge
          const checkParams = new URLSearchParams();
          if (profile?.id) {
            checkParams.set('player_id', profile.id);
          } else {
            const fingerprint = getGuestFingerprint();
            if (fingerprint) {
              checkParams.set('guest_fingerprint', fingerprint);
            }
          }

          if (checkParams.toString()) {
            const checkResponse = await fetch(
              `/api/buzz/check-played/${targetDate}/${language}?${checkParams.toString()}`
            );
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              setHasPlayedToday(checkData.data?.played || false);
            }
          }

          setPhase('ready');
        } else {
          throw new Error('Invalid challenge data');
        }
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to fetch buzz challenge:', errMessage);
        setErrorMessage(errMessage || 'Failed to load challenge');
        setPhase('error');
      }
    };

    fetchChallenge();
  }, [language, profile?.id, targetDate]);

  // Handle start game
  const handleStart = () => {
    setPhase('playing');
  };

  // Handle skip all challenges - go directly to results with empty answers
  const handleSkipAll = () => {
    if (!challengeData) return;

    const skippedResult: BuzzResultData = {
      challengeId: challengeData.id,
      score: 0,
      challengesSolved: challengeData.challenges.map((_, index) => ({
        challengeIndex: index,
        userAnswer: '',
        correct: false,
        timeTakenSeconds: 0,
      })),
      completionTimeSeconds: 0,
    };
    setResultData(skippedResult);
    setPhase('results');
  };

  // Handle game completion
  const handleComplete = (result: BuzzResultData) => {
    setResultData(result);
    setPhase('results');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center"
          >
            <NeoLoader variant="mascot-letters" size="lg" text={t('buzz.loading')} />
          </motion.div>
        )}

        {phase === 'ready' && challengeData && (
          <BuzzReadyScreen
            key="ready"
            challengeData={challengeData}
            hasPlayedToday={hasPlayedToday}
            onStart={handleStart}
            onSkipAll={handleSkipAll}
            onBack={onBack}
          />
        )}

        {phase === 'playing' && challengeData && (
          <BuzzGameScreen
            key="playing"
            challengeData={challengeData}
            onComplete={handleComplete}
            onQuit={onBack}
          />
        )}

        {phase === 'results' && challengeData && resultData && (
          <BuzzResultsScreen
            key="results"
            challengeData={challengeData}
            resultData={resultData}
            onBack={onBack}
          />
        )}

        {phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center p-4"
          >
            <div className="text-center space-y-4 max-w-md">
              <div className="text-6xl">😞</div>
              <h2 className="text-2xl font-black text-neo-red">
                {t('buzz.error.title')}
              </h2>
              <p className="text-slate-400">{errorMessage}</p>
              <button
                onClick={onBack}
                className="px-6 py-3 bg-neo-yellow text-neo-black font-bold rounded-xl border-3 border-neo-black shadow-hard hover:shadow-hard-lg transition-all"
              >
                {t('common.back')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
