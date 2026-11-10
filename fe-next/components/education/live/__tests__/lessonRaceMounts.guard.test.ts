import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const read = (p: string) => readFileSync(resolve(__dirname, '../../../..', p), 'utf8');

describe('Lesson Word Race mounts', () => {
  it('Given a board round on a phone, When a claim lands, Then the player view has the claim toast mounted for round-frame modes', () => {
    expect(read('player/components/PlayerInGameView.tsx')).toMatch(/\{roundFrame && <LessonClaimToast socket=\{socket\} me=\{username\}/);
  });

  it('Given both room pages, When the word bank mounts, Then it gets the seat name only for students', () => {
    expect(read('app/[locale]/multiplayer/PageClient.tsx')).toMatch(/<StudentWordBank[^>]*me=\{isHost \|\| isClassroomHost \? undefined : username\}/);
    expect(read('app/[locale]/education/live/EduLivePageClient.tsx')).toMatch(/<StudentWordBank[^>]*me=\{isTeacher \? undefined : s\.username\}/);
  });

  it('Given a classroom projector, When the round runs, Then the race board sits beside the live panel in every race mode', () => {
    const tv = read('host/components/TvBroadcastView.tsx');
    expect(tv).toMatch(/<ProjectorLessonClaims /);
  });
});
