'use client';

import { Edit2 } from 'lucide-react';
import { CHALLENGE_TYPE_ICONS, type BuzzChallengeAdmin } from '../types';

export interface ChallengeCardProps {
  challenge: BuzzChallengeAdmin;
  index: number;
  onEdit: (index: number) => void;
}

function getChallengeTypeIcon(type: string): string {
  return CHALLENGE_TYPE_ICONS[type] || '\u2753';
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-900/50 text-green-400';
    case 'medium':
      return 'bg-yellow-900/50 text-yellow-400';
    case 'hard':
      return 'bg-red-900/50 text-red-400';
    default:
      return 'bg-slate-700 text-slate-400';
  }
}

/**
 * Individual challenge display card with edit action.
 */
export function ChallengeCard({
  challenge,
  index,
  onEdit,
}: ChallengeCardProps): React.ReactElement {
  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xl" title={challenge.type}>
            {getChallengeTypeIcon(challenge.type)}
          </span>
          <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300">
            {challenge.type}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(challenge.difficulty)}`}>
            {challenge.difficulty}
          </span>
        </div>
        <button
          onClick={() => onEdit(index)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-neo-yellow transition-colors shrink-0"
          title="Edit / Regenerate"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      <div className="text-white">
        <span className="text-slate-500 text-sm">Prompt: </span>
        {challenge.prompt}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-slate-500">Answer: </span>
          <span className="font-mono font-bold text-neo-yellow">
            {challenge.answer}
          </span>
        </div>
        {challenge.hint && (
          <div>
            <span className="text-slate-500">Hint: </span>
            <span className="text-slate-300">{challenge.hint}</span>
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500">
        Trend: {challenge.trend_topic}
        {challenge.trending_context && (
          <span className="text-slate-600"> &middot; {challenge.trending_context}</span>
        )}
      </div>
    </div>
  );
}
