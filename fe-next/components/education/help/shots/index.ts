import type { StaticImageData } from 'next/image';
import assignFocus from './assign-focus.webp';
import assignType from './assign-type.webp';
import classTools from './class-tools.webp';
import classesActions from './classes-actions.webp';
import createClass from './create-class.webp';
import hqGetStudentsIn from './hq-get-students-in.webp';
import hqOverview from './hq-overview.webp';
import hqPasteWords from './hq-paste-words.webp';
import hqStartGame from './hq-start-game.webp';
import libraryDiscover from './library-discover.webp';
import liveHost from './live-host.webp';
import lobbyControls from './lobby-controls.webp';
import lobbySwitchGame from './lobby-switch-game.webp';
import lobby from './lobby.webp';
import reportsClass from './reports-class.webp';
import results from './results.webp';
import studentJoin from './student-join.webp';
import teacherSignup from './teacher-signup.webp';
import wordListEditor from './word-list-editor.webp';
import heAssignFocus from './he/assign-focus.webp';
import heAssignType from './he/assign-type.webp';
import heClassTools from './he/class-tools.webp';
import heClassesActions from './he/classes-actions.webp';
import heCreateClass from './he/create-class.webp';
import heHqGetStudentsIn from './he/hq-get-students-in.webp';
import heHqOverview from './he/hq-overview.webp';
import heHqPasteWords from './he/hq-paste-words.webp';
import heHqStartGame from './he/hq-start-game.webp';
import heLibraryDiscover from './he/library-discover.webp';
import heReportsClass from './he/reports-class.webp';
import heStudentJoin from './he/student-join.webp';
import heTeacherSignup from './he/teacher-signup.webp';
import heWordListEditor from './he/word-list-editor.webp';

export interface HelpShot {
  src: StaticImageData | string;
  width: number;
  height: number;
  /** Phone-sized captures render narrower so they are not blown up. */
  phone?: boolean;
}

/** Captured from the running app (localhost, QA teacher accounts) on 2026-10-02. */
export const HELP_SHOTS = {
  'assign-focus': { src: assignFocus, width: 560, height: 302 },
  'assign-type': { src: assignType, width: 560, height: 252 },
  'class-tools': { src: classTools, width: 912, height: 721 },
  'classes-actions': { src: classesActions, width: 1166, height: 496 },
  'create-class': { src: createClass, width: 692, height: 387 },
  'hq-get-students-in': { src: hqGetStudentsIn, width: 461, height: 644 },
  'hq-overview': { src: hqOverview, width: 1440, height: 900 },
  'hq-paste-words': { src: hqPasteWords, width: 691, height: 326 },
  'hq-start-game': { src: hqStartGame, width: 691, height: 644 },
  'library-discover': { src: libraryDiscover, width: 1160, height: 800 },
  'live-host': { src: liveHost, width: 1440, height: 900 },
  'lobby-controls': { src: lobbyControls, width: 1380, height: 104 },
  'lobby-switch-game': { src: lobbySwitchGame, width: 462, height: 340 },
  lobby: { src: lobby, width: 1440, height: 900 },
  'reports-class': { src: reportsClass, width: 1044, height: 684 },
  results: { src: results, width: 1440, height: 900 },
  'student-join': { src: studentJoin, width: 390, height: 480, phone: true },
  'teacher-signup': { src: teacherSignup, width: 366, height: 533, phone: true },
  'word-list-editor': { src: wordListEditor, width: 780, height: 840 },
} satisfies Record<string, HelpShot>;

export type HelpShotId = keyof typeof HELP_SHOTS;

/** Shots that need a running live game (lobby, host, results) have no Hebrew capture yet and fall back to English. */
const HELP_SHOTS_HE: Partial<Record<HelpShotId, HelpShot>> = {
  'assign-focus': { src: heAssignFocus, width: 560, height: 312 },
  'assign-type': { src: heAssignType, width: 560, height: 236 },
  'class-tools': { src: heClassTools, width: 912, height: 665 },
  'classes-actions': { src: heClassesActions, width: 1166, height: 496 },
  'create-class': { src: heCreateClass, width: 692, height: 387 },
  'hq-get-students-in': { src: heHqGetStudentsIn, width: 461, height: 514 },
  'hq-overview': { src: heHqOverview, width: 1440, height: 900 },
  'hq-paste-words': { src: heHqPasteWords, width: 691, height: 326 },
  'hq-start-game': { src: heHqStartGame, width: 691, height: 644 },
  'library-discover': { src: heLibraryDiscover, width: 1160, height: 800 },
  'reports-class': { src: heReportsClass, width: 1044, height: 684 },
  'student-join': { src: heStudentJoin, width: 390, height: 480, phone: true },
  'teacher-signup': { src: heTeacherSignup, width: 366, height: 518, phone: true },
  'word-list-editor': { src: heWordListEditor, width: 780, height: 840 },
};

const HELP_SHOTS_BY_LOCALE: Record<string, Partial<Record<HelpShotId, HelpShot>>> = { he: HELP_SHOTS_HE };

export function helpShot(id: HelpShotId, locale: string): HelpShot {
  return HELP_SHOTS_BY_LOCALE[locale]?.[id] ?? HELP_SHOTS[id];
}
