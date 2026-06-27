'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Copy, Check, Share2, Sword } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ==================== Types ====================

interface BossDefeatShareCardProps {
  bossId: string;
  bossName: string;
  worldName: string;
  worldNumber: number;
  killingWord: string;
  stars: number;
  score: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ==================== Per-Boss Theme Config ====================

interface BossShareTheme {
  emoji: string;
  icon: string;
  borderColor: string;
  accentColor: string;
  glowColor: string;
  buttonBg: string;
  wordBg: string;
  wordBorder: string;
  /** Witty share text lines (randomized per share) */
  taunts: string[];
  /** Emoji header for the share text */
  shareEmoji: string;
  /** Short boss title for share text */
  shareTitle: string;
}

const BOSS_THEMES: Record<string, BossShareTheme> = {
  msGrammar: {
    emoji: '🦉', icon: '📝', shareEmoji: '🦉📝', shareTitle: 'POP QUIZ FAILED (by the teacher)',
    borderColor: 'border-neo-lime', accentColor: 'text-neo-lime',
    glowColor: 'bg-neo-lime/10', buttonBg: 'bg-neo-lime text-neo-black',
    wordBg: 'bg-neo-lime/10', wordBorder: 'border-neo-lime/30',
    taunts: [
      'The owl has been schooled.',
      'A+ in boss slaying, F in mercy.',
      'Class dismissed... permanently.',
      'Pop quiz: Who just got destroyed? Answer: this owl.',
    ],
  },
  spellingBee: {
    emoji: '🐝', icon: '🍯', shareEmoji: '🐝⚔️', shareTitle: 'HIVE DETHRONED',
    borderColor: 'border-neo-cyan', accentColor: 'text-neo-cyan',
    glowColor: 'bg-neo-cyan/10', buttonBg: 'bg-neo-cyan text-neo-black',
    wordBg: 'bg-neo-cyan/10', wordBorder: 'border-neo-cyan/30',
    taunts: [
      'Bee-headed. Wait, that came out wrong.',
      'The queen just got spelling bee\'d.',
      'Honey, I shrunk the boss HP to zero.',
      'Bzzzzt. Game over for the hive.',
    ],
  },
  professorThesaurus: {
    emoji: '🐢', icon: '📚', shareEmoji: '🐢📚', shareTitle: 'TENURE REVOKED',
    borderColor: 'border-neo-purple', accentColor: 'text-neo-purple',
    glowColor: 'bg-neo-purple/10', buttonBg: 'bg-neo-purple text-neo-white',
    wordBg: 'bg-neo-purple/10', wordBorder: 'border-neo-purple/30',
    taunts: [
      'Defeated, vanquished, conquered, obliterated.',
      'The Professor found no synonym for "losing."',
      'Ancient wisdom meets modern word violence.',
      'Turns out, knowing every word doesn\'t mean winning.',
    ],
  },
  captainMetaphor: {
    emoji: '🦜', icon: '🏴‍☠️', shareEmoji: '🦜🏴‍☠️', shareTitle: 'SHIP SUNK',
    borderColor: 'border-neo-pink', accentColor: 'text-neo-pink',
    glowColor: 'bg-neo-pink/10', buttonBg: 'bg-neo-pink text-neo-white',
    wordBg: 'bg-neo-pink/10', wordBorder: 'border-neo-pink/30',
    taunts: [
      'That pirate just walked the plank of shame.',
      'A bird in the hand beats a parrot in defeat.',
      'Metaphorically AND literally destroyed.',
      'The Captain\'s ship has sailed... to loserville.',
    ],
  },
  baronBuildaword: {
    emoji: '🔧', icon: '⚙️', shareEmoji: '⚙️🔧', shareTitle: 'MACHINE BROKEN',
    borderColor: 'border-neo-red', accentColor: 'text-neo-red',
    glowColor: 'bg-neo-red/10', buttonBg: 'bg-neo-red text-neo-white',
    wordBg: 'bg-neo-red/10', wordBorder: 'border-neo-red/30',
    taunts: [
      'His word-machine just short-circuited.',
      'Assembly line? More like dis-assembly line.',
      'The Baron built a word for "defeat" — it\'s his name.',
      'Steampunk? More like steam-PUNKED.',
    ],
  },
  puzzleMaster: {
    emoji: '🐱', icon: '🎭', shareEmoji: '🐱🎭', shareTitle: 'RIDDLE SOLVED',
    borderColor: 'border-neo-pink', accentColor: 'text-neo-pink',
    glowColor: 'bg-neo-pink/10', buttonBg: 'bg-neo-pink text-neo-white',
    wordBg: 'bg-neo-pink/10', wordBorder: 'border-neo-pink/30',
    taunts: [
      'Riddle me this: who just lost? This cat.',
      'The biggest puzzle was how to lose this gracefully. He didn\'t.',
      'Nine lives, zero wins.',
      'The mask hides his embarrassment now.',
    ],
  },
  reflectionKing: {
    emoji: '🦚', icon: '🪞', shareEmoji: '🦚❄️', shareTitle: 'MIRROR SHATTERED',
    borderColor: 'border-neo-cyan', accentColor: 'text-neo-cyan',
    glowColor: 'bg-neo-cyan/10', buttonBg: 'bg-neo-cyan text-neo-black',
    wordBg: 'bg-neo-cyan/10', wordBorder: 'border-neo-cyan/30',
    taunts: [
      'Looked in the mirror and saw a loser. Accurate.',
      'The Ice King just got cold served.',
      'His reflection shows: defeated.',
      'Vanity: 10/10. Combat: 0/10.',
    ],
  },
  cosmicWordsmith: {
    emoji: '🪼', icon: '🌌', shareEmoji: '🪼🌌', shareTitle: 'NEBULA COLLAPSED',
    borderColor: 'border-neo-purple', accentColor: 'text-neo-purple',
    glowColor: 'bg-neo-purple/10', buttonBg: 'bg-neo-purple text-neo-white',
    wordBg: 'bg-neo-purple/10', wordBorder: 'border-neo-purple/30',
    taunts: [
      'An ancient cosmic being... defeated by a mortal and a really good word.',
      'Invented languages, couldn\'t invent a win.',
      'The universe is vast. This L is vaster.',
      'Stars die. Bosses die. This jellyfish just did both.',
    ],
  },
  linguistSage: {
    emoji: '🐐', icon: '⛰️', shareEmoji: '🐐⛰️', shareTitle: 'PEAK CONQUERED',
    borderColor: 'border-neo-cyan', accentColor: 'text-neo-cyan',
    glowColor: 'bg-neo-cyan/10', buttonBg: 'bg-neo-cyan text-neo-black',
    wordBg: 'bg-neo-cyan/10', wordBorder: 'border-neo-cyan/30',
    taunts: [
      'The GOAT? More like the goat who got got.',
      'Speaks every language except "winning."',
      'Enlightenment didn\'t include dodge mechanics.',
      'Multilingual but mono-defeated.',
    ],
  },
  lexiconDragon: {
    emoji: '🐉', icon: '👑', shareEmoji: '🐉👑', shareTitle: 'DRAGON DETHRONED',
    borderColor: 'border-neo-lime', accentColor: 'text-neo-lime',
    glowColor: 'bg-neo-lime/10', buttonBg: 'bg-neo-lime text-neo-black',
    wordBg: 'bg-neo-lime/10', wordBorder: 'border-neo-lime/30',
    taunts: [
      'THE FINAL BOSS IS DOWN. Legendary.',
      'A dragon made of words... slain by a word. Poetic.',
      'He just wanted a friend. Got a rival instead.',
      'The throne is yours. The dragon is crying.',
    ],
  },
};

const DEFAULT_THEME: BossShareTheme = {
  emoji: '👹', icon: '⚔️', shareEmoji: '👹⚔️', shareTitle: 'BOSS SLAIN',
  borderColor: 'border-neo-pink', accentColor: 'text-neo-pink',
  glowColor: 'bg-neo-pink/10', buttonBg: 'bg-neo-pink text-neo-white',
  wordBg: 'bg-neo-pink/10', wordBorder: 'border-neo-pink/30',
  taunts: ['Another boss bites the dust.', 'That boss had it coming.'],
};

// ==================== Share Text Builder ====================

function buildBossShareText(props: BossDefeatShareCardProps, theme: BossShareTheme, taunt: string): string {
  const { bossName, worldName, killingWord, stars, score } = props;
  const starRow = '⭐'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));

  return [
    `${theme.shareEmoji} ${theme.shareTitle} ${theme.shareEmoji}`,
    `${theme.emoji} ${bossName} — ${worldName}`,
    '',
    `🗡️ Killing word: "${killingWord.toUpperCase()}"`,
    starRow,
    `${score.toLocaleString()} pts`,
    '',
    taunt,
    '',
    'lexiclash.live/adventure',
  ].join('\n');
}

// ==================== Component ====================

export function BossDefeatShareCard(props: BossDefeatShareCardProps) {
  const { bossId, bossName, worldName, killingWord, stars, score, t } = props;
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current); };
  }, []);

  const theme = BOSS_THEMES[bossId] || DEFAULT_THEME;
  const [tauntIndex] = useState(() => Math.floor(Math.random() * theme.taunts.length));
  const taunt = theme.taunts[tauntIndex % theme.taunts.length];

  const shareText = useMemo(
    () => buildBossShareText(props, theme, taunt),
    [props, theme, taunt]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback silently */ }
  }, [shareText]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: shareText, url: 'https://lexiclash.live/adventure' });
      } catch {
        await handleCopy();
      }
    } else {
      await handleCopy();
    }
  }, [shareText, handleCopy]);

  const isLegendary = bossId === 'lexiconDragon';

  return (
    <AdaptiveMotion.div
      data-testid="boss-defeat-share-card"
      initial={{ scale: 0.92 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className={cn(
        'relative overflow-hidden border-3 rounded-neo shadow-hard p-5 select-all',
        'animate-in fade-in-0 duration-300',
        'bg-linear-to-br from-neo-black via-slate-900 to-neo-black',
        theme.borderColor,
        isLegendary && 'ring-2 ring-neo-lime/40 ring-offset-2 ring-offset-neo-black',
      )}
    >
      {/* Decorative glows */}
      <div className={cn('absolute -top-10 -right-10 w-36 h-36 rounded-full blur-2xl pointer-events-none', theme.glowColor)} />
      <div className={cn('absolute -bottom-8 -left-8 w-28 h-28 rounded-full blur-xl pointer-events-none opacity-60', theme.glowColor)} />

      {/* Header row */}
      <div className="relative flex items-center gap-2 mb-3">
        <span className="text-xl">{theme.emoji}</span>
        <span className={cn('font-black text-xs uppercase tracking-[0.15em]', theme.accentColor)}>
          {theme.shareTitle}
        </span>
        <div className={cn('flex-1 h-px', theme.accentColor, 'opacity-20')} style={{ backgroundColor: 'currentColor' }} />
        <span className="text-lg">{theme.icon}</span>
      </div>

      {/* Boss name + world */}
      <div className="relative mb-3">
        <div className="text-neo-white text-[10px] font-bold uppercase tracking-wider mb-0.5">
          {worldName}
        </div>
        <div className="text-neo-white font-black text-2xl tracking-tight leading-tight">
          {bossName}
        </div>
      </div>

      {/* Killing word — the hero moment */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, type: 'spring' }}
        className={cn('flex items-center gap-3 mb-3 p-3 border-2 rounded-neo', theme.wordBg, theme.wordBorder)}
      >
        <Sword className={cn('w-5 h-5 shrink-0', theme.accentColor)} />
        <div className="min-w-0">
          <div className="text-neo-white text-[10px] font-bold uppercase tracking-wider">
            {t('adventure.share.killingWord')}
          </div>
          <div className={cn('font-black text-xl tracking-widest uppercase truncate', theme.accentColor)}>
            {killingWord}
          </div>
        </div>
      </AdaptiveMotion.div>

      {/* Witty taunt */}
      <AdaptiveMotion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-neo-white text-xs font-bold italic mb-3 leading-relaxed"
      >
        &ldquo;{taunt}&rdquo;
      </AdaptiveMotion.p>

      {/* Stars + Score */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xl tracking-wider" aria-label={`${stars} of 3 stars`}>
          {Array.from({ length: 3 }, (_, i) => (
            <AdaptiveMotion.span
              key={`star-${i}`}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5 + i * 0.1, type: 'spring', stiffness: 300 }}
              className={cn('inline-block', i >= stars && 'opacity-25 grayscale')}
            >
              ⭐
            </AdaptiveMotion.span>
          ))}
        </div>
        <AdaptiveMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-neo-white font-black text-base tabular-nums"
        >
          {score.toLocaleString()}{' '}
          <span className="text-neo-white font-normal text-xs">{t('common.pts')}</span>
        </AdaptiveMotion.div>
      </div>

      {/* Domain */}
      <div className="text-neo-white text-[10px] font-mono tracking-wider mb-4">
        lexiclash.live
      </div>

      {/* Share buttons */}
      <div className="flex gap-2 select-none relative">
        <Button
          onClick={handleNativeShare}
          size="sm"
          className={cn(
            'flex-1 py-2.5 border-2 border-neo-black rounded-neo shadow-hard-sm',
            'font-black text-xs uppercase',
            'hover:shadow-hard hover:-translate-y-0.5',
            'active:translate-y-0.5 active:shadow-hard-pressed transition-all',
            theme.buttonBg,
          )}
        >
          <Share2 className="w-3.5 h-3.5 me-1.5" />
          {t('share.emojiCard.share')}
        </Button>
        <Button
          onClick={handleCopy}
          size="sm"
          aria-label={copied ? t('common.copied') : t('share.emojiCard.copy')}
          className={cn(
            'flex-1 py-2.5 bg-neo-navy text-white border-2 rounded-neo shadow-hard-sm',
            'text-xs uppercase',
            'hover:shadow-hard hover:-translate-y-0.5',
            'active:translate-y-0.5 active:shadow-hard-pressed transition-all',
            theme.wordBorder,
          )}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 me-1.5 text-neo-lime" />
          ) : (
            <Copy className="w-3.5 h-3.5 me-1.5" />
          )}
          {copied ? t('common.copied') : t('share.emojiCard.copy')}
        </Button>
      </div>
    </AdaptiveMotion.div>
  );
}
