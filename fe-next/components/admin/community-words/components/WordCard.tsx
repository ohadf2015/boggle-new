'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Check, X, ThumbsUp, ThumbsDown, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';
import type { CommunityWord } from '../types';
import { LANGUAGES, createWordKey } from '../constants';

interface WordCardProps {
  word: CommunityWord;
  isSelected: boolean;
  isProcessing: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export function WordCard({
  word,
  isSelected,
  isProcessing,
  onToggleSelect,
  onApprove,
  onReject,
}: WordCardProps) {
  const languageInfo = LANGUAGES.find((l) => l.code === word.language);

  return (
    <m.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-4 h-4 mt-1 rounded border-slate-300 shrink-0"
              aria-label={`Select ${word.word}`}
            />
            <div className="flex-1">
              <CardTitle className="text-xl">{word.word}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs font-normal">
                  {languageInfo?.flag} {word.language.toUpperCase()}
                </Badge>
                <Badge
                  variant={word.net_score >= 0 ? 'default' : 'destructive'}
                  className={cn(
                    word.net_score >= 10
                      ? 'bg-green-500'
                      : word.net_score >= 3
                        ? 'bg-amber-500'
                        : ''
                  )}
                >
                  Score: {word.net_score}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col text-xs text-slate-400 text-right shrink-0">
              <span>
                <ThumbsUp className="w-3 h-3 inline me-1 text-green-500" />
                {word.likes_count}
              </span>
              <span>
                <ThumbsDown className="w-3 h-3 inline me-1 text-red-500" />
                {word.dislikes_count}
              </span>
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
              <span>
                Last Vote: {new Date(word.last_voted_at || '').toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-2 flex justify-between gap-2 border-t bg-slate-50/50 dark:bg-neo-navy/50">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onReject}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader size="sm" />
            ) : (
              <>
                <X className="w-4 h-4 me-2" /> Reject
              </>
            )}
          </Button>
          <div className="w-px h-6 bg-slate-200" />
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={onApprove}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader size="sm" />
            ) : (
              <>
                <Check className="w-4 h-4 me-2" /> Approve
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </m.div>
  );
}
