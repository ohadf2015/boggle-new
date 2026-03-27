'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2, Skull, Sword } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BossDefeatShareCardProps {
  bossName: string;
  worldName: string;
  worldNumber: number;
  killingWord: string;
  stars: number;
  score: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const WORLD_EMOJIS: Record<number, string> = {
  1: '\u{1F332}', 2: '\u{1F30B}', 3: '\u{2744}\u{FE0F}', 4: '\u{1F3DC}\u{FE0F}',
  5: '\u{1F30A}', 6: '\u{26A1}', 7: '\u{1F48E}', 8: '\u{1F525}',
  9: '\u{1F31F}', 10: '\u{1F451}',
};

function buildBossShareText(props: BossDefeatShareCardProps): string {
  const { bossName, worldName, worldNumber, killingWord, stars, score } = props;
  const worldEmoji = WORLD_EMOJIS[worldNumber] || '\u{2694}\u{FE0F}';
  const starRow = '\u{2B50}'.repeat(stars) + '\u{2606}'.repeat(Math.max(0, 3 - stars));

  return [
    `\u{1F480} BOSS SLAIN \u{1F480}`,
    `${worldEmoji} ${worldName}`,
    '',
    `\u{1F5E1}\u{FE0F} ${bossName} defeated`,
    `\u{1F4AC} Killing word: "${killingWord.toUpperCase()}"`,
    starRow,
    `${score.toLocaleString()} pts`,
    '',
    `Think you can beat this boss? \u{1F525}`,
    'lexiclash.live',
  ].join('\n');
}

export function BossDefeatShareCard(props: BossDefeatShareCardProps) {
  const { bossName, worldName, worldNumber, killingWord, stars, score, t } = props;
  const [copied, setCopied] = useState(false);
  const worldEmoji = WORLD_EMOJIS[worldNumber] || '\u{2694}\u{FE0F}';

  const shareText = buildBossShareText(props);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback silently */ }
  }, [shareText]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: shareText, url: 'https://lexiclash.live' });
      } catch {
        await handleCopy();
      }
    } else {
      await handleCopy();
    }
  }, [shareText, handleCopy]);

  return (
    <motion.div
      data-testid="boss-defeat-share-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-br from-neo-black via-slate-900 to-neo-black border-3 border-neo-pink rounded-neo shadow-hard p-5 select-all"
    >
      {/* Decorative glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-neo-pink/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-neo-purple/10 rounded-full blur-xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center gap-2 mb-4">
        <Skull className="w-5 h-5 text-neo-pink" />
        <span className="text-neo-pink font-black text-xs uppercase tracking-[0.2em]">
          Boss Slain
        </span>
        <div className="flex-1 h-px bg-neo-pink/20" />
      </div>

      {/* Boss info */}
      <div className="relative mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{worldEmoji}</span>
          <span className="text-neo-white/50 text-xs font-bold uppercase">{worldName}</span>
        </div>
        <div className="text-neo-white font-black text-xl tracking-tight">
          {bossName}
        </div>
      </div>

      {/* Killing word highlight */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-3 mb-4 p-3 bg-neo-pink/10 border-2 border-neo-pink/30 rounded-neo"
      >
        <Sword className="w-5 h-5 text-neo-pink flex-shrink-0" />
        <div>
          <div className="text-neo-white/50 text-[10px] font-bold uppercase tracking-wider">
            {t('adventure.share.killingWord')}
          </div>
          <div className="text-neo-pink font-black text-lg tracking-wide uppercase">
            {killingWord}
          </div>
        </div>
      </motion.div>

      {/* Stars + Score row */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg tracking-wider">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className={i < stars ? '' : 'opacity-30'}>
              {i < stars ? '\u{2B50}' : '\u{2606}'}
            </span>
          ))}
        </div>
        <div className="text-neo-white font-black text-sm tabular-nums">
          {score.toLocaleString()} <span className="text-neo-white/40 font-normal">{t('common.pts')}</span>
        </div>
      </div>

      {/* Domain */}
      <div className="text-neo-white/30 text-xs font-mono mb-4">lexiclash.live</div>

      {/* Share buttons */}
      <div className="flex gap-2 select-none relative">
        <Button
          onClick={handleNativeShare}
          size="sm"
          className="flex-1 py-2.5 bg-neo-pink text-neo-white border-2 border-neo-black rounded-neo shadow-hard-sm font-black text-xs uppercase hover:shadow-hard hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all"
        >
          <Share2 className="w-3.5 h-3.5 me-1.5" />
          {t('share.emojiCard.share')}
        </Button>
        <Button
          onClick={handleCopy}
          size="sm"
          aria-label={copied ? t('common.copied') : t('share.emojiCard.copy')}
          className="flex-1 py-2.5 bg-neo-navy text-white border-2 border-neo-pink/30 rounded-neo shadow-hard-sm text-xs uppercase hover:shadow-hard hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 me-1.5 text-neo-lime" />
          ) : (
            <Copy className="w-3.5 h-3.5 me-1.5" />
          )}
          {copied ? t('common.copied') : t('share.emojiCard.copy')}
        </Button>
      </div>
    </motion.div>
  );
}
