/**
 * The teacher is not a contestant.
 *
 * Observed on a real projector at 23:41 on 2026-09-11, room DQRV92: the wall
 * read "WE HAVE A WINNER! Mr. Gauntlet B — 0", because a classroom host sits
 * in the room's socket list, scores nothing (classroom rooms force broadcast
 * mode), and the server's score calculator ranked that zero first on a board
 * where nobody else had scored either. Three children played; the adult who
 * never touched a tile won.
 *
 * This is the arithmetic that stops it, kept pure and in ONE place so the
 * projector, the teacher's laptop and thirty phones cannot disagree about who
 * came second (Pitfall Class 3).
 */

import { describe, it, expect } from 'vitest';
import {
  podiumWithoutHost,
  standingsWithoutHost,
} from '../roundEndPodium';

const TEACHER = 'Mr. Gauntlet B';

const podium = [
  { username: 'Mr. Gauntlet B', score: 0, rank: 1, wordsFound: 0, totalWords: 30 },
  { username: 'Noa', score: 40, rank: 2, wordsFound: 4, totalWords: 30 },
  { username: 'Dan', score: 20, rank: 3, wordsFound: 2, totalWords: 30 },
];

describe('podiumWithoutHost', () => {
  it('drops the teacher from the plinths', () => {
    expect(podiumWithoutHost(podium, TEACHER).map((p) => p.username)).toEqual(['Noa', 'Dan']);
  });

  it('re-ranks what is left so the top student is first, not second', () => {
    expect(podiumWithoutHost(podium, TEACHER).map((p) => p.rank)).toEqual([1, 2]);
  });

  it('matches the teacher case- and whitespace-insensitively', () => {
    expect(podiumWithoutHost(podium, '  mr. gauntlet b ')).toHaveLength(2);
  });

  it('leaves a podium the teacher is not on alone', () => {
    const students = podium.slice(1);
    expect(podiumWithoutHost(students, TEACHER)).toEqual(students);
  });

  // A teacher demoing the room alone is the ONLY case where the host is also
  // the whole field. An empty podium is worse than an honest one-name podium.
  it('keeps the host rather than render nothing when it is the only entry', () => {
    const solo = [podium[0]];
    expect(podiumWithoutHost(solo, TEACHER)).toEqual(solo);
  });

  it('is safe on an absent podium and an unknown teacher', () => {
    expect(podiumWithoutHost(undefined, TEACHER)).toEqual([]);
    expect(podiumWithoutHost(podium, '')).toEqual(podium);
  });
});

describe('standingsWithoutHost', () => {
  const standings = [
    { username: 'Mr. Gauntlet B', score: 0 },
    { username: 'Noa', score: 40 },
    { username: 'Dan', score: 20 },
  ];

  it('removes the teacher so a student is never told "2nd of 4"', () => {
    expect(standingsWithoutHost(standings, TEACHER)).toHaveLength(2);
  });

  it('preserves the server order of everyone else', () => {
    expect(standingsWithoutHost(standings, TEACHER).map((p) => p.username)).toEqual(['Noa', 'Dan']);
  });

  it('never empties the list', () => {
    expect(standingsWithoutHost([standings[0]], TEACHER)).toHaveLength(1);
  });

  it('is safe on an absent list', () => {
    expect(standingsWithoutHost(undefined, TEACHER)).toEqual([]);
  });
});
