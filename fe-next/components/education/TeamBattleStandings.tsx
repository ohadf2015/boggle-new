/**
 * TeamBattleStandings
 *
 * The loud, fair leaderboard a Friday team battle deserves: team totals,
 * ranked, with per-member contribution underneath. Renders for EVERY client
 * from the server-dealt rosters on the classroom summary — deterministic
 * assignment (shared/utils/teamBattle) means the projector and every phone
 * show the same teams without a round-trip, which is the whole point on
 * flaky school wifi.
 */

'use client';

import { Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { computeTeamStandings, type ClassroomTeam } from '@/shared/utils/teamBattle';

export interface TeamBattleStandingsProps {
  teams: ClassroomTeam[];
  /** Per-player final scores from the results payload. */
  scores: Array<{ username: string; score: number }>;
}

const TEAM_COLORS = ['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-lime', 'bg-neo-yellow'];

export function TeamBattleStandings({ teams, scores }: TeamBattleStandingsProps) {
  const { t } = useLanguage();
  const standings = computeTeamStandings(teams, scores);
  if (standings.length === 0) return null;

  return (
    <div
      data-testid="team-battle-standings"
      className="p-5 rounded-neo border-neo border-neo-black bg-neo-navy shadow-hard"
    >
      <div className="flex items-center gap-3 mb-4">
        <Trophy className="w-6 h-6 text-neo-yellow shrink-0" />
        <h3 className="text-neo-white font-neo-display font-bold text-lg leading-tight">
          {t('education.results.teamBattle.title')}
        </h3>
      </div>
      <ol className="space-y-3">
        {standings.map((team, rank) => {
          const isWinner = rank === 0;
          return (
            <li
              key={team.id}
              data-testid={`team-standing-${team.id}`}
              className={cn(
                'rounded-neo border-neo border-neo-black p-3',
                TEAM_COLORS[team.id % TEAM_COLORS.length],
                'text-neo-black',
                isWinner && 'shadow-hard'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-neo-display font-black">
                  {t('education.results.teamBattle.teamName', { number: team.id + 1 })}
                  {isWinner && (
                    <span className="ms-2 text-xs font-black uppercase" data-testid="team-winner-badge">
                      🏆 {t('education.results.teamBattle.winner')}
                    </span>
                  )}
                </span>
                <span className="font-neo-display font-black tabular-nums" data-testid={`team-score-${team.id}`}>
                  {team.totalScore}
                </span>
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {team.members.map((member) => (
                  <li key={member.username} className="text-xs font-bold text-neo-black/80">
                    {member.username} <span className="tabular-nums">({member.score})</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
