'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LootDrop, LootRarity } from '@/types/adventure';

interface LootChestRevealProps {
  isOpen: boolean;
  drops: LootDrop[];
  onComplete: () => void;
}

const STAGGER_MS = 500;

const RARITY_GLOW: Record<LootRarity, string> = {
  common: 'shadow-hard-sm',
  rare: 'shadow-[0_0_12px_theme(colors.neo-cyan)]',
  epic: 'shadow-[0_0_16px_theme(colors.neo-pink)]',
};

const DROP_ICONS: Record<string, string> = {
  gold: '🪙',
  runeFragment: '💎',
  loreScroll: '📜',
  bossTrophy: '🏆',
};

const DROP_NAME_KEYS: Record<string, string> = {
  gold: 'adventure.loot.gold',
  runeFragment: 'adventure.loot.runeFragment',
  loreScroll: 'adventure.loot.loreScroll',
  bossTrophy: 'adventure.loot.bossTrophy',
};

export default function LootChestReveal({ isOpen, drops, onComplete }: LootChestRevealProps) {
  const { t } = useLanguage();
  const [opened, setOpened] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setOpened(false);
      setRevealedCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!opened || revealedCount >= drops.length) return;
    const timer = setTimeout(() => setRevealedCount(c => c + 1), STAGGER_MS);
    return () => clearTimeout(timer);
  }, [opened, revealedCount, drops.length]);

  const handleChestClick = useCallback(() => {
    if (!opened) setOpened(true);
  }, [opened]);

  if (!isOpen || drops.length === 0) return null;

  const allRevealed = revealedCount >= drops.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <motion.div
        className="flex flex-col items-center gap-6 p-8"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Chest */}
        <motion.div
          data-testid="loot-chest"
          className="relative cursor-pointer rounded-neo border-neo bg-amber-700 border-amber-900 p-8"
          onClick={handleChestClick}
          whileTap={{ scale: 0.95 }}
          animate={opened ? { rotateX: -20, y: -10 } : {}}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <span className="text-5xl">{opened ? '📦' : '🎁'}</span>
          {!opened && (
            <p className="mt-2 text-center font-neo-display text-sm text-neo-white">
              {t('adventure.loot.tapToOpen')}
            </p>
          )}
        </motion.div>

        {/* Drops */}
        <AnimatePresence>
          {opened && (
            <div className="flex flex-wrap justify-center gap-4">
              {drops.map((drop, i) => (
                i < revealedCount && (
                  <motion.div
                    key={`${drop.type}-${i}`}
                    data-testid={`loot-drop-${drop.type}`}
                    className={`flex flex-col items-center rounded-neo border-neo border-black bg-neo-navy p-4 ${RARITY_GLOW[drop.rarity]}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <span className="text-3xl">{DROP_ICONS[drop.type]}</span>
                    <span className="mt-1 font-neo-display text-lg text-neo-white">
                      {drop.quantity > 1 ? `×${drop.quantity}` : ''}
                    </span>
                    <span className="text-xs text-neo-white/70">
                      {t(DROP_NAME_KEYS[drop.type])}
                    </span>
                  </motion.div>
                )
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Continue */}
        {allRevealed && opened && (
          <motion.button
            data-testid="loot-continue"
            className="rounded-neo border-neo border-black bg-neo-yellow px-6 py-3 font-neo-display text-lg text-black shadow-hard active:shadow-hard-pressed"
            onClick={onComplete}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.95 }}
          >
            {t('adventure.loot.continue')}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
