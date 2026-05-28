'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, ChevronLeft, ChevronRight, Smartphone, Monitor,
  CheckCircle2, XCircle, Globe, Clock, Trophy, Gamepad2, Target,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface GuestPlayerSummary {
  session_id: string;
  device_type: string | null;
  browser: string | null;
  country: string | null;
  language: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  first_visit_at: string;
  last_visit_at: string;
  last_activity_at: string;
  converted: boolean;
  converted_user_id: string | null;
  converted_at: string | null;
  total_games: number;
  multiplayer_games: number;
  word_hunt_games: number;
  daily_challenge_games: number;
  total_score: number;
  total_words: number;
  total_time_played: number;
  longest_word: string | null;
  languages: string[];
}

interface GuestsResponse {
  success: boolean;
  guests: GuestPlayerSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: {
    totalGuests: number;
    convertedGuests: number;
    guestsWhoPlayed: number;
    totalGames: number;
    totalScore: number;
    conversionRate: number;
  };
}

const COUNTRY_FLAG_OFFSET = 0x1f1a5;
function countryToFlag(code?: string | null): string {
  if (!code || code.length !== 2) return '';
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    upper.charCodeAt(0) + COUNTRY_FLAG_OFFSET,
    upper.charCodeAt(1) + COUNTRY_FLAG_OFFSET,
  );
}

function formatRelative(dateString: string): string {
  const d = new Date(dateString).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

export function GuestManager({ authToken }: { authToken: string }) {
  const { t, language } = useLanguage();
  const [data, setData] = useState<GuestsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [country, setCountry] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [converted, setConverted] = useState<'all' | 'yes' | 'no'>('all');
  const [minGames, setMinGames] = useState('0');
  const [sortBy, setSortBy] = useState<'last_activity_at' | 'first_visit_at' | 'total_games' | 'total_score'>('last_activity_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const fetchGuests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (country.trim()) params.set('country', country.trim().toUpperCase());
      if (utmSource.trim()) params.set('utmSource', utmSource.trim());
      if (converted !== 'all') params.set('converted', converted);
      if (minGames.trim() && Number(minGames) > 0) params.set('minGames', minGames.trim());

      const response = await fetch(`/api/admin/guests?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error('Failed to fetch guests');
      const json: GuestsResponse = await response.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching guests:', err);
      toast.error('Failed to load guest players');
    } finally {
      setLoading(false);
    }
  }, [authToken, page, sortBy, sortOrder, searchQuery, country, utmSource, converted, minGames]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGuests();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchGuests]);

  // Reset to page 1 when filters change
  const resetPageEffect = useMemo(
    () => `${searchQuery}|${country}|${utmSource}|${converted}|${minGames}|${sortBy}|${sortOrder}`,
    [searchQuery, country, utmSource, converted, minGames, sortBy, sortOrder],
  );
  useEffect(() => {
    setPage(1);
  }, [resetPageEffect]);

  const guests = data?.guests || [];
  const stats = data?.stats;
  const total = data?.pagination?.totalCount || 0;

  return (
    <div className="space-y-6">
      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-400 uppercase">Guests</div>
              <div className="text-2xl font-bold">{stats.totalGuests.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-400 uppercase">Played</div>
              <div className="text-2xl font-bold text-blue-500">{stats.guestsWhoPlayed.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-400 uppercase">Games</div>
              <div className="text-2xl font-bold">{stats.totalGames.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-400 uppercase">Converted</div>
              <div className="text-2xl font-bold text-neo-lime">
                {stats.convertedGuests.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-400 uppercase">Conv. Rate</div>
              <div className="text-2xl font-bold text-amber-500">
                {(stats.conversionRate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-white dark:bg-neo-navy-light text-black dark:text-white p-3 rounded-lg shadow-xs">
        <div className="col-span-2 md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search session ID, country, source…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input
          placeholder="Country (IL, US)"
          value={country}
          maxLength={3}
          onChange={(e) => setCountry(e.target.value)}
        />
        <Input
          placeholder="UTM source"
          value={utmSource}
          onChange={(e) => setUtmSource(e.target.value)}
        />
        <Select value={converted} onValueChange={(v) => setConverted(v as typeof converted)}>
          <SelectTrigger>
            <SelectValue placeholder="Conversion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Converted only</SelectItem>
            <SelectItem value="no">Not converted</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          min={0}
          placeholder="Min games"
          value={minGames}
          onChange={(e) => setMinGames(e.target.value)}
        />
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Sort:</span>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_activity_at">Last activity</SelectItem>
            <SelectItem value="first_visit_at">First visit</SelectItem>
            <SelectItem value="total_games">Games played</SelectItem>
            <SelectItem value="total_score">Total score</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))}
          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </Button>
        <span className="ms-auto text-sm text-slate-500">{total.toLocaleString()} guests</span>
      </div>

      {/* List */}
      {loading && guests.length === 0 ? (
        <div className="flex justify-center py-12"><Loader size="md" /></div>
      ) : guests.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No guest players found.</div>
      ) : (
        <div className="space-y-3">
          {guests.map((g) => {
            const flag = countryToFlag(g.country);
            const isMobile = (g.device_type || '').toLowerCase().match(/mobile|phone|android|ios/);
            const sessionShort = g.session_id.slice(0, 8);
            return (
              <Card key={g.session_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    {/* Left: identity + acquisition */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/${language}/admin/guests/${g.session_id}`}
                          className="font-mono text-base font-bold hover:text-neo-cyan transition-colors"
                        >
                          {sessionShort}
                        </Link>
                        {g.converted ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-neo-lime/20 text-neo-lime px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            Converted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-600/30 text-slate-400 px-2 py-0.5 rounded">
                            <XCircle className="w-3 h-3" />
                            Guest
                          </span>
                        )}
                        {flag && (
                          <span className="text-sm" title={g.country ?? undefined}>
                            {flag} {g.country}
                          </span>
                        )}
                        {g.device_type && (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-slate-500"
                            title={`${g.device_type}${g.browser ? ` · ${g.browser}` : ''}`}
                          >
                            {isMobile ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                            {g.device_type}
                            {g.browser && <span className="text-slate-600">· {g.browser}</span>}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          First visit {formatRelative(g.first_visit_at)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last seen {formatRelative(g.last_activity_at)}
                        </span>
                        {(g.utm_source || g.referrer) && (
                          <span className="inline-flex items-center gap-1 max-w-[300px] truncate">
                            <Globe className="w-3 h-3" />
                            {g.utm_source ? (
                              <span title={`utm_source=${g.utm_source}${g.utm_medium ? `, utm_medium=${g.utm_medium}` : ''}${g.utm_campaign ? `, utm_campaign=${g.utm_campaign}` : ''}`}>
                                {g.utm_source}
                                {g.utm_medium ? ` / ${g.utm_medium}` : ''}
                              </span>
                            ) : (
                              <span title={g.referrer ?? undefined}>{g.referrer}</span>
                            )}
                          </span>
                        )}
                        {g.languages.length > 0 && (
                          <span className="text-xs">{g.languages.join(', ')}</span>
                        )}
                      </div>
                    </div>

                    {/* Right: stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 w-full lg:w-auto">
                      <Stat label="Games" value={g.total_games} icon={<Gamepad2 className="w-3 h-3" />} />
                      <Stat label="Score" value={g.total_score} highlight="text-blue-500" icon={<Trophy className="w-3 h-3" />} />
                      <Stat label="Words" value={g.total_words} />
                      <Stat label="Time" value={formatDuration(g.total_time_played)} icon={<Clock className="w-3 h-3" />} />
                      {g.multiplayer_games > 0 && (
                        <Stat label="MP" value={g.multiplayer_games} icon={<Gamepad2 className="w-3 h-3" />} />
                      )}
                      {g.word_hunt_games > 0 && (
                        <Stat label="Hunt" value={g.word_hunt_games} icon={<Target className="w-3 h-3" />} />
                      )}
                      {g.daily_challenge_games > 0 && (
                        <Stat label="Daily" value={g.daily_challenge_games} />
                      )}
                      {g.longest_word && (
                        <Stat label="Longest" value={g.longest_word} highlight="text-amber-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-between items-center bg-white dark:bg-neo-navy-light text-black dark:text-white p-4 rounded-lg shadow-xs">
          <span className="text-sm text-slate-500">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data?.pagination.hasNextPage || loading}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string | number;
  highlight?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center sm:items-end">
      <span className="text-xs text-slate-400 uppercase inline-flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className={cn('font-mono font-bold text-sm', highlight)}>{value}</span>
    </div>
  );
}
