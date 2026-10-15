import { describe, it, expect } from 'vitest';
import {
  classroomLivePath,
  isClassroomLivePathname,
  readClassroomLiveFlags,
  legacyClassroomLiveRedirect,
} from '@/lib/education/classroomLivePath';
import { classroomMultiplayerPath, shouldLoadLessonData } from '@/lib/education/classroomGameHandoff';
import { joinSuccessHref } from '@/lib/navigation/eduExitTargets';
import { signedInJoinHref } from '@/lib/education/signedInJoin';

describe('classroomLivePath', () => {
  it('given a student join, when built, then points at the edu live route with the room only', () => {
    expect(classroomLivePath('en', 'ABC123')).toBe('/en/education/live?room=ABC123');
  });

  it('given the teacher, when built with host, then carries host=1', () => {
    expect(classroomLivePath('he', 'ABC123', { host: true })).toBe('/he/education/live?room=ABC123&host=1');
  });

  it('given a code with stray characters, when built, then the code is URL-encoded', () => {
    expect(classroomLivePath('en', 'AB C')).toBe('/en/education/live?room=AB%20C');
  });

  it('given the deprecated lobby builder, when called, then it returns the new host path', () => {
    expect(classroomMultiplayerPath('sv', 'XYZ789')).toBe('/sv/education/live?room=XYZ789&host=1');
  });

  it('given a join that resolved to a live game, when routed, then students land on the live route', () => {
    expect(joinSuccessHref('es', 'XYZ789')).toBe('/es/education/live?room=XYZ789');
    expect(joinSuccessHref('es', null)).toBe('/es/student?class=open');
  });

  it('given a signed-in join with a live game, when routed, then students land on the live route', () => {
    expect(signedInJoinHref('ja', { gameCode: 'XYZ789' })).toBe('/ja/education/live?room=XYZ789');
  });
});

describe('isClassroomLivePathname', () => {
  it.each([
    ['/en/education/live', true],
    ['/he/education/live/', true],
    ['/education/live', true],
    ['/en/education/lists', false],
    ['/en/multiplayer', false],
    [null, false],
  ])('given %s, then %s', (path, expected) => {
    expect(isClassroomLivePathname(path)).toBe(expected);
  });
});

describe('readClassroomLiveFlags', () => {
  it('given the live route, when read, then classroom is implied and host=1 marks the teacher', () => {
    expect(readClassroomLiveFlags('/en/education/live', new URLSearchParams('room=AB12&host=1'))).toEqual({
      isClassroomMode: true,
      isClassroomHost: true,
    });
  });

  it('given the live route without host, when read, then it is a classroom student', () => {
    expect(readClassroomLiveFlags('/en/education/live', new URLSearchParams('room=AB12'))).toEqual({
      isClassroomMode: true,
      isClassroomHost: false,
    });
  });

  it('given the legacy multiplayer flags, when read, then they still resolve', () => {
    expect(readClassroomLiveFlags('/en/multiplayer', new URLSearchParams('classroom=true&host=true'))).toEqual({
      isClassroomMode: true,
      isClassroomHost: true,
    });
  });

  it('given an arcade multiplayer URL, when read, then it is neither', () => {
    expect(readClassroomLiveFlags('/en/multiplayer', new URLSearchParams('room=AB12'))).toEqual({
      isClassroomMode: false,
      isClassroomHost: false,
    });
  });
});

describe('shouldLoadLessonData', () => {
  it('given the live route, when checked, then the teacher lesson is rehydrated without a classroom flag', () => {
    expect(shouldLoadLessonData('?room=AB12&host=1', '/en/education/live')).toBe(true);
  });

  it('given an arcade room, when checked, then no lesson leaks in', () => {
    expect(shouldLoadLessonData('?room=AB12', '/en/multiplayer')).toBe(false);
  });
});

describe('legacyClassroomLiveRedirect', () => {
  it('given an old teacher URL, when redirected, then room and host survive', () => {
    expect(legacyClassroomLiveRedirect('/en/multiplayer', '?room=AB12&classroom=true&host=true')).toBe(
      '/en/education/live?room=AB12&host=1'
    );
  });

  it('given an old student QR, when redirected, then the room survives', () => {
    expect(legacyClassroomLiveRedirect('/he/multiplayer', '?classroom=true&room=AB12')).toBe('/he/education/live?room=AB12');
  });

  it('given an old classroom URL without a room, when redirected, then it keeps the route without a code', () => {
    expect(legacyClassroomLiveRedirect('/en/multiplayer', '?classroom=true')).toBe('/en/education/live');
  });

  it('given an arcade URL, when checked, then nothing redirects', () => {
    expect(legacyClassroomLiveRedirect('/en/multiplayer', '?room=AB12')).toBeNull();
    expect(legacyClassroomLiveRedirect('/en/solo', '?classroom=true')).toBeNull();
  });

  it('given an unprefixed legacy path, when redirected, then it stays unprefixed', () => {
    expect(legacyClassroomLiveRedirect('/multiplayer', '?classroom=true&room=AB12')).toBe('/education/live?room=AB12');
  });
});
