'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, User, Calendar, Trophy, Gamepad2, 
  MoreVertical, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
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

interface Player {
  id: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  total_games: number;
  total_score: number;
  ranked_mmr: number;
  casual_games: number;
  ranked_games: number;
  last_game_at: string;
  created_at: string;
}

export function PlayerManager({ authToken }: { authToken: string }) {
  const { t } = useLanguage();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

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
  }, [authToken, searchQuery, sortBy, sortOrder, limit, offset]);

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
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
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
        
        <div className="flex gap-2">
           <Select value={sortBy} onValueChange={(val) => { setSortBy(val); setOffset(0); }}>
            <SelectTrigger className="w-[160px]">
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

      {/* Players List */}
      {loading && players.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
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
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-slate-100 dark:bg-slate-800"
                      style={{ backgroundColor: player.avatar_color }}
                    >
                      {player.avatar_emoji || '👤'}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        {player.display_name || player.username}
                        {player.display_name && player.username && (
                          <span className="text-xs font-normal text-slate-500">@{player.username}</span>
                        )}
                      </h3>
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
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
    </div>
  );
}
