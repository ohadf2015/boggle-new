'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Check, X, ChevronLeft, ChevronRight, Filter, ExternalLink, BookCheck, Clock
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
import { motion, AnimatePresence } from 'framer-motion';

interface MilogWord {
  id: string;
  word: string;
  milog_status: 'verified' | 'not_found' | 'error' | 'pending' | null;
  milog_verified_at: string | null;
  milog_url: string | null;
  milog_attempts: number;
  submission_count: number;
  approved_at: string | null;
}

interface Stats {
  total: number;
  verified: number;
  notFound: number;
  promoted: number;
  pending: number;
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
};

const STATUS_COLORS: Record<string, string> = {
  verified: 'bg-green-500',
  not_found: 'bg-red-500',
  error: 'bg-orange-500',
  pending: 'bg-slate-500',
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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

  const getStatusLabel = (status: string | null) => {
    if (!status) return 'Unknown';
    return STATUS_LABELS[status] || status;
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-slate-500';
    return STATUS_COLORS[status] || 'bg-slate-500';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-slate-800 border-slate-700">
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
          <Card className="bg-slate-800 border-slate-700">
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
          <Card className="bg-slate-800 border-slate-700">
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
          <Card className="bg-slate-800 border-slate-700">
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
          <Card className="bg-slate-800 border-slate-700">
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
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-slate-800 text-white p-4 rounded-lg border border-slate-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search Hebrew words..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOffset(0);
            }}
            className="pl-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            dir="rtl"
          />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setOffset(0); }}>
            <SelectTrigger className="w-[160px] bg-slate-700 border-slate-600">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="not_found">Not Found</SelectItem>
              <SelectItem value="promoted">In Dictionary</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
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
              <motion.div
                key={word.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              >
                <Card className={cn(
                  "bg-slate-800 border-slate-700 transition-all",
                  word.approved_at && "ring-2 ring-neo-yellow"
                )}>
                  <CardContent className="p-4 space-y-3">
                    {/* Word Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white" dir="rtl">{word.word}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={cn("text-xs text-white", getStatusColor(word.milog_status))}>
                            {getStatusLabel(word.milog_status)}
                          </Badge>
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
                    </div>

                    {/* Milog Link */}
                    {word.milog_url && (
                      <div className="pt-2">
                        <a
                          href={word.milog_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View on Milog
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
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
            <ChevronLeft className="w-4 h-4 mr-1" />
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
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
