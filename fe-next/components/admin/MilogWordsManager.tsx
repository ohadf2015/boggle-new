'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Check, X, ChevronLeft, ChevronRight, Filter, ExternalLink, BookCheck, Clock, Ban, Trash2, AlertTriangle
} from 'lucide-react';
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
import { m, AnimatePresence } from 'framer-motion';

interface MilogWord {
  id: string;
  word: string;
  milog_status: 'verified' | 'not_found' | 'error' | 'pending' | 'rejected_type' | null;
  milog_verified_at: string | null;
  milog_url: string | null;
  milog_attempts: number;
  submission_count: number;
  approved_at: string | null;
  milog_word_type: string | null;
  milog_rejected_reason: string | null;
}

interface Stats {
  total: number;
  verified: number;
  notFound: number;
  promoted: number;
  pending: number;
  rejectedType: number;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

interface MilogWordsManagerProps {
  authToken: string;
}

const STATUS_LABELS: Record<string, string> = {
  verified: 'Verified',
  not_found: 'Not Found',
  error: 'Error',
  pending: 'Pending',
  rejected_type: 'Wrong Type',
};

const STATUS_COLORS: Record<string, string> = {
  verified: 'bg-green-500',
  not_found: 'bg-red-500',
  error: 'bg-orange-500',
  pending: 'bg-slate-500',
  rejected_type: 'bg-purple-500',
};

const WORD_TYPE_COLORS: Record<string, string> = {
  noun: 'bg-blue-600',
  verb: 'bg-emerald-600',
  adjective: 'bg-amber-600',
  adverb: 'bg-teal-600',
  abbreviation: 'bg-red-600',
  proper_name: 'bg-red-600',
};

export function MilogWordsManager({ authToken }: MilogWordsManagerProps) {
  const [words, setWords] = useState<MilogWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Revoke dialog
  const [revokeWord, setRevokeWord] = useState<MilogWord | null>(null);
  const [revokeBlacklist, setRevokeBlacklist] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Add to dictionary loading state
  const [addingWordId, setAddingWordId] = useState<string | null>(null);

  const fetchWords = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/admin/milog-words?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!response.ok) throw new Error('Failed to fetch milog words');

      const data = await response.json();
      setWords(data.words);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error fetching milog words:', errorMessage, error);
      toast.error('Failed to load milog words');
    } finally {
      setLoading(false);
    }
  }, [authToken, searchQuery, statusFilter, limit, offset]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWords();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchWords]);

  const handleRevoke = useCallback(async () => {
    if (!revokeWord) return;
    setRevoking(true);
    try {
      const response = await fetch('/api/admin/dictionary-revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          word: revokeWord.word,
          language: 'he',
          addToBlacklist: revokeBlacklist,
          reason: revokeReason || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke word');
      }
      toast.success(`Revoked "${revokeWord.word}" from dictionary`);
      setRevokeWord(null);
      setRevokeBlacklist(false);
      setRevokeReason('');
      fetchWords();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`Revoke failed: ${msg}`);
    } finally {
      setRevoking(false);
    }
  }, [revokeWord, revokeBlacklist, revokeReason, authToken, fetchWords]);

  const handleAddToDictionary = useCallback(async (word: MilogWord) => {
    setAddingWordId(word.id);
    try {
      const response = await fetch('/api/admin/invalid-words/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          wordIds: [word.id],
          addToDictionary: true,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add word to dictionary');
      }
      toast.success(`Added "${word.word}" to dictionary`);
      fetchWords();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`Failed: ${msg}`);
    } finally {
      setAddingWordId(null);
    }
  }, [authToken, fetchWords]);

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (s: string | null) => s ? (STATUS_LABELS[s] || s) : 'Unknown';
  const getStatusColor = (s: string | null) => s ? (STATUS_COLORS[s] || 'bg-slate-500') : 'bg-slate-500';

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-neo-navy-light border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-500/20 rounded-lg">
                  <Filter className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Processed</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-neo-navy-light border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Verified</p>
                  <p className="text-2xl font-bold text-white">{stats.verified}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-neo-navy-light border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <X className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Not Found</p>
                  <p className="text-2xl font-bold text-white">{stats.notFound}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-neo-navy-light border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neo-yellow/20 rounded-lg">
                  <BookCheck className="w-5 h-5 text-neo-yellow" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">In Dictionary</p>
                  <p className="text-2xl font-bold text-white">{stats.promoted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-neo-navy-light border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Pending</p>
                  <p className="text-2xl font-bold text-white">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-neo-navy-light border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Ban className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Wrong Type</p>
                  <p className="text-2xl font-bold text-white">{stats.rejectedType}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-neo-navy-light text-white p-4 rounded-lg border border-slate-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search Hebrew words..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOffset(0);
            }}
            className="pl-9 bg-neo-navy-elevated border-slate-600 text-white placeholder:text-slate-400"
            dir="rtl"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setOffset(0); }}>
            <SelectTrigger className="w-full sm:w-[160px] bg-neo-navy-elevated border-slate-600">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="not_found">Not Found</SelectItem>
              <SelectItem value="promoted">In Dictionary</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected_type">Wrong Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Words List */}
      {loading && words.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader size="md" />
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <BookCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No words have been verified against milog.co.il yet</p>
          <p className="text-sm mt-2">Words will appear here once the daily enrichment job runs</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {words.map((word) => (
              <m.div
                key={word.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              >
                <Card className={cn(
                  "bg-neo-navy-light border-slate-700 transition-all",
                  word.approved_at && "ring-2 ring-neo-yellow"
                )}>
                  <CardContent className="p-4 space-y-3">
                    {/* Word Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white" dir="rtl">{word.word}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={cn("text-xs text-white", getStatusColor(word.milog_status))}>
                            {getStatusLabel(word.milog_status)}
                          </Badge>
                          {word.milog_word_type && (
                            <Badge className={cn(
                              "text-xs text-white",
                              WORD_TYPE_COLORS[word.milog_word_type] || 'bg-slate-600'
                            )}>
                              {word.milog_word_type}
                            </Badge>
                          )}
                          {word.approved_at && (
                            <Badge className="text-xs bg-neo-yellow text-black">
                              In Dictionary
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-400">
                          {word.submission_count}x
                        </div>
                        <div className="text-xs text-slate-400">submitted</div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>Verified: {formatDate(word.milog_verified_at)}</p>
                      {word.approved_at && (
                        <p className="text-neo-yellow">Promoted: {formatDate(word.approved_at)}</p>
                      )}
                      <p>Attempts: {word.milog_attempts}</p>
                      {word.milog_rejected_reason && (
                        <p className="text-purple-400">Rejected: {word.milog_rejected_reason}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {word.milog_url && (
                        <a
                          href={word.milog_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View on Milog
                        </a>
                      )}
                      {/* Add to Dictionary — verified but not yet promoted */}
                      {word.milog_status === 'verified' && !word.approved_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="ms-auto border-green-600 text-green-400 hover:bg-green-600/20 hover:text-green-300"
                          onClick={() => handleAddToDictionary(word)}
                          disabled={addingWordId === word.id}
                        >
                          <Check className="w-3 h-3 me-1" />
                          {addingWordId === word.id ? 'Adding...' : 'Add to Dictionary'}
                        </Button>
                      )}
                      {/* Revoke — already in dictionary */}
                      {word.approved_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="ms-auto border-red-600 text-red-400 hover:bg-red-600/20 hover:text-red-300"
                          onClick={() => setRevokeWord(word)}
                        >
                          <Trash2 className="w-3 h-3 me-1" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </m.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total > limit && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="border-slate-600"
          >
            <ChevronLeft className="w-4 h-4 me-1" />
            Previous
          </Button>
          <span className="text-sm text-slate-400">
            {offset + 1}-{Math.min(offset + limit, pagination.total)} of {pagination.total}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(offset + limit)}
            disabled={offset + limit >= pagination.total}
            className="border-slate-600"
          >
            Next
            <ChevronRight className="w-4 h-4 ms-1" />
          </Button>
        </div>
      )}

      {/* Revoke Confirmation Dialog */}
      {revokeWord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="bg-neo-navy-light border-slate-600 max-w-md w-full">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Revoke Word</h3>
                  <p className="text-sm text-slate-400">
                    Remove <span className="font-bold text-white" dir="rtl">{revokeWord.word}</span> from dictionary
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revokeBlacklist}
                    onChange={(e) => setRevokeBlacklist(e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  <span className="text-sm text-slate-300">Also add to blacklist (prevent re-submission)</span>
                </label>

                <Input
                  placeholder="Reason (optional)"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="bg-neo-navy-elevated border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600"
                  onClick={() => { setRevokeWord(null); setRevokeBlacklist(false); setRevokeReason(''); }}
                  disabled={revoking}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleRevoke}
                  disabled={revoking}
                >
                  {revoking ? 'Revoking...' : 'Revoke'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
