'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import BuzzReadyScreen from './BuzzReadyScreen';
import BuzzGameScreen from './BuzzGameScreen';
import BuzzResultsScreen from './BuzzResultsScreen';
import type { Language } from '@/types';

interface BuzzChallengeProps {
  language: Language;
  onBack: () => void;
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
    type: 'scrambled' | 'fillBlank' | 'chain' | 'spotOn' | 'trio';
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
    answer: string;
    correct: boolean;
    timeTakenSeconds: number;
  }>;
  completionTimeSeconds: number;
}

type BuzzPhase = 'loading' | 'ready' | 'playing' | 'results' | 'error';

/**
 * BuzzChallenge - Main orchestrator for Daily Buzz challenge flow
 * Phases: loading → ready → playing → results
 */
export default function BuzzChallenge({ language, onBack }: BuzzChallengeProps) {
  const { t } = useLanguage();
  const { profile, isAuthenticated } = useAuth();

  const [phase, setPhase] = useState<BuzzPhase>('loading');
  const [challengeData, setChallengeData] = useState<BuzzChallengeData | null>(null);
  const [resultData, setResultData] = useState<BuzzResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);

  // Fetch today's buzz challenge
  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        setPhase('loading');
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/buzz/${today}/${language}`);

        if (!response.ok) {
          throw new Error('Failed to fetch daily buzz');
        }

        const data = await response.json();
        if (data.success && data.data) {
          setChallengeData(data.data);

          // Check if already played today
          const checkResponse = await fetch(
            `/api/buzz/check-played/${today}/${language}`
          );
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            setHasPlayedToday(checkData.played || false);
          }

          setPhase('ready');
        } else {
          throw new Error('Invalid challenge data');
        }
      } catch (err: any) {
        console.error('Failed to fetch buzz challenge:', err);
        setErrorMessage(err.message || 'Failed to load challenge');
        setPhase('error');
      }
    };

    fetchChallenge();
  }, [language]);

  // Handle start game
  const handleStart = () => {
    setPhase('playing');
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
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-neo-yellow border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-neo-yellow font-bold">
                {t('buzz.loading') || 'Loading Daily Buzz...'}
              </p>
            </div>
          </motion.div>
        )}

        {phase === 'ready' && challengeData && (
          <BuzzReadyScreen
            key="ready"
            challengeData={challengeData}
            hasPlayedToday={hasPlayedToday}
            onStart={handleStart}
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
                {t('buzz.error') || 'Oops!'}
              </h2>
              <p className="text-slate-400">{errorMessage}</p>
              <button
                onClick={onBack}
                className="px-6 py-3 bg-neo-yellow text-neo-black font-bold rounded-xl border-3 border-neo-black shadow-hard hover:shadow-hard-lg transition-all"
              >
                {t('common.back') || 'Go Back'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
