/**
 * ShareCardGenerator Component
 *
 * Generates beautiful, shareable result cards for all game modes.
 * Supports PNG export and deep link generation.
 *
 * Usage:
 *   <ShareCardGenerator
 *     data={{
 *       mode: 'daily',
 *       score: 1250,
 *       topWord: 'EXCELLENT',
 *       bestCombo: 8,
 *       language: 'en'
 *     }}
 *     onClose={() => {}}
 *   />
 */

'use client';

import React, { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Link2, Share2, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export type ShareCardMode = 'daily' | 'multiplayer' | 'singleplayer' | 'challenge';

export interface ShareCardData {
  mode: ShareCardMode;
  score: number;
  rank?: number;
  totalPlayers?: number;
  topWord: string;
  bestCombo: number;
  percentile?: number;
  puzzleNumber?: number;
  isPerfectGame?: boolean;
  isNewPersonalBest?: boolean;
  language: string;
}

interface ShareCardGeneratorProps {
  data: ShareCardData;
  onClose: () => void;
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const MODE_COLORS: Record<ShareCardMode, { bg: string; accent: string }> = {
  daily: { bg: 'from-neo-cyan to-neo-cyan/80', accent: '#00FFFF' },
  multiplayer: { bg: 'from-neo-pink to-neo-pink/80', accent: '#FF69B4' },
  singleplayer: { bg: 'from-neo-yellow to-neo-yellow/80', accent: '#FFE135' },
  challenge: { bg: 'from-neo-lime to-neo-lime/80', accent: '#32CD32' },
};

const MODE_ICONS: Record<ShareCardMode, string> = {
  daily: '📅',
  multiplayer: '⚔️',
  singleplayer: '🎮',
  challenge: '🎯',
};

// ============================================
// COMPONENT
// ============================================

export function ShareCardGenerator({ data, onClose, className }: ShareCardGeneratorProps) {
  const { t, language } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const {
    mode,
    score,
    rank,
    totalPlayers,
    topWord,
    bestCombo,
    percentile,
    puzzleNumber,
    isPerfectGame,
    isNewPersonalBest,
  } = data;

  // Generate deep link for challenge
  const generateDeepLink = useCallback(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      challenge: mode,
      score: score.toString(),
      word: topWord,
      combo: bestCombo.toString(),
      lang: language,
    });
    if (puzzleNumber) params.set('puzzle', puzzleNumber.toString());
    return `${baseUrl}/play?${params.toString()}`;
  }, [mode, score, topWord, bestCombo, language, puzzleNumber]);

  // Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    const link = generateDeepLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, [generateDeepLink]);

  // Generate and download PNG
  // NOTE: Install html2canvas for image export functionality
  // npm install html2canvas
  const handleDownloadImage = useCallback(async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      // For now, use native screenshot API or alert
      // Full implementation requires html2canvas package
      if ('showSaveFilePicker' in window) {
        // Use native screen capture if available
        alert('Screenshot feature coming soon! Use your device screenshot for now.');
      } else {
        alert('To save this card as an image, please take a screenshot!');
      }
    } catch (err) {
      console.error('Failed to generate image:', err);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Native share (mobile)
  const handleNativeShare = useCallback(async () => {
    const shareData = {
      title: `LexiClash ${mode} Results`,
      text: `Score: ${score} | Top Word: ${topWord} | Combo: ${bestCombo}x`,
      url: generateDeepLink(),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled
      }
    } else {
      // Fallback to copy
      handleCopyLink();
    }
  }, [score, topWord, bestCombo, generateDeepLink, handleCopyLink, mode]);

  const modeColors = MODE_COLORS[mode];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-neo-black/80 backdrop-blur-sm',
        className
      )}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-neo-white/60 hover:text-neo-white transition-colors"
          aria-label={t('common.close')}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Share Card Preview */}
        <div
          ref={cardRef}
          className={cn(
            'relative overflow-hidden rounded-neo border-4 border-neo-black',
            'bg-gradient-to-br p-6 shadow-hard-lg',
            modeColors.bg
          )}
        >
          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">{MODE_ICONS[mode]}</span>
              <div>
                <h2 className="text-2xl font-neo-display font-black text-neo-black">
                  LEXICLASH
                </h2>
                <p className="text-neo-black/70 font-neo-body text-sm">
                  {mode === 'daily' && puzzleNumber
                    ? `Daily Challenge #${puzzleNumber}`
                    : mode}
                </p>
              </div>
            </div>

            {/* Achievement Badges */}
            {(isPerfectGame || isNewPersonalBest) && (
              <div className="flex gap-2 mb-4">
                {isPerfectGame && (
                  <span className="px-3 py-1 bg-neo-yellow text-neo-black text-sm font-bold rounded-neo border-2 border-neo-black">
                    ⭐ PERFECT!
                  </span>
                )}
                {isNewPersonalBest && (
                  <span className="px-3 py-1 bg-neo-lime text-neo-black text-sm font-bold rounded-neo border-2 border-neo-black">
                    🎉 NEW BEST!
                  </span>
                )}
              </div>
            )}

            {/* Score */}
            <div className="mb-6">
              <p className="text-neo-black/60 text-sm font-neo-body mb-1">Final Score</p>
              <p className="text-5xl font-neo-display font-black text-neo-black">
                {score.toLocaleString()}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-neo-black/10 rounded-neo p-3 border-2 border-neo-black">
                <p className="text-neo-black/60 text-xs mb-1">Longest Word</p>
                <p className="text-xl font-neo-display font-bold text-neo-black truncate">
                  {topWord}
                </p>
                <p className="text-neo-black/60 text-xs">{topWord.length} letters</p>
              </div>
              <div className="bg-neo-black/10 rounded-neo p-3 border-2 border-neo-black">
                <p className="text-neo-black/60 text-xs mb-1">Best Combo</p>
                <p className="text-xl font-neo-display font-bold text-neo-black">{bestCombo}x</p>
                <p className="text-neo-black/60 text-xs">Max Streak</p>
              </div>
            </div>

            {/* Rank/Percentile */}
            {(rank || percentile) && (
              <div className="bg-neo-black text-neo-white rounded-neo p-4 border-2 border-neo-black">
                {rank && totalPlayers && (
                  <p className="text-center font-neo-display text-lg">
                    🥇 Rank <span className="text-neo-yellow">#{rank}</span> / {totalPlayers}
                  </p>
                )}
                {percentile && (
                  <p className="text-center text-neo-white/80 text-sm mt-1">
                    📊 Top {percentile}% today
                  </p>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t-2 border-neo-black/20">
              <p className="text-center text-neo-black/70 text-sm font-neo-body">
                Play at lexiclash.app
              </p>
            </div>
          </div>
        </div>

        {/* Share Actions */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="bg-neo-navy border-2 border-neo-black text-neo-white hover:bg-neo-navy/80"
          >
            <Link2 className="w-4 h-4 mr-2" />
            {copiedLink ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button
            onClick={handleDownloadImage}
            disabled={isGenerating}
            variant="outline"
            className="bg-neo-navy border-2 border-neo-black text-neo-white hover:bg-neo-navy/80"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? '...' : 'Save Image'}
          </Button>
          <Button
            onClick={handleNativeShare}
            className="bg-neo-yellow border-2 border-neo-black text-neo-black hover:bg-neo-yellow/90 font-bold"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ShareCardGenerator;
