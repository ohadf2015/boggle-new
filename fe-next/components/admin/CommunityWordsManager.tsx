'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, X, Search, Filter, ThumbsUp, ThumbsDown, 
  AlertCircle, Loader2, Globe, Calendar, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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

interface CommunityWord {
  word: string;
  language: string;
  likes_count: number;
  dislikes_count: number;
  net_score: number;
  is_potentially_valid: boolean;
  first_submitter: string | null;
  last_voted_at: string | null;
  first_voted_at: string | null;
  status: 'validated' | 'pending_review' | 'rejected' | 'pending';
}

interface CommunityStats {
  total: number;
  validated: number;
  pendingReview: number;
  rejected: number;
  pending: number;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
];

export function CommunityWordsManager({ authToken }: { authToken: string }) {
  const { t } = useLanguage();
  const [words, setWords] = useState<CommunityWord[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('pending_review');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('net_score');

  const fetchWords = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (langFilter !== 'all') params.append('language', langFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sortBy', sortBy);
      params.append('limit', '50');

      const response = await fetch(`/api/admin/community-words?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch words');
      
      const data = await response.json();
      setWords(data.words);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching words:', error);
      toast.error('Failed to load words');
    } finally {
      setLoading(false);
    }
  }, [authToken, statusFilter, langFilter, searchQuery, sortBy]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const handleApprove = async (word: string, language: string) => {
    try {
      setProcessing(`${word}-${language}`);
      const response = await fetch('/api/admin/community-words/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ word, language, addToDictionary: true })
      });

      if (!response.ok) throw new Error('Failed to approve');

      toast.success(`Approved "${word}"`);
      // Update local state instead of full reload
      setWords(prev => prev.filter(w => !(w.word === word && w.language === language)));
      // Refresh stats in background
      fetchWords();
    } catch (error) {
      toast.error('Failed to approve word');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (word: string, language: string) => {
    try {
      setProcessing(`${word}-${language}`);
      const response = await fetch('/api/admin/community-words/disapprove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ word, language, blacklist: true })
      });

      if (!response.ok) throw new Error('Failed to reject');

      toast.success(`Rejected "${word}"`);
      setWords(prev => prev.filter(w => !(w.word === word && w.language === language)));
      fetchWords();
    } catch (error) {
      toast.error('Failed to reject word');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-slate-500 mb-1">Pending Review</span>
              <span className="text-2xl font-bold text-amber-500">{stats.pendingReview}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-slate-500 mb-1">Validated</span>
              <span className="text-2xl font-bold text-green-500">{stats.validated}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-slate-500 mb-1">Rejected</span>
              <span className="text-2xl font-bold text-red-500">{stats.rejected}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-slate-500 mb-1">Total</span>
              <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">{stats.total}</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-800 text-black dark:text-white p-4 rounded-lg shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search words..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="validated">Validated</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        <Select value={langFilter} onValueChange={setLangFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {LANGUAGES.map(lang => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Words List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No words found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {words.map((word) => (
              <motion.div
                key={`${word.word}-${word.language}`}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{word.word}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs font-normal">
                            {LANGUAGES.find(l => l.code === word.language)?.flag} {word.language.toUpperCase()}
                          </Badge>
                          <Badge 
                            variant={word.net_score >= 0 ? "default" : "destructive"}
                            className={cn(word.net_score >= 10 ? "bg-green-500" : word.net_score >= 3 ? "bg-amber-500" : "")}
                          >
                            Score: {word.net_score}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col text-xs text-slate-400 text-right">
                        <span><ThumbsUp className="w-3 h-3 inline mr-1 text-green-500"/>{word.likes_count}</span>
                        <span><ThumbsDown className="w-3 h-3 inline mr-1 text-red-500"/>{word.dislikes_count}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-2">
                    <div className="space-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        <span>Submitted by: {word.first_submitter || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>Last Vote: {new Date(word.last_voted_at || '').toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 flex justify-between gap-2 border-t bg-slate-50/50 dark:bg-slate-900/50">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleReject(word.word, word.language)}
                      disabled={!!processing}
                    >
                      {processing === `${word.word}-${word.language}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-2" /> Reject
                        </>
                      )}
                    </Button>
                    <div className="w-px h-6 bg-slate-200" />
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleApprove(word.word, word.language)}
                      disabled={!!processing}
                    >
                      {processing === `${word.word}-${word.language}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" /> Approve
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
