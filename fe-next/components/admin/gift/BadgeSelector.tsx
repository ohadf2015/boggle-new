'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Award, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader';
import type { BadgeOption } from './types';

interface BadgeSelectorProps {
  authToken: string;
  selectedBadgeId: string | null;
  onSelect: (badgeId: string | null, badge?: BadgeOption) => void;
}

const rarityColors: Record<string, string> = {
  common: 'border-gray-400 bg-gray-50 dark:bg-neo-navy-light',
  uncommon: 'border-green-500 bg-green-50 dark:bg-green-900/30',
  rare: 'border-blue-500 bg-blue-50 dark:bg-blue-900/30',
  epic: 'border-purple-500 bg-purple-50 dark:bg-purple-900/30',
  legendary: 'border-yellow-500 bg-linear-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30',
};

const rarityTextColors: Record<string, string> = {
  common: 'text-gray-600 dark:text-gray-400',
  uncommon: 'text-green-600 dark:text-green-400',
  rare: 'text-blue-600 dark:text-blue-400',
  epic: 'text-purple-600 dark:text-purple-400',
  legendary: 'text-yellow-600 dark:text-yellow-400',
};

export function BadgeSelector({ authToken, selectedBadgeId, onSelect }: BadgeSelectorProps) {
  const [badges, setBadges] = useState<BadgeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/admin/gift/badges', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch badges');
        }

        const data = await response.json();
        setBadges(data.badges || []);
      } catch (err) {
        console.error('Error fetching badges:', err);
        setError(err instanceof Error ? err.message : 'Failed to load badges');
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [authToken]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  // Group badges by rarity
  const badgesByRarity = badges.reduce((acc, badge) => {
    const rarity = badge.rarity || 'common';
    if (!acc[rarity]) acc[rarity] = [];
    acc[rarity].push(badge);
    return acc;
  }, {} as Record<string, BadgeOption[]>);

  const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

  return (
    <div className="space-y-4">
      {/* No Badge Option */}
      <button
        type="button"
        onClick={() => onSelect(null, undefined)}
        className={cn(
          'w-full p-3 rounded-lg border-2 flex items-center gap-3 transition-all',
          selectedBadgeId === null
            ? 'border-neo-lime bg-neo-lime/10 shadow-md'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        )}
      >
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-neo-navy-light flex items-center justify-center">
          <span className="text-xl">❌</span>
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium">No Badge</p>
          <p className="text-xs text-gray-500">Do not attach a badge to this gift</p>
        </div>
        {selectedBadgeId === null && (
          <Check className="w-5 h-5 text-neo-lime" />
        )}
      </button>

      {/* Badges by Rarity */}
      {rarityOrder.map(rarity => {
        const rarityBadges = badgesByRarity[rarity];
        if (!rarityBadges || rarityBadges.length === 0) return null;

        return (
          <div key={rarity} className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className={cn('w-4 h-4', rarityTextColors[rarity])} />
              <span className={cn('text-sm font-semibold capitalize', rarityTextColors[rarity])}>
                {rarity}
              </span>
              <span className="text-xs text-gray-400">({rarityBadges.length})</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {rarityBadges.map(badge => (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => onSelect(badge.id, badge)}
                  className={cn(
                    'p-3 rounded-lg border-2 flex items-center gap-3 transition-all text-left',
                    rarityColors[rarity],
                    selectedBadgeId === badge.id
                      ? 'ring-2 ring-neo-lime ring-offset-2 shadow-md'
                      : 'hover:shadow-xs'
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-white/50 dark:bg-black/20 flex items-center justify-center border border-black/10 overflow-hidden">
                    {badge.image_url ? (
                      <Image
                        src={badge.image_url}
                        alt={badge.name_key.split('.').pop()?.replace(/_/g, ' ') || 'Badge'}
                        width={36}
                        height={36}
                        className="object-contain"
                      />
                    ) : (
                      <span className="text-2xl">{badge.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{badge.name_key.split('.').pop()?.replace(/_/g, ' ')}</p>
                    <p className={cn('text-xs capitalize', rarityTextColors[rarity])}>{rarity}</p>
                  </div>
                  {selectedBadgeId === badge.id && (
                    <Check className="w-5 h-5 text-neo-lime shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {badges.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No badges available</p>
          <p className="text-xs mt-1">Add badges in the collectibles system first</p>
        </div>
      )}
    </div>
  );
}
