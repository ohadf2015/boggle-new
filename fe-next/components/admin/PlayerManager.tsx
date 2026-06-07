'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight, SlidersHorizontal, Gift, X,
} from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { PlayerGiftDialog } from './gift/PlayerGiftDialog';
import { PlayerCard } from './PlayerCard';
import { AccessLevelsInfo } from './AccessLevelsInfo';
import type { Player, CuratorAssignmentRow } from './playerManagerTypes';

export function PlayerManager({ authToken }: { authToken: string }) {
  const { language, t } = useLanguage();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [country, setCountry] = useState<string>('');
  const [role, setRole] = useState<'all' | 'admin' | 'teacher' | 'player'>('all');
  const [hasBlast, setHasBlast] = useState(false);
  const [daysSinceActive, setDaysSinceActive] = useState<string>('');

  const activeFilterCount =
    (country.trim() ? 1 : 0) + (role !== 'all' ? 1 : 0) + (hasBlast ? 1 : 0) + (daysSinceActive.trim() ? 1 : 0);

  // Bulk selection (for gifting many players at once)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Gift dialog state
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [giftRecipients, setGiftRecipients] = useState<Player[]>([]);

  const openGiftDialog = (recipients: Player[]) => {
    setGiftRecipients(recipients);
    setGiftDialogOpen(true);
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allOnPageSelected = players.length > 0 && players.every((p) => selectedIds.has(p.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) players.forEach((p) => next.delete(p.id));
      else players.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const selectedPlayers = players.filter((p) => selectedIds.has(p.id));

  const [blastAccessLoading, setBlastAccessLoading] = useState<string | null>(null);

  const handleToggleBlastAccess = useCallback(async (player: Player) => {
    setBlastAccessLoading(player.id);
    try {
      const newValue = !player.blast_access;
      const response = await fetch(`/api/admin/players/${player.id}/blast-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
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

  // --- Language Curator (native-speaker) assignments ---------------------
  // Loaded once for the whole admin; keyed by player id so each card shows the
  // player's current curator languages + tiers and can assign/revoke inline.
  const [curatorMap, setCuratorMap] = useState<Record<string, CuratorAssignmentRow[]>>({});
  const [curatorBusy, setCuratorBusy] = useState<string | null>(null); // `${playerId}:${lang|new}`

  const fetchCurators = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/curators', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const rows: CuratorAssignmentRow[] = data.curators ?? [];
      const map: Record<string, CuratorAssignmentRow[]> = {};
      for (const r of rows) (map[r.curator_id] ??= []).push(r);
      setCuratorMap(map);
    } catch {
      /* non-fatal: cards just show "not a curator" until reload */
    }
  }, [authToken]);

  useEffect(() => { void fetchCurators(); }, [fetchCurators]);

  const curatorPost = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/curators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('curator request failed');
  }, [authToken]);

  const handleAssignCurator = useCallback(async (player: Player, language: string, tier: number) => {
    setCuratorBusy(`${player.id}:new`);
    try {
      await curatorPost({ userId: player.id, language, trustTier: tier });
      setCuratorMap((prev) => {
        const rows = (prev[player.id] ?? []).filter((r) => r.language !== language);
        const existing = (prev[player.id] ?? []).find((r) => r.language === language);
        return {
          ...prev,
          [player.id]: [
            ...rows,
            { curator_id: player.id, language, trust_tier: tier, curator_points: existing?.curator_points ?? 0 },
          ],
        };
      });
      toast.success(t('curator.assignInline.assigned'));
    } catch {
      toast.error(t('curator.assignInline.error'));
    } finally {
      setCuratorBusy(null);
    }
  }, [curatorPost, t]);

  const handleRevokeCurator = useCallback(async (player: Player, language: string) => {
    setCuratorBusy(`${player.id}:${language}`);
    try {
      await curatorPost({ action: 'revoke', userId: player.id, language });
      setCuratorMap((prev) => ({
        ...prev,
        [player.id]: (prev[player.id] ?? []).filter((r) => r.language !== language),
      }));
      toast.success(t('curator.assignInline.revoked'));
    } catch {
      toast.error(t('curator.assignInline.error'));
    } finally {
      setCuratorBusy(null);
    }
  }, [curatorPost, t]);

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
        headers: { Authorization: `Bearer ${authToken}` },
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

  // Debounce search/filter changes
  useEffect(() => {
    const timer = setTimeout(() => { fetchPlayers(); }, 500);
    return () => clearTimeout(timer);
  }, [fetchPlayers]);

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      {/* What each access level grants (admin / teacher / curator tiers + rewards) */}
      <AccessLevelsInfo />

      {/* Toolbar: search + sort + filters toggle (always visible) */}
      <div className="flex flex-col md:flex-row gap-3 bg-white dark:bg-neo-navy-light text-black dark:text-white p-4 rounded-lg shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setOffset(0); }}
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
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>

          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="w-4 h-4 me-1" />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
        </div>
      </div>

      {/* Advanced filters — collapsed by default to keep the page uncluttered */}
      {showFilters && (
        <div data-testid="player-filter-bar" className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-neo-navy-light text-black dark:text-white p-3 rounded-lg shadow-xs">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Country (ISO)</label>
            <Input placeholder="IL, US, …" value={country} maxLength={3}
              onChange={(e) => { setCountry(e.target.value); setOffset(0); }} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Role</label>
            <Select value={role} onValueChange={(v) => { setRole(v as typeof role); setOffset(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Input placeholder="e.g. 14" type="number" min={1} value={daysSinceActive}
              onChange={(e) => { setDaysSinceActive(e.target.value); setOffset(0); }} />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={hasBlast}
                onChange={(e) => { setHasBlast(e.target.checked); setOffset(0); }} className="w-4 h-4" />
              Has Blast access
            </label>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {players.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-neo-navy-light rounded-lg shadow-xs">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none text-black dark:text-white">
            <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll}
              aria-label="Select all players" className="w-4 h-4" />
            Select all on page
          </label>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                <X className="w-4 h-4 me-1" />Clear
              </Button>
              <Button
                size="sm"
                onClick={() => openGiftDialog(selectedPlayers)}
                className="bg-neo-lime text-black hover:bg-neo-lime/90 shadow-hard-sm"
              >
                <Gift className="w-4 h-4 me-1" />
                Gift {selectedIds.size} selected
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Players List */}
      {loading && players.length === 0 ? (
        <div className="flex justify-center py-12"><Loader size="md" /></div>
      ) : players.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No players found.</div>
      ) : (
        <div className="space-y-4">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              language={language}
              selected={selectedIds.has(player.id)}
              onToggleSelect={toggleSelect}
              onGift={(p) => openGiftDialog([p])}
              onToggleBlast={handleToggleBlastAccess}
              blastLoading={blastAccessLoading === player.id}
              curatorAssignments={curatorMap[player.id] ?? []}
              onAssignCurator={handleAssignCurator}
              onRevokeCurator={handleRevokeCurator}
              curatorBusyKey={curatorBusy?.startsWith(`${player.id}:`) ? curatorBusy.slice(player.id.length + 1) : null}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-between items-center bg-white dark:bg-neo-navy-light text-black dark:text-white p-4 rounded-lg shadow-xs">
          <span className="text-sm text-slate-500">Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(Math.max(0, offset - limit))} disabled={offset === 0 || loading}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(offset + limit)} disabled={offset + limit >= total || loading}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Gift Dialog */}
      <PlayerGiftDialog
        open={giftDialogOpen}
        onOpenChange={setGiftDialogOpen}
        authToken={authToken}
        initialRecipients={giftRecipients}
        onSuccess={() => { setGiftRecipients([]); setSelectedIds(new Set()); }}
      />
    </div>
  );
}
