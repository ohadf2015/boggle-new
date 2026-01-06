'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CLUE_SHOP_ITEMS, type ClueShopItem } from '@/utils/aiHintGenerator';

export interface SurvivalClueShopProps {
  isOpen: boolean;
  clueTokens: number;
  onClose: () => void;
  onPurchase: (item: ClueShopItem) => void;
  compact?: boolean;
  t: (key: string) => string;
}

/**
 * Clue shop modal for purchasing hints with tokens
 */
export const SurvivalClueShop: React.FC<SurvivalClueShopProps> = ({
  isOpen,
  clueTokens,
  onClose,
  onPurchase,
  compact = false,
  t,
}) => {
  // Get translated names and descriptions
  const itemNames: Record<string, string> = {
    'reveal_letter': t('wordHunt.survival.revealLetter') || 'Reveal Letter',
    'eliminate_letters': t('wordHunt.survival.eliminateLetters') || 'Eliminate Wrong Letters',
    'example_sentence': t('wordHunt.survival.exampleSentence') || 'Example Sentence',
    'reveal_category': t('wordHunt.survival.revealCategory') || 'Reveal Category',
  };

  const itemDescs: Record<string, string> = {
    'reveal_letter': t('wordHunt.survival.revealLetterDesc') || 'Reveal a random letter in the target word',
    'eliminate_letters': t('wordHunt.survival.eliminateLettersDesc') || 'Remove 3 letters that are NOT in the word',
    'example_sentence': t('wordHunt.survival.exampleSentenceDesc') || 'See the word used in a sentence',
    'reveal_category': t('wordHunt.survival.revealCategoryDesc') || 'Show the word category',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className={cn(
              "bg-white dark:bg-neo-navy rounded-neo border-4 border-neo-black w-full",
              compact ? "p-4 max-w-sm" : "p-6 max-w-md"
            )}
            onClick={e => e.stopPropagation()}
          >
            <h3 className={cn(
              "font-black mb-4",
              compact ? "text-lg mb-3" : "text-xl"
            )}>
              {t('wordHunt.survival.shop') || 'Clue Shop'}
            </h3>

            <div className="space-y-2">
              {CLUE_SHOP_ITEMS.map(item => (
                <ShopItem
                  key={item.id}
                  item={item}
                  name={itemNames[item.id] || item.name}
                  description={itemDescs[item.id] || item.description}
                  canAfford={clueTokens >= item.cost}
                  compact={compact}
                  onPurchase={onPurchase}
                />
              ))}
            </div>

            <Button
              onClick={onClose}
              className={cn("w-full", compact ? "mt-3" : "mt-4")}
            >
              {t('common.close') || 'Close'}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ShopItemProps {
  item: ClueShopItem;
  name: string;
  description: string;
  canAfford: boolean;
  compact: boolean;
  onPurchase: (item: ClueShopItem) => void;
}

const ShopItem: React.FC<ShopItemProps> = ({
  item,
  name,
  description,
  canAfford,
  compact,
  onPurchase,
}) => {
  if (compact) {
    return (
      <button
        onClick={() => onPurchase(item)}
        disabled={!canAfford}
        className={cn(
          "w-full flex items-center justify-between p-2 rounded-neo border-2 transition-all text-left",
          canAfford
            ? "bg-neo-yellow hover:shadow-hard border-neo-black"
            : "border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{item.icon}</span>
          <span className="font-bold text-sm">{name}</span>
        </div>
        <div className="flex items-center gap-1 text-sm font-bold">
          <Coins className="w-4 h-4 text-yellow-600" />
          {item.cost}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onPurchase(item)}
      disabled={!canAfford}
      className={cn(
        "w-full p-3 rounded-neo border-2 border-neo-black text-left transition-all",
        canAfford
          ? "bg-neo-yellow hover:shadow-hard cursor-pointer"
          : "bg-gray-200 opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{item.icon}</span>
            <span className="font-bold">{name}</span>
          </div>
          <div className="text-xs text-gray-600">{description}</div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Coins className="w-4 h-4 text-yellow-600" />
          <span className="font-bold">{item.cost}</span>
        </div>
      </div>
    </button>
  );
};
