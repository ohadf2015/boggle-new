'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Calendar,
  ChevronLeft, ChevronRight, Gift, Bomb, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { postHogPersonUrl } from '@/lib/admin/postHogLinks';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { PlayerGiftDialog } from './gift/PlayerGiftDialog';
import Avatar from '@/components/Avatar';

interface Player {
  id: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_config?: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
  total_games: number;
  total_score: number;
  ranked_mmr: number;
  casual_games: number;
  ranked_games: number;
  last_game_at: string;
  created_at: string;
  blast_access?: boolean;
}

export function PlayerManager({ authToken }: { authToken: string }) {
  const { t, language } = useLanguage();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [country, setCountry] = useState<string>('');
  const [role, setRole] = useState<'all' | 'admin' | 'teacher' | 'player'>('all');
  const [hasBlast, setHasBlast] = useState(false);
  const [daysSinceActive, setDaysSinceActive] = useState<string>('');

  // Gift dialog state
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [selectedPlayerForGift, setSelectedPlayerForGift] = useState<Player | undefined>(undefined);

  const handleOpenGiftDialog = (player?: Player) => {
    setSelectedPlayerForGift(player);
    setGiftDialogOpen(true);
  };

  const [blastAccessLoading, setBlastAccessLoading] = useState<string | null>(null);

  const handleToggleBlastAccess = useCallback(async (player: Player) => {
    setBlastAccessLoading(player.id);
    try {
      const newValue = !player.blast_access;
      const response = await fetch(`/api/admin/players/${player.id}/blast-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ enabled: newValue }),
      });
      if (!response.ok) throw new Error('Failed');
      toast.success(`Blast access ${newValue ? 'granted' : 'revoked'} for ${player.display_name || player.username}`);
      setPlayers((prev) => prev.map((p) => p.id === player.id ? { ...p, blast_access: newValue } : p));
    } catch {
      toast.error('Failed to update blast access');
    } finally {
      setBlastAccessLoading(null);
    }
  }, [authToken]);

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      if (country.trim()) params.append('country', country.trim().toUpperCase());
      if (role !== 'all') params.append('role', role);
      if (hasBlast) params.append('hasBlast', 'true');
      if (daysSinceActive.trim() && Number.isFinite(Number(daysSinceActive))) {
        params.append('daysSinceActive', daysSinceActive.trim());
      }

      const response = await fetch(`/api/admin/players?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!response.ok) throw new Error('Failed to fetch players');

      const data = await response.json();
      setPlayers(data.players);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to load players');
    } finally {
      setLoading(false);
    }
  }, [authToken, searchQuery, sortBy, sortOrder, limit, offset, country, role, hasBlast, daysSinceActive]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlayers();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchPlayers]);

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-neo-navy-light text-black dark:text-white p-4 rounded-lg shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search by username..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOffset(0); // Reset to first page
            }}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           <Select value={sortBy} onValueChange={(val) => { setSortBy(val); setOffset(0); }}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Joined Date</SelectItem>
              <SelectItem value="last_game_at">Last Active</SelectItem>
              <SelectItem value="total_games">Games Played</SelectItem>
              <SelectItem value="total_score">Total Score</SelectItem>
              <SelectItem value="ranked_mmr">MMR</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? "Ascending" : "Descending"}
          >
            {sortOrder === 'asc' ? "↑" : "↓"}
          </Button>
        </div>
      </div>

      {/* Advanced filters */}
      <div data-testid="player-filter-bar" className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-neo-navy-light text-black dark:text-white p-3 rounded-lg shadow-xs">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Country (ISO)</label>
          <Input
            placeholder="IL, US, …"
            value={country}
            maxLength={3}
            onChange={(e) => { setCountry(e.target.value); setOffset(0); }}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Role</label>
          <Select value={role} onValueChange={(v) => { setRole(v as typeof role); setOffset(0); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="player">Player</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Inactive ≥ N days</label>
          <Input
            placeholder="e.g. 14"
            type="number"
            min={1}
            value={daysSinceActive}
            onChange={(e) => { setDaysSinceActive(e.target.value); setOffset(0); }}
          />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasBlast}
              onChange={(e) => { setHasBlast(e.target.checked); setOffset(0); }}
              className="w-4 h-4"
            />
            Has Blast access
          </label>
        </div>
      </div>

      {/* Players List */}
      {loading && players.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader size="md" />
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No players found.
        </div>
      ) : (
        <div className="space-y-4">
          {players.map((player) => (
            <Card key={player.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  {/* Player Info */}
                  <div className="flex items-center gap-3">
                    <Avatar customAvatar={player.avatar_config} userId={player.id} size="lg" />
                    <div>
                      <Link
                        href={`/${language}/admin/players/${player.id}`}
                        className="font-bold text-lg flex items-center gap-2 hover:text-neo-cyan transition-colors"
                      >
                        {player.display_name || player.username}
                        {player.display_name && player.username && (
                          <span className="text-xs font-normal text-slate-500">@{player.username}</span>
                        )}
                      </Link>
                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Joined {new Date(player.created_at).toLocaleDateString()}
                        </span>
                        {player.last_game_at && (
                           <span className="flex items-center gap-1">
                             Last game {new Date(player.last_game_at).toLocaleDateString()}
                           </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="flex flex-col items-center sm:items-end">
                      <span className="text-xs text-slate-400 uppercase">Games</span>
                      <span className="font-mono font-bold">{player.total_games}</span>
                    </div>
                    <div className="flex flex-col items-center sm:items-end">
                      <span className="text-xs text-slate-400 uppercase">Score</span>
                      <span className="font-mono font-bold text-blue-500">
                        {(player.total_score / 1000).toFixed(1)}k
                      </span>
                    </div>
                    <div className="flex flex-col items-center sm:items-end">
                      <span className="text-xs text-slate-400 uppercase">MMR</span>
                      <span className="font-mono font-bold text-amber-500">{player.ranked_mmr}</span>
                    </div>
                    <div className="flex flex-col items-center sm:items-end gap-1">
                      {(() => {
                        const phUrl = postHogPersonUrl(player.id);
                        if (!phUrl) return null;
                        return (
                          <a
                            href={phUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            title="Open in PostHog"
                            className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            PostHog
                          </a>
                        );
                      })()}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenGiftDialog(player)}
                        className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      >
                        <Gift className="w-4 h-4 me-1" />
                        Gift
                      </Button>
                      <Button
                        variant={player.blast_access ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleBlastAccess(player)}
                        disabled={blastAccessLoading === player.id}
                        className={player.blast_access
                          ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500'
                          : 'text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                        }
                        title={player.blast_access ? 'Revoke blast access' : 'Grant blast access'}
                      >
                        <Bomb className="w-4 h-4 me-1" />
                        {player.blast_access ? 'Blast ✓' : 'Blast'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-between items-center bg-white dark:bg-neo-navy-light text-black dark:text-white p-4 rounded-lg shadow-xs">
          <span className="text-sm text-slate-500">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(0, offset - limit))}
              disabled={offset === 0 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(offset + limit)}
              disabled={offset + limit >= total || loading}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Gift Dialog */}
      <PlayerGiftDialog
        open={giftDialogOpen}
        onOpenChange={setGiftDialogOpen}
        authToken={authToken}
        initialRecipient={selectedPlayerForGift}
        onSuccess={() => setSelectedPlayerForGift(undefined)}
      />
    </div>
  );
}
