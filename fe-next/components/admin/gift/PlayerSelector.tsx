'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, X, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import type { GiftRecipient } from './types';

interface PlayerSelectorProps {
  authToken: string;
  selectedPlayers: GiftRecipient[];
  onSelectionChange: (players: GiftRecipient[]) => void;
  maxSelection?: number;
  initialRecipient?: GiftRecipient;
  initialRecipients?: GiftRecipient[];
}

export function PlayerSelector({
  authToken,
  selectedPlayers,
  onSelectionChange,
  maxSelection = 50,
  initialRecipient,
  initialRecipients,
}: PlayerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GiftRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const fetchPlayers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: query,
        limit: '10',
        sortBy: 'total_score',
        sortOrder: 'desc',
      });

      const response = await fetch(`/api/admin/players?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error('Failed to fetch players');

      const data = await response.json();
      setSearchResults(data.players || []);
    } catch (error) {
      console.error('Error fetching players:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  // Seed the selection when the dialog opens with pre-chosen recipients. Supports
  // a single recipient (card Gift button) or many (bulk gift from the list).
  const seed = initialRecipients && initialRecipients.length > 0
    ? initialRecipients
    : initialRecipient
      ? [initialRecipient]
      : [];
  const seedKey = seed.map((p) => p.id).join(',');
  useEffect(() => {
    if (seed.length > 0 && selectedPlayers.length === 0) {
      onSelectionChange(seed.slice(0, maxSelection));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlayers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchPlayers]);

  const handleSelectPlayer = (player: GiftRecipient) => {
    if (selectedPlayers.some(p => p.id === player.id)) return;
    if (selectedPlayers.length >= maxSelection) return;

    onSelectionChange([...selectedPlayers, player]);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleRemovePlayer = (playerId: string) => {
    onSelectionChange(selectedPlayers.filter(p => p.id !== playerId));
  };

  return (
    <div className="space-y-3">
      {/* Selected Players */}
      {selectedPlayers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedPlayers.map((player) => (
            <Badge
              key={player.id}
              variant="secondary"
              className="flex items-center gap-2 py-1.5 px-3 bg-neo-lime/20 border border-neo-lime/40"
            >
              <Avatar customAvatar={player.avatar_config} userId={player.id} size="sm" />
              <span className="font-medium">
                {player.display_name || player.username}
              </span>
              <button
                type="button"
                onClick={() => handleRemovePlayer(player.id)}
                className="ms-1 hover:text-red-500 transition-colors"
                aria-label={`Remove ${player.display_name || player.username}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search players by username..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="ps-10 bg-white dark:bg-neo-navy-light"
          disabled={selectedPlayers.length >= maxSelection}
        />

        {/* Search Results Dropdown */}
        {showResults && searchQuery.length >= 2 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neo-navy-light border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader size="sm" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                No players found
              </div>
            ) : (
              searchResults.map((player) => {
                const isSelected = selectedPlayers.some(p => p.id === player.id);
                return (
                  <button
                    type="button"
                    key={player.id}
                    onClick={() => handleSelectPlayer(player)}
                    disabled={isSelected}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-neo-navy-elevated transition-colors text-left',
                      isSelected && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Avatar customAvatar={player.avatar_config} userId={player.id} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {player.display_name || player.username}
                      </div>
                      {player.display_name && (
                        <div className="text-xs text-slate-500">@{player.username}</div>
                      )}
                    </div>
                    {player.total_score !== undefined && (
                      <div className="text-xs text-slate-500">
                        {(player.total_score / 1000).toFixed(1)}k pts
                      </div>
                    )}
                    {isSelected && (
                      <Badge variant="secondary" className="text-xs">Selected</Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selection count */}
      <div className="text-xs text-slate-500">
        {selectedPlayers.length}/{maxSelection} players selected
      </div>
    </div>
  );
}
