'use client';

/**
 * WordPactCard - Landing page card showing Word Pact status.
 * Active pact: shows partner, checkmarks, multiplier, streak.
 * No pact: shows CTA to form one.
 * Neo-brutalist: border-neo-pink, shadow-hard, handshake icon.
 */

import React, { memo, useState } from 'react';
import { Handshake, Check, X, Flame, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWordPact } from '@/hooks/useWordPact';
import { cn } from '@/lib/utils';
import { PactFriendSelector } from './PactFriendSelector';

function MultiplierBadge({ multiplier }: { multiplier: number }) {
  if (multiplier <= 1) return null;

  return (
    <span
      data-testid="pact-multiplier"
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-neo text-sm font-bold',
        multiplier >= 2 ? 'bg-neo-orange text-neo-navy' : 'bg-neo-yellow text-neo-navy'
      )}
    >
      {multiplier}x
    </span>
  );
}

function PlayerStatus({
  label,
  played,
}: {
  label: string;
  played: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {played ? (
        <Check className="w-5 h-5 text-green-400" data-testid="check-icon" />
      ) : (
        <X className="w-5 h-5 text-red-400" data-testid="x-icon" />
      )}
      <span className="text-sm text-neo-white">{label}</span>
    </div>
  );
}

export const WordPactCard: React.FC = memo(function WordPactCard() {
  const { t } = useLanguage();
  const {
    pact,
    partnerName,
    bothPlayed,
    youPlayed,
    partnerPlayed,
    multiplier,
    streak,
    loading,
    dissolvePact,
  } = useWordPact();
  const [showSelector, setShowSelector] = useState(false);

  if (loading) return null;

  // No active pact — show CTA
  if (!pact) {
    return (
      <>
        <div
          data-testid="word-pact-card"
          className={cn(
            'border-neo border-neo-pink rounded-neo p-4',
            'bg-neo-navy-dark/90 shadow-hard-sm',
            'flex flex-col gap-3'
          )}
        >
          <div className="flex items-center gap-2">
            <Handshake className="w-6 h-6 text-neo-pink" />
            <h3 className="font-neo-display text-lg text-neo-white">
              {t('wordPact.title')}
            </h3>
          </div>
          <p className="text-sm text-neo-white">{t('wordPact.formDesc')}</p>
          <button
            data-testid="form-pact-btn"
            onClick={() => setShowSelector(true)}
            className={cn(
              'w-full py-2 rounded-neo font-bold',
              'bg-neo-pink text-neo-white border-neo shadow-hard-sm',
              'hover:shadow-hard-pressed active:translate-y-0.5'
            )}
          >
            {t('wordPact.formPact')}
          </button>
        </div>
        {showSelector && (
          <PactFriendSelector onClose={() => setShowSelector(false)} />
        )}
      </>
    );
  }

  // Active pact
  const statusMessage = bothPlayed
    ? t('wordPact.bothPlayed')
    : youPlayed
      ? t('wordPact.youPlayed', { name: partnerName })
      : partnerPlayed
        ? t('wordPact.partnerPlayed', { name: partnerName })
        : t('wordPact.neitherPlayed');

  return (
    <div
      data-testid="word-pact-card"
      className={cn(
        'border-neo border-neo-pink rounded-neo p-4',
        'bg-neo-navy-dark/90 shadow-hard-sm',
        'flex flex-col gap-3'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Handshake className="w-6 h-6 text-neo-pink" />
          <h3 className="font-neo-display text-lg text-neo-white">
            {t('wordPact.withFriend', { name: partnerName })}
          </h3>
        </div>
        <MultiplierBadge multiplier={multiplier} />
      </div>

      {/* Play status */}
      <div className="flex flex-col gap-1">
        <PlayerStatus label={t('wordPact.you')} played={youPlayed} />
        <PlayerStatus label={partnerName} played={partnerPlayed} />
      </div>

      {/* Status message */}
      <p data-testid="pact-status" className="text-sm text-neo-white font-medium">
        {statusMessage}
      </p>

      {/* Streak */}
      {streak > 0 && (
        <div data-testid="pact-streak" className="flex items-center gap-1 text-neo-orange text-sm font-bold">
          <Flame className="w-4 h-4" />
          {t('wordPact.streak', { count: String(streak) })}
        </div>
      )}

      {/* Dissolve */}
      <button
        data-testid="dissolve-pact-btn"
        onClick={dissolvePact}
        className="flex items-center gap-1 text-xs text-neo-white hover:text-red-400 self-end mt-1"
      >
        <Trash2 className="w-3 h-3" />
        {t('wordPact.dissolve')}
      </button>
    </div>
  );
});
