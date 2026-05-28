'use client';

import React from 'react';
import { Coins, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { REWARD_PRESETS, MAX_XP_AMOUNT, MAX_COIN_AMOUNT } from './types';

interface RewardAmountInputProps {
  xpAmount: number;
  coinAmount: number;
  onXpChange: (amount: number) => void;
  onCoinChange: (amount: number) => void;
}

export function RewardAmountInput({
  xpAmount,
  coinAmount,
  onXpChange,
  onCoinChange,
}: RewardAmountInputProps) {
  const handlePresetClick = (preset: typeof REWARD_PRESETS[number]) => {
    if (preset.label !== 'Custom') {
      onXpChange(preset.xp);
      onCoinChange(preset.coins);
    }
  };

  const handleXpChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      onXpChange(0);
    } else if (num > MAX_XP_AMOUNT) {
      onXpChange(MAX_XP_AMOUNT);
    } else {
      onXpChange(num);
    }
  };

  const handleCoinChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      onCoinChange(0);
    } else if (num > MAX_COIN_AMOUNT) {
      onCoinChange(MAX_COIN_AMOUNT);
    } else {
      onCoinChange(num);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {REWARD_PRESETS.map((preset) => {
          const isActive = preset.label !== 'Custom' &&
            xpAmount === preset.xp &&
            coinAmount === preset.coins;

          return (
            <Button
              key={preset.label}
              type="button"
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetClick(preset)}
              className={cn(
                'transition-all',
                isActive && 'bg-neo-lime text-black border-neo-black'
              )}
            >
              {preset.label}
              {preset.label !== 'Custom' && (
                <span className="ms-1 text-xs opacity-70">
                  ({preset.xp} XP, {preset.coins} coins)
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Amount Inputs */}
      <div className="grid grid-cols-2 gap-4">
        {/* XP Input */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-purple-500" />
            XP Amount
          </label>
          <Input
            type="number"
            min={0}
            max={MAX_XP_AMOUNT}
            value={xpAmount}
            onChange={(e) => handleXpChange(e.target.value)}
            className="bg-white dark:bg-neo-navy-light"
          />
          <p className="text-xs text-slate-500">Max: {MAX_XP_AMOUNT.toLocaleString()}</p>
        </div>

        {/* Coin Input */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Coins className="w-4 h-4 text-amber-500" />
            Coin Amount
          </label>
          <Input
            type="number"
            min={0}
            max={MAX_COIN_AMOUNT}
            value={coinAmount}
            onChange={(e) => handleCoinChange(e.target.value)}
            className="bg-white dark:bg-neo-navy-light"
          />
          <p className="text-xs text-slate-500">Max: {MAX_COIN_AMOUNT.toLocaleString()}</p>
        </div>
      </div>

      {/* Preview */}
      {(xpAmount > 0 || coinAmount > 0) && (
        <div className="p-3 bg-slate-100 dark:bg-neo-navy rounded-lg">
          <p className="text-sm font-medium mb-2">Reward Preview:</p>
          <div className="flex gap-4">
            {xpAmount > 0 && (
              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-4 h-4" />
                <span className="font-bold">{xpAmount.toLocaleString()}</span>
                <span className="text-xs">XP</span>
              </div>
            )}
            {coinAmount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Coins className="w-4 h-4" />
                <span className="font-bold">{coinAmount.toLocaleString()}</span>
                <span className="text-xs">Coins</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
