/**
 * One assignment's results for the teacher: who played, who has not, who
 * needs help and which words the class missed. Pure: callers fetch the
 * `student_lesson_progress` rows and the roster and pass names in.
 */

import { percent, summarizeTally, tallyStudentWords, wordKey, type WordProgressRow } from './wordTally';

export interface AssignmentResultsRow extends Partial<WordProgressRow> {
  student_id: string;
  profiles?: { display_name?: string | null } | null;
}

export interface AssignmentRosterEntry {
  studentId: string;
  name: string;
}

export interface PlayedStudent {
  studentId: string;
  name: string;
  accuracy: number | null;
  missed: string[];
}

export interface DifficultWord {
  word: string;
  missedBy: number;
  played: number;
}

export interface AssignmentResults {
  played: PlayedStudent[];
  notPlayed: AssignmentRosterEntry[];
  needHelp: PlayedStudent[];
  difficultWords: DifficultWord[];
  total: number;
}

export const NEED_HELP_BELOW = 70;
const MAX_NEED_HELP = 3;
const MAX_WORDS = 5;

export function buildAssignmentResults({
  rows,
  roster,
  fallbackName,
}: {
  rows: readonly AssignmentResultsRow[];
  roster: readonly AssignmentRosterEntry[];
  fallbackName: string;
}): AssignmentResults {
  const byStudent = new Map<string, AssignmentResultsRow[]>();
  for (const row of rows) {
    const list = byStudent.get(row.student_id) ?? [];
    list.push(row);
    byStudent.set(row.student_id, list);
  }

  const rosterName = new Map(roster.map((s) => [s.studentId, s.name]));
  const wordMisses = new Map<string, { word: string; missedBy: number }>();

  const played: PlayedStudent[] = [...byStudent.entries()].map(([studentId, studentRows]) => {
    const tally = tallyStudentWords(
      studentRows.map((r) => ({ words_attempted: r.words_attempted ?? null, words_mastered: r.words_mastered ?? null })),
    );
    const summary = summarizeTally(tally);
    const missed: string[] = [];
    for (const w of tally.values()) {
      if (w.mastered || w.attempts <= w.correct) continue;
      missed.push(w.word);
      const key = wordKey(w.word);
      const entry = wordMisses.get(key) ?? { word: w.word, missedBy: 0 };
      entry.missedBy += 1;
      wordMisses.set(key, entry);
    }
    const profileName = studentRows.find((r) => r.profiles?.display_name)?.profiles?.display_name;
    return {
      studentId,
      name: rosterName.get(studentId) || profileName || fallbackName,
      accuracy: percent(summary.correct, summary.attempts),
      missed,
    };
  });

  played.sort((a, b) => a.name.localeCompare(b.name));

  const needHelp = played
    .filter((s) => s.accuracy !== null && s.accuracy < NEED_HELP_BELOW)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
    .slice(0, MAX_NEED_HELP);

  const difficultWords = [...wordMisses.values()]
    .sort((a, b) => b.missedBy - a.missedBy || a.word.localeCompare(b.word))
    .slice(0, MAX_WORDS)
    .map((w) => ({ ...w, played: played.length }));

  const playedIds = new Set(byStudent.keys());
  const notPlayed = roster.filter((s) => !playedIds.has(s.studentId));
  const everyone = new Set([...roster.map((s) => s.studentId), ...playedIds]);

  return { played, notPlayed, needHelp, difficultWords, total: everyone.size };
}
