/**
 * The classroom → multiplayer handoff.
 *
 * ClassroomGameLobby writes the teacher's lesson (vocabulary, game mode, timer)
 * to sessionStorage and then navigates to /multiplayer. useMultiplayerSession
 * reads it back. Historically the read was gated on `?fromLesson=true` — a param
 * NOTHING in the app ever set — so the teacher's words never reached the board
 * and the teacher's mode never seeded the host pre-game selector.
 *
 * Every unit test of the downstream components passed lessonData as a *prop*,
 * so the dead channel was invisible. These tests assert the two ends against
 * each other: the URL the lobby actually produces must satisfy the gate the
 * session hook actually applies.
 */

import { describe, it, expect } from 'vitest';
import {
  buildReteachLessonData,
  classroomMultiplayerPath,
  shouldLoadLessonData,
} from './classroomGameHandoff';

describe('classroomMultiplayerPath', () => {
  it('carries the room code and marks the room as a host-run classroom game', () => {
    const path = classroomMultiplayerPath('en', 'ABC123');
    expect(path).toBe('/en/multiplayer?room=ABC123&classroom=true&host=true');
  });

  it('respects the active locale so the teacher is not bounced to English', () => {
    expect(classroomMultiplayerPath('he', 'XYZ789')).toContain('/he/multiplayer');
  });
});

describe('shouldLoadLessonData', () => {
  it('loads the lesson for the URL the classroom lobby actually navigates to', () => {
    const search = new URL(`https://x${classroomMultiplayerPath('en', 'ABC123')}`).search;
    expect(shouldLoadLessonData(search)).toBe(true);
  });

  it('still honours the legacy ?fromLesson=true entry point', () => {
    expect(shouldLoadLessonData('?room=ABC123&fromLesson=true')).toBe(true);
  });

  it('does not leak a stale lesson into a casual room opened in the same tab', () => {
    expect(shouldLoadLessonData('?room=ABC123')).toBe(false);
    expect(shouldLoadLessonData('')).toBe(false);
    expect(shouldLoadLessonData('?classroom=false')).toBe(false);
  });
});

describe('buildReteachLessonData', () => {
  const summary = {
    missedWords: ['neutron', 'photon'],
    lessonIds: ['lesson-1', 'lesson-2'],
    lessonNames: ['Physics 101'],
  };

  const previous = {
    lessonId: 'lesson-1,lesson-2',
    lessonName: 'Physics 101',
    vocabularyWords: ['neutron', 'photon', 'atom'],
    language: 'en',
    gameMode: 'word-hunt',
    targetWord: 'atom',
    templateSettings: {
      timerSeconds: 180,
      difficulty: 'medium',
      minWordLength: 3,
      allowLateJoin: true,
    },
  };

  it('returns null when there is nothing to reteach', () => {
    expect(buildReteachLessonData(previous, { ...summary, missedWords: [] })).toBeNull();
  });

  it('narrows the vocabulary to only the words nobody found', () => {
    const reteach = buildReteachLessonData(previous, summary);
    expect(reteach?.vocabularyWords).toEqual(['neutron', 'photon']);
  });

  it('carries over the teacher\'s mode, language, and board settings from the round just played', () => {
    const reteach = buildReteachLessonData(previous, summary);
    expect(reteach?.gameMode).toBe('word-hunt');
    expect(reteach?.language).toBe('en');
    expect(reteach?.templateSettings).toEqual(previous.templateSettings);
    expect(reteach?.lessonId).toBe(previous.lessonId);
    expect(reteach?.lessonName).toBe(previous.lessonName);
  });

  it('clears the pinned word-hunt target — it may be a word the class already found', () => {
    const reteach = buildReteachLessonData(previous, summary);
    expect(reteach?.targetWord).toBe('');
  });

  it('falls back to the summary\'s lesson ids and names when the stored payload is gone', () => {
    const reteach = buildReteachLessonData(null, summary);
    expect(reteach?.lessonId).toBe('lesson-1,lesson-2');
    expect(reteach?.lessonName).toBe('Physics 101');
    expect(reteach?.vocabularyWords).toEqual(['neutron', 'photon']);
  });

  it('returns null rather than staging a payload the session reader would reject', () => {
    // useMultiplayerSession discards lesson data without lessonId/lessonName —
    // staging one anyway would silently re-run the FULL lesson instead.
    expect(
      buildReteachLessonData(null, { missedWords: ['neutron'], lessonIds: [], lessonNames: [] })
    ).toBeNull();
  });
});
