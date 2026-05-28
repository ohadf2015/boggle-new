'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, AlertTriangle, Check, X, ChevronLeft, ChevronRight, Filter, Zap
} from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { m, AnimatePresence } from 'framer-motion';
import { BulkApproveButton, AutoPromoteButton } from './invalid-words';

interface InvalidWord {
  id: string;
  word: string;
  language: string;
  submission_count: number;
  reason: string | null;
  first_submitted_at: string;
  last_submitted_at: string;
  approved_at: string | null;
  // External verification (Wiktionary for en/sv/es/ja, Milog for he).
  verification_status?: string | null;
  verification_source?: string | null;
  verification_word_type?: string | null;
  verification_url?: string | null;
  milog_status?: string | null;
  milog_word_type?: string | null;
  milog_url?: string | null;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
}

interface InvalidWordsManagerProps {
  authToken: string;
}

const REASON_KEYS: Record<string, string> = {
  not_on_board: 'admin.invalidWords.reasons.not_on_board',
  not_in_dictionary: 'admin.invalidWords.reasons.not_in_dictionary',
  peer_rejected: 'admin.invalidWords.reasons.peer_rejected',
};

const REASON_FALLBACKS: Record<string, string> = {
  not_on_board: 'Not on board',
  not_in_dictionary: 'Not in dictionary',
  peer_rejected: 'Peer rejected',
};

const LANGUAGE_KEYS: Record<string, string> = {
  en: 'languages.english',
  he: 'languages.hebrew',
  sv: 'languages.swedish',
  ja: 'languages.japanese',
  es: 'languages.spanish',
};

const LANGUAGE_FALLBACKS: Record<string, string> = {
  en: 'English',
  he: 'Hebrew',
  sv: 'Swedish',
  ja: 'Japanese',
  es: 'Spanish',
};

export function InvalidWordsManager({ authToken }: InvalidWordsManagerProps) {
  const { t } = useLanguage();
  const [words, setWords] = useState<InvalidWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // Auto-promote stats
  const [autoPromoteStats, setAutoPromoteStats] = useState<{
    autoPromoted: number;
    candidates: number;
    verifiedCandidates?: number;
  } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [minCount, setMinCount] = useState(3);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Selection helper functions
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(words.map(w => w.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const isSelected = (id: string) => selectedIds.has(id);

  const fetchWords = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (langFilter && langFilter !== 'all') params.append('language', langFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      params.append('minCount', minCount.toString());
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/admin/invalid-words?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!response.ok) throw new Error('Failed to fetch invalid words');

      const data = await response.json();
      setWords(data.words);
      setTotal(data.total);
      setStats(data.stats);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error fetching invalid words:', errorMessage, error);
      toast.error('Failed to load invalid words');
    } finally {
      setLoading(false);
    }
  }, [authToken, searchQuery, langFilter, statusFilter, minCount, limit, offset]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWords();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchWords]);

  // Fetch auto-promote stats
  const fetchAutoPromoteStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/invalid-words/auto-promote-stats', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAutoPromoteStats({ autoPromoted: data.autoPromoted, candidates: data.candidates });
      }
    } catch {
      // Stats are non-critical
    }
  }, [authToken]);

  useEffect(() => {
    fetchAutoPromoteStats();
  }, [fetchAutoPromoteStats]);

  // Clear selection when filters or pagination change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchQuery, langFilter, statusFilter, minCount, offset]);

  /**
   * Select every visible row whose external verifier has marked the word
   * as `verified` (Wiktionary for en/sv/es/ja, Milog for he). Lets admins
   * one-click bulk-approve high-confidence words.
   */
  const selectAllVerified = () => {
    const verifiedIds = words
      .filter(w => w.verification_status === 'verified' || w.milog_status === 'verified')
      .map(w => w.id);
    setSelectedIds(new Set(verifiedIds));
  };

  const handleApprove = async (word: string, language: string, addToDictionary: boolean = false) => {
    const key = `${word}-${language}`;
    setProcessing(key);
    try {
      const response = await fetch('/api/admin/invalid-words/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ word, language, addToDictionary }),
      });

      if (!response.ok) throw new Error('Failed to approve word');

      toast.success(`Approved "${word}"`);
      // Find the word's id to remove from selection
      const wordToRemove = words.find(w => w.word === word && w.language === language);
      if (wordToRemove) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(wordToRemove.id);
          return next;
        });
      }
      // Remove from list
      setWords(prev => prev.filter(w => !(w.word === word && w.language === language)));
      setTotal(prev => prev - 1);
      if (stats) {
        setStats({
          ...stats,
          pending: stats.pending - 1,
          approved: stats.approved + 1,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error approving word:', errorMessage, error);
      toast.error('Failed to approve word');
    } finally {
      setProcessing(null);
    }
  };

  const handleDismiss = async (word: string, language: string) => {
    const key = `${word}-${language}`;
    setProcessing(key);
    try {
      const response = await fetch('/api/admin/invalid-words/dismiss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ word, language, reason: 'admin_dismissed' }),
      });

      if (!response.ok) throw new Error('Failed to dismiss word');

      toast.success(`Dismissed "${word}"`);
      // Find the word's id to remove from selection
      const wordToRemove = words.find(w => w.word === word && w.language === language);
      if (wordToRemove) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(wordToRemove.id);
          return next;
        });
      }
      // Remove from list
      setWords(prev => prev.filter(w => !(w.word === word && w.language === language)));
      setTotal(prev => prev - 1);
      if (stats) {
        setStats({
          ...stats,
          pending: stats.pending - 1,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error dismissing word:', errorMessage, error);
      toast.error('Failed to dismiss word');
    } finally {
      setProcessing(null);
    }
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getReasonLabel = (reason: string | null) => {
    if (!reason) return t('admin.invalidWords.reasons.unknown') || 'Unknown';
    // Handle dismissed reasons
    if (reason.startsWith('dismissed:')) {
      return t('admin.invalidWords.reasons.dismissed') || 'Dismissed';
    }
    const key = REASON_KEYS[reason];
    return key ? (t(key) || REASON_FALLBACKS[reason] || reason) : reason;
  };

  const getReasonColor = (reason: string | null) => {
    if (!reason) return 'bg-slate-500';
    if (reason === 'not_on_board') return 'bg-orange-500';
    if (reason === 'not_in_dictionary') return 'bg-blue-500';
    if (reason === 'peer_rejected') return 'bg-red-500';
    return 'bg-slate-500';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-neo-navy-light border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Pending Review</p>
                  <p className="text-2xl font-bold text-white">{stats.pending}</p>
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
                  <p className="text-sm text-slate-400">Approved</p>
                  <p className="text-2xl font-bold text-white">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-neo-navy-light border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-500/20 rounded-lg">
                  <Filter className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total (≥{minCount})</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {autoPromoteStats && (
            <Card className="bg-neo-navy-light border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Zap className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Auto-Promoted / Candidates</p>
                    <p className="text-2xl font-bold text-white">
                      {autoPromoteStats.autoPromoted}
                      <span className="text-base text-slate-400 ms-1">/ {autoPromoteStats.candidates}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-neo-navy-light text-white p-4 rounded-lg border border-slate-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search words..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOffset(0);
            }}
            className="pl-9 bg-neo-navy-elevated border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Select value={langFilter} onValueChange={(val) => { setLangFilter(val); setOffset(0); }}>
            <SelectTrigger className="w-full sm:w-[140px] bg-neo-navy-elevated border-slate-600">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="he">Hebrew</SelectItem>
              <SelectItem value="sv">Swedish</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
            </SelectContent>
          </Select>

          <Select value={minCount.toString()} onValueChange={(val) => { setMinCount(parseInt(val)); setOffset(0); }}>
            <SelectTrigger className="w-full sm:w-[140px] bg-neo-navy-elevated border-slate-600">
              <SelectValue placeholder="Min Count" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">≥3 submissions</SelectItem>
              <SelectItem value="5">≥5 submissions</SelectItem>
              <SelectItem value="10">≥10 submissions</SelectItem>
              <SelectItem value="20">≥20 submissions</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setOffset(0); }}>
            <SelectTrigger className="w-full sm:w-[170px] bg-neo-navy-elevated border-slate-600">
              <SelectValue placeholder="Verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="verified">Verified (auto)</SelectItem>
              <SelectItem value="needs_review">Needs review</SelectItem>
              <SelectItem value="rejected_type">Rejected (abbrev/proper)</SelectItem>
              <SelectItem value="not_found">Not found</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Selection Toolbar */}
      {words.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-neo-navy-light p-3 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="border-slate-600 hover:bg-neo-navy-elevated"
              disabled={selectedIds.size === words.length}
            >
              Select All ({words.length})
            </Button>
            {(() => {
              const verifiedCount = words.filter(w =>
                w.verification_status === 'verified' || w.milog_status === 'verified'
              ).length;
              if (verifiedCount === 0) return null;
              return (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllVerified}
                  className="border-emerald-700 bg-emerald-900/30 hover:bg-emerald-900/60 text-emerald-200"
                >
                  ✓ Select Verified ({verifiedCount})
                </Button>
              );
            })()}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-slate-400 hover:text-white"
              disabled={selectedIds.size === 0}
            >
              Clear
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="text-sm text-neo-yellow font-medium">
                {selectedIds.size} selected
              </span>
            )}
            <BulkApproveButton
              selectedCount={selectedIds.size}
              selectedIds={Array.from(selectedIds)}
              authToken={authToken}
              onComplete={() => { clearSelection(); fetchWords(); }}
              disabled={selectedIds.size === 0}
            />
            <AutoPromoteButton
              candidateCount={autoPromoteStats?.candidates ?? 0}
              authToken={authToken}
              onComplete={() => { fetchWords(); fetchAutoPromoteStats(); }}
            />
          </div>
        </div>
      )}

      {/* Words List */}
      {loading && words.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader size="md" />
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No invalid words meeting the threshold ({minCount}+ submissions)</p>
          <p className="text-sm mt-2">This is good! Players aren&apos;t submitting many invalid words.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {words.map((word) => {
              const key = `${word.word}-${word.language}`;
              const isProcessing = processing === key;

              return (
                <m.div
                  key={key}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                >
                  <Card className={cn(
                    "bg-neo-navy-light border-slate-700 transition-all relative",
                    isSelected(word.id) && "ring-2 ring-neo-yellow",
                    isProcessing && "opacity-50 pointer-events-none"
                  )}>
                    <CardContent className="p-4 space-y-3">
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 left-2">
                        <input
                          type="checkbox"
                          checked={isSelected(word.id)}
                          onChange={() => toggleSelection(word.id)}
                          className="w-5 h-5 rounded border-slate-600 bg-neo-navy-elevated text-neo-yellow focus:ring-neo-yellow cursor-pointer"
                          aria-label={`Select ${word.word}`}
                        />
                      </div>
                      {/* Word Header */}
                      <div className="flex items-start justify-between ps-6">
                        <div>
                          <h3 className="text-lg font-bold text-white">{word.word}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {(LANGUAGE_KEYS[word.language] ? t(LANGUAGE_KEYS[word.language]) : null) || LANGUAGE_FALLBACKS[word.language] || word.language}
                            </Badge>
                            <Badge className={cn("text-xs text-white", getReasonColor(word.reason))}>
                              {getReasonLabel(word.reason)}
                            </Badge>
                            {(() => {
                              // Verification badge — fold both Wiktionary (verification_*) and Milog (milog_*) signals.
                              const status = word.verification_status || word.milog_status;
                              const source = word.verification_source || (word.milog_status ? 'milog' : null);
                              const url = word.verification_url || word.milog_url;
                              const wordType = word.verification_word_type || word.milog_word_type;
                              if (!status || status === 'pending') return null;
                              const tone =
                                status === 'verified' ? 'bg-emerald-600 text-white' :
                                status === 'rejected_type' ? 'bg-red-700 text-white' :
                                status === 'not_found' ? 'bg-slate-600 text-white' :
                                status === 'needs_review' ? 'bg-amber-600 text-white' :
                                status === 'error' ? 'bg-orange-700 text-white' :
                                'bg-slate-500 text-white';
                              const label =
                                status === 'verified' ? `✓ ${source || 'verified'}${wordType ? ` (${wordType})` : ''}` :
                                status === 'rejected_type' ? `✗ ${wordType || 'rejected'}` :
                                status;
                              const inner = (
                                <Badge className={cn('text-xs', tone)}>
                                  {label}
                                </Badge>
                              );
                              return url ? (
                                <a href={url} target="_blank" rel="noreferrer" className="hover:opacity-80">
                                  {inner}
                                </a>
                              ) : inner;
                            })()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-yellow-500">
                            {word.submission_count}x
                          </div>
                          <div className="text-xs text-slate-400">submitted</div>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="text-xs text-slate-400 space-y-1">
                        <p>First: {formatDate(word.first_submitted_at)}</p>
                        <p>Last: {formatDate(word.last_submitted_at)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(word.word, word.language, false)}
                          disabled={isProcessing}
                        >
                          <Check className="w-4 h-4 me-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-slate-600 hover:bg-neo-navy-elevated"
                          onClick={() => handleApprove(word.word, word.language, true)}
                          disabled={isProcessing}
                        >
                          + Dictionary
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDismiss(word.word, word.language)}
                          disabled={isProcessing}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
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
            {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(offset + limit)}
            disabled={offset + limit >= total}
            className="border-slate-600"
          >
            Next
            <ChevronRight className="w-4 h-4 ms-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
