/**
 * Three deterministic per-round missions for a solo bots game.
 * Seed with the round-start timestamp. No economy — bonus points only.
 */

export type SoloMissionId = 'long-word' | 'volume' | 'letter' | 'sprint' | 'giant';

export interface SoloMission {
  id: SoloMissionId;
  labelKey: string;
  progress: number;
  target: number;
  bonusPts: number;
  done: boolean;
  /** Set only for the letter mission. Uppercase, from the shared Latin set. */
  letter?: string;
}

const POOL: readonly SoloMissionId[] = ['long-word', 'volume', 'letter', 'sprint', 'giant'];
const LETTERS = ['A', 'E', 'I', 'N', 'O', 'R', 'S', 'T'] as const;

const BONUS: Record<SoloMissionId, number> = {
  'long-word': 40,
  volume: 50,
  letter: 30,
  sprint: 40,
  giant: 60,
};

const TARGET: Record<SoloMissionId, number> = {
  'long-word': 1,
  volume: 10,
  letter: 1,
  sprint: 120,
  giant: 1,
};

const LABEL: Record<SoloMissionId, string> = {
  'long-word': 'singlePlayer.missions.longWord',
  volume: 'singlePlayer.missions.volume',
  letter: 'singlePlayer.missions.letter',
  sprint: 'singlePlayer.missions.sprint',
  giant: 'singlePlayer.missions.giant',
};

/** mulberry32 — same family as soloDaily, kept local so this module stays pure. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeMission(id: SoloMissionId, letter: string): SoloMission {
  return {
    id,
    labelKey: LABEL[id],
    progress: 0,
    target: TARGET[id],
    bonusPts: BONUS[id],
    done: false,
    ...(id === 'letter' ? { letter } : {}),
  };
}

export function buildMissions(seed: number): [SoloMission, SoloMission, SoloMission] {
  const rand = mulberry(seed);
  const ids = [...POOL];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const swap = ids[i];
    ids[i] = ids[j];
    ids[j] = swap;
  }
  const letter = LETTERS[Math.floor(rand() * LETTERS.length)];
  return [
    makeMission(ids[0], letter),
    makeMission(ids[1], letter),
    makeMission(ids[2], letter),
  ];
}

export interface ApplyWordResult {
  missions: SoloMission[];
  /** Bonus points newly awarded by this word. 0 when nothing just completed. */
  bonusPts: number;
}

export function applyWord(
  missions: readonly SoloMission[],
  word: string,
  pts: number,
  elapsedSec: number,
): ApplyWordResult {
  let bonusPts = 0;
  const upper = word.toUpperCase();
  const next = missions.map((mission) => {
    if (mission.done) return mission;
    let progress = mission.progress;
    let done = false;
    switch (mission.id) {
      case 'long-word':
        if (word.length >= 6) { progress = 1; done = true; }
        break;
      case 'giant':
        if (word.length >= 7) { progress = 1; done = true; }
        break;
      case 'volume':
        progress = Math.min(mission.target, mission.progress + 1);
        done = progress >= mission.target;
        break;
      case 'letter':
        if (mission.letter && upper.includes(mission.letter)) { progress = 1; done = true; }
        break;
      case 'sprint':
        if (elapsedSec <= 60) {
          progress = Math.min(mission.target, mission.progress + Math.max(0, pts));
          done = progress >= mission.target;
        }
        break;
      default:
        break;
    }
    if (done) bonusPts += mission.bonusPts;
    return { ...mission, progress, done };
  });
  return { missions: next, bonusPts };
}
