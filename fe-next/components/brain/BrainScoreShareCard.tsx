'use client';

import React, { useRef, useState, useCallback } from 'react';
import {
  Brain,
  Share2,
  Download,
  Copy,
  Check,
  X,
  Twitter,
  Sparkles,
  Zap,
  Target,
  Shuffle,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BrainTier, CognitiveDomains } from '@/shared/types/cognitive';

interface BrainScoreShareCardProps {
  score: number;
  tier: BrainTier;
  domains: CognitiveDomains;
  gamesAnalyzed: number;
  username?: string;
  onClose?: () => void;
}

const TIER_CONFIG: Record<BrainTier, { color: string; bgGradient: string; emoji: string }> = {
  novice: { color: 'text-slate-400', bgGradient: 'from-slate-500 to-slate-600', emoji: '🌱' },
  apprentice: { color: 'text-neo-green', bgGradient: 'from-green-500 to-green-600', emoji: '📚' },
  intermediate: { color: 'text-neo-cyan', bgGradient: 'from-cyan-500 to-cyan-600', emoji: '⚡' },
  advanced: { color: 'text-neo-purple', bgGradient: 'from-purple-500 to-purple-600', emoji: '🔥' },
  expert: { color: 'text-neo-orange', bgGradient: 'from-orange-500 to-orange-600', emoji: '🏆' },
  master: { color: 'text-neo-lime', bgGradient: 'from-yellow-400 to-amber-500', emoji: '👑' },
};

const DOMAIN_ICONS = {
  processingSpeed: Zap,
  workingMemory: Brain,
  attention: Target,
  flexibility: Shuffle,
  vocabulary: BookOpen,
};

/**
 * BrainScoreShareCard Component
 *
 * A shareable card displaying the user's Brain Score that can be:
 * - Copied as text for social media
 * - Downloaded as an image
 * - Shared via native share API
 */
export default function BrainScoreShareCard({
  score,
  tier,
  domains,
  gamesAnalyzed,
  username,
  onClose,
}: BrainScoreShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Check for native share support on mount
  React.useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  const tierConfig = TIER_CONFIG[tier];

  // Generate shareable text
  const generateShareText = useCallback(() => {
    const domainEmojis = {
      processingSpeed: '⚡',
      workingMemory: '🧠',
      attention: '🎯',
      flexibility: '🔄',
      vocabulary: '📖',
    };

    const domainLines = Object.entries(domains)
      .map(([key, data]) => {
        const emoji = domainEmojis[key as keyof typeof domainEmojis];
        return `${emoji} ${data.score}`;
      })
      .join(' ');

    return `${tierConfig.emoji} My Brain Score: ${score}/100

${domainLines}

${t('brain.share.tier')}: ${t(`brain.tiers.${tier}`)}
${t('brain.share.gamesPlayed')}: ${gamesAnalyzed}

${t('brain.share.trainYourBrain')} 🎮
lexiclash.live`;
  }, [score, tier, domains, gamesAnalyzed, t, tierConfig.emoji]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    const text = generateShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') return;
      console.error('Failed to copy:', err);
    }
  }, [generateShareText]);

  // Native share (mobile)
  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;

    setIsSharing(true);
    try {
      await navigator.share({
        title: t('brain.share.title'),
        text: generateShareText(),
        url: 'https://www.lexiclash.live',
      });
    } catch (err) {
      // AbortError means user cancelled the share dialog - this is normal behavior
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('Share failed:', err);
    } finally {
      setIsSharing(false);
    }
  }, [generateShareText, t]);

  // Share to Twitter/X
  const handleTwitterShare = useCallback(() => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  }, [generateShareText]);

  // Get strongest domain
  const strongestDomain = Object.entries(domains).reduce((a, b) =>
    a[1].score > b[1].score ? a : b
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in-0 duration-300"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* The Shareable Card */}
          <div
            ref={cardRef}
            className={cn(
              'rounded-neo border-4 border-neo-black shadow-hard-lg overflow-hidden',
              'bg-linear-to-br',
              tierConfig.bgGradient
            )}
          >
            {/* Header */}
            <div className="p-4 text-center text-white">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider opacity-90">
                  {t('brain.share.brainScore')}
                </span>
                <Sparkles className="w-5 h-5" />
              </div>

              {username && (
                <p className="text-xs opacity-80 mb-1">@{username}</p>
              )}

              {/* Main Score */}
              <div
                className="my-4 animate-in zoom-in-50 duration-300"
                style={{ animationDelay: '0.1s' }}
              >
                <div className="text-7xl font-black drop-shadow-lg">{score}</div>
                <div className="text-xl font-bold opacity-80">/100</div>
              </div>

              {/* Tier Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-xs">
                <span className="text-2xl">{tierConfig.emoji}</span>
                <span className="font-black uppercase tracking-wide">
                  {t(`brain.tiers.${tier}`)}
                </span>
              </div>
            </div>

            {/* Domain Scores Grid */}
            <div className="bg-white/10 backdrop-blur-xs p-4">
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(domains).map(([key, data]) => {
                  const Icon = DOMAIN_ICONS[key as keyof typeof DOMAIN_ICONS];
                  const isStrongest = key === strongestDomain[0];

                  return (
                    <div
                      key={key}
                      className={cn(
                        'text-center p-2 rounded-lg',
                        isStrongest ? 'bg-white/30' : 'bg-white/10'
                      )}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1 text-white" />
                      <div className="text-lg font-black text-white">{data.score}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-neo-black/20 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-sm">LexiClash</span>
              </div>
              <span className="text-white text-xs">
                {gamesAnalyzed} {t('brain.share.games')}
              </span>
            </div>
          </div>

          {/* Share Actions */}
          <div className={cn(
            'mt-4 p-4 rounded-neo border-3 border-neo-black shadow-hard',
            isDarkMode ? 'bg-neo-navy-light' : 'bg-white'
          )}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={cn(
                'font-bold text-sm uppercase',
                isDarkMode ? 'text-neo-white' : 'text-neo-black'
              )}>
                {t('brain.share.shareYourScore')}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className={cn(
                  'p-1.5 rounded-neo border-2 border-neo-black',
                  isDarkMode ? 'bg-neo-navy-elevated' : 'bg-gray-100'
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Copy Text */}
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-neo border-2 border-neo-black',
                  'transition-all hover:translate-y-[-2px] hover:shadow-hard-sm',
                  copied ? 'bg-neo-green' : isDarkMode ? 'bg-neo-navy-elevated' : 'bg-gray-100'
                )}
              >
                {copied ? (
                  <Check className="w-5 h-5 text-neo-black" />
                ) : (
                  <Copy className={cn('w-5 h-5', isDarkMode ? 'text-neo-white' : 'text-neo-black')} />
                )}
                <span className={cn(
                  'text-[10px] font-bold uppercase',
                  copied ? 'text-neo-black' : isDarkMode ? 'text-neo-white' : 'text-neo-black'
                )}>
                  {copied ? t('common.copied') : t('common.copy')}
                </span>
              </button>

              {/* Twitter/X */}
              <button
                type="button"
                onClick={handleTwitterShare}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-neo border-2 border-neo-black',
                  'transition-all hover:translate-y-[-2px] hover:shadow-hard-sm',
                  'bg-black text-white'
                )}
              >
                <Twitter className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase">X</span>
              </button>

              {/* Native Share (mobile) */}
              {canShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  disabled={isSharing}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-neo border-2 border-neo-black',
                    'transition-all hover:translate-y-[-2px] hover:shadow-hard-sm',
                    'bg-neo-cyan text-neo-black'
                  )}
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase">
                    {t('common.share')}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
