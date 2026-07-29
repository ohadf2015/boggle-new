'use client';

/**
 * PartyVotingSystem — shared voting UI for party games.
 * TV view: shows vote results with animated bar chart.
 * Phone view: shows options to vote on.
 * Used by Caption Clash (vote on captions), Pixel Clash (vote on drawings),
 * Shadow Clash (vote on suspects).
 */

import { memo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

// ==================== Types ====================

export interface VoteOption {
  id: string;
  label: string;
  /** Optional secondary label (e.g., player name after reveal) */
  sublabel?: string;
  /** Whether this is the current player's own option (greyed out) */
  isOwn?: boolean;
}

export interface VoteResult {
  id: string;
  label: string;
  sublabel?: string;
  votes: number;
  percentage: number;
  isWinner: boolean;
}

// ==================== Phone View: Vote Ballot ====================

interface PhoneBallotProps {
  options: VoteOption[];
  onVote: (optionId: string) => void;
  voted: string | null;
  timeRemaining?: number;
  accentColor?: string;
}

function PhoneBallotInner({ options, onVote, voted, timeRemaining, accentColor = 'neo-lime' }: PhoneBallotProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="font-neo-display text-neo-white text-center uppercase text-sm mb-2">
        {voted ? (t('party.voted') || 'Vote locked!') : (t('party.vote') || 'Pick your favorite!')}
      </p>
      {options.map((option) => {
        const isSelected = voted === option.id;
        const isDisabled = voted !== null || option.isOwn;

        return (
          <button
            key={option.id}
            onClick={() => !isDisabled && onVote(option.id)}
            disabled={isDisabled}
            className={`
              border-3 border-neo-black rounded-neo p-3 text-left
              transition-all duration-100
              ${isSelected
                ? `bg-${accentColor} text-neo-black shadow-hard`
                : option.isOwn
                  ? 'bg-neo-navy-elevated text-neo-white border-neo-cream/15 cursor-not-allowed'
                  : 'bg-neo-navy-elevated text-neo-white shadow-hard hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed'
              }
            `}
          >
            <span className="font-neo-body text-sm">{option.label}</span>
            {option.isOwn && (
              <span className="ms-2 text-xs opacity-50">({t('party.yours') || 'yours'})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ==================== TV View: Vote Results ====================

interface TvResultsProps {
  results: VoteResult[];
  accentColor?: string;
}

function TvResultsInner({ results, accentColor = 'neo-lime' }: TvResultsProps) {
  return (
    <div className="flex flex-col gap-4 p-8 max-w-3xl mx-auto">
      {results.map((result, index) => (
        <AdaptiveMotion.div
          key={result.id}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.15, type: 'spring', stiffness: 300, damping: 25 }}
          className="flex items-center gap-4"
        >
          {/* Label */}
          <div className="w-1/3 text-right">
            <p className={`font-neo-display text-lg uppercase truncate ${result.isWinner ? `text-${accentColor}` : 'text-neo-white'}`}>
              {result.label}
            </p>
            {result.sublabel && (
              <p className="font-neo-body text-neo-white text-xs">{result.sublabel}</p>
            )}
          </div>

          {/* Bar */}
          <div className="flex-1 bg-neo-navy-elevated border-3 border-neo-cream/20 rounded-neo h-10 overflow-hidden relative">
            <AdaptiveMotion.div
              initial={{ width: 0 }}
              animate={{ width: `${result.percentage}%` }}
              transition={{ delay: index * 0.15 + 0.2, type: 'spring', stiffness: 200, damping: 20 }}
              className={`h-full ${result.isWinner ? `bg-${accentColor}` : 'bg-neo-cream/30'} rounded-neo`}
            />
            <span className="absolute inset-0 flex items-center justify-center font-neo-display text-neo-black text-sm">
              {result.percentage > 0 ? `${Math.round(result.percentage)}%` : ''}
            </span>
          </div>

          {/* Vote count */}
          <span className="w-12 text-center font-neo-display text-neo-white text-sm">
            {result.votes}
          </span>
        </AdaptiveMotion.div>
      ))}
    </div>
  );
}

// ==================== Exports ====================

export const PhoneBallot = memo(PhoneBallotInner);
PhoneBallot.displayName = 'PhoneBallot';

export const TvVoteResults = memo(TvResultsInner);
TvVoteResults.displayName = 'TvVoteResults';
