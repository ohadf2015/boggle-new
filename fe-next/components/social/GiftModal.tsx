'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, Shield, Coins } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { GIFT_TYPES, DAILY_GIFT_LIMIT, type GiftType, type GiftPayload } from '@/shared/utils/giftingRules';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (gift: GiftPayload) => void;
  recipientName: string;
  senderBalance: number;
  giftsRemaining: number;
}

const GIFT_ICONS: Record<GiftType, React.ElementType> = {
  hints: Lightbulb,
  streak_freeze: Shield,
  coins: Coins,
};

const GiftModal: React.FC<GiftModalProps> = ({
  isOpen,
  onClose,
  onSend,
  recipientName,
  senderBalance,
  giftsRemaining,
}) => {
  const { t } = useLanguage();
  const [selectedType, setSelectedType] = useState<GiftType | null>(null);
  const [coinAmount, setCoinAmount] = useState(10);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!selectedType) return;
    const gift: GiftPayload = { type: selectedType };
    if (selectedType === 'coins') {
      gift.amount = coinAmount;
    }
    onSend(gift);
  };

  const giftTypes: GiftType[] = ['hints', 'streak_freeze', 'coins'];

  return (
    <div data-testid="gift-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-neo-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-neo-cream border-3 border-neo-black rounded-neo p-5 shadow-hard-xl w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-neo-black uppercase">
            {t('socialGift.title', 'Send a Gift')}
          </h2>
          <button
            data-testid="close-gift-modal"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-neo-black rounded-neo bg-neo-red text-neo-white shadow-hard-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-neo-black/70 mb-3">
          {t('socialGift.sendTo', 'Send to')} <span className="font-bold">{recipientName}</span>
        </p>

        {/* Gift type cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {giftTypes.map((type) => {
            const Icon = GIFT_ICONS[type];
            const config = GIFT_TYPES[type];
            const isSelected = selectedType === type;
            const cost = type === 'coins' ? coinAmount : config.cost;
            const canAfford = senderBalance >= cost;

            return (
              <button
                key={type}
                data-testid={`gift-card-${type}`}
                onClick={() => setSelectedType(type)}
                disabled={!canAfford}
                className={cn(
                  'flex flex-col items-center p-3 border-3 border-neo-black rounded-neo shadow-hard-sm transition-all',
                  isSelected
                    ? 'bg-neo-lime scale-105'
                    : canAfford
                      ? 'bg-white hover:bg-neo-yellow/20'
                      : 'bg-neo-black/10 opacity-50 cursor-not-allowed'
                )}
              >
                <Icon className="w-6 h-6 mb-1 text-neo-black" />
                <span className="text-xs font-bold text-neo-black capitalize">
                  {t(`socialGift.type.${type}`, type.replace('_', ' '))}
                </span>
                <span className="text-[10px] text-neo-black/60 mt-0.5">
                  {type === 'coins' ? `${GIFT_TYPES.coins.minAmount}-${GIFT_TYPES.coins.maxAmount}` : `${config.cost}`} {t('socialGift.coins', 'coins')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Coin amount slider (shown when coins selected) */}
        {selectedType === 'coins' && (
          <div className="mb-4 p-3 bg-white border-2 border-neo-black rounded-neo">
            <label className="text-xs font-bold text-neo-black block mb-2">
              {t('socialGift.amount', 'Amount')}: {coinAmount} {t('socialGift.coins', 'coins')}
            </label>
            <input
              type="range"
              min={GIFT_TYPES.coins.minAmount}
              max={Math.min(GIFT_TYPES.coins.maxAmount!, senderBalance)}
              value={coinAmount}
              onChange={(e) => setCoinAmount(Number(e.target.value))}
              className="w-full"
              data-testid="coin-slider"
            />
          </div>
        )}

        {/* Remaining gifts */}
        <div className="flex items-center justify-between mb-4 text-xs text-neo-black/60">
          <span>{t('socialGift.remaining', 'Daily gifts remaining')}:</span>
          <span data-testid="gifts-remaining" className="font-bold text-neo-black">
            {giftsRemaining}/{DAILY_GIFT_LIMIT}
          </span>
        </div>

        {/* Send button */}
        <button
          data-testid="send-gift-button"
          onClick={handleSend}
          disabled={!selectedType || giftsRemaining <= 0}
          className={cn(
            'w-full py-3 border-3 border-neo-black rounded-neo font-black text-lg uppercase shadow-hard transition-all',
            selectedType && giftsRemaining > 0
              ? 'bg-neo-lime text-neo-black hover:shadow-hard-lg active:shadow-hard-pressed active:translate-y-0.5'
              : 'bg-neo-black/20 text-neo-black/40 cursor-not-allowed'
          )}
        >
          {t('socialGift.send', 'Send Gift')}
        </button>
      </motion.div>
    </div>
  );
};

export default GiftModal;
