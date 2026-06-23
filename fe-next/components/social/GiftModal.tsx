'use client';

import React, { useState } from 'react';
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
    <div data-testid="gift-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-neo-black/60 backdrop-blur-xs">
      {/* CSS entrance (animate-in) instead of framer-motion: a starved main
          thread — e.g. while the large Hebrew bundle parses — would leave a
          framer-motion `initial` opacity:0 pinned, showing only the dark
          backdrop ("black screen"). CSS runs off the main thread and always
          settles visible. */}
      <div className="bg-neo-navy-light border-3 border-neo-black rounded-neo p-5 shadow-hard-xl w-full max-w-md mx-4 animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-white uppercase">
            {t('socialGift.title', 'Send a Gift')}
          </h2>
          <button
            data-testid="close-gift-modal"
            onClick={onClose}
            aria-label={t('common.close')}
            className="w-8 h-8 flex items-center justify-center border-2 border-neo-black rounded-neo bg-neo-pink text-white shadow-hard-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-gray-300 mb-3">
          {t('socialGift.sendTo', 'Send to')} <span className="font-bold text-white">{recipientName}</span>
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
                      ? 'bg-neo-navy-elevated hover:bg-slate-600'
                      : 'bg-neo-navy opacity-50 cursor-not-allowed'
                )}
              >
                <Icon className={cn('w-6 h-6 mb-1', isSelected ? 'text-neo-black' : 'text-white')} />
                <span className={cn('text-xs font-bold capitalize', isSelected ? 'text-neo-black' : 'text-white')}>
                  {t(`socialGift.type.${type}`, type.replace('_', ' '))}
                </span>
                <span className={cn('text-[10px] mt-0.5', isSelected ? 'text-neo-black/70' : 'text-gray-400')}>
                  {type === 'coins' ? `${GIFT_TYPES.coins.minAmount}-${GIFT_TYPES.coins.maxAmount}` : `${config.cost}`} {t('socialGift.coins', 'coins')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Coin amount slider (shown when coins selected) */}
        {selectedType === 'coins' && (
          <div className="mb-4 p-3 bg-neo-navy-elevated border-2 border-neo-black rounded-neo">
            <label className="text-xs font-bold text-white block mb-2">
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
        <div className="flex items-center justify-between mb-4 text-xs text-gray-400">
          <span>{t('socialGift.remaining', 'Daily gifts remaining')}:</span>
          <span data-testid="gifts-remaining" className="font-bold text-white">
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
              : 'bg-neo-navy-elevated text-gray-500 cursor-not-allowed'
          )}
        >
          {t('socialGift.send', 'Send Gift')}
        </button>
      </div>
    </div>
  );
};

export default GiftModal;
