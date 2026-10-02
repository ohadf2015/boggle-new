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
