import type { BeatPhase, GagBeat, GagDef, PropKind, PropMove } from './gagTypes';

export const CLIP_IDS = [
  'bonk-dizzy',
  'faceplant-thumbsup',
  'glass-peek',
  'slow-burn-stare',
  'double-take',
  'puffed-chest-smug',
] as const;

const P = {
  smug: '/mascot/trophy-nobg.webp',
  think: '/mascot/bridge-think-nobg.webp',
  shock: '/mascot/mindblown-nobg.webp',
  dizzy: '/mascot/bored-nobg.webp',
  oops: '/mascot/bridge-oops-nobg.webp',
  cheer: '/mascot/bridge-cheer-nobg.webp',
  sneak: '/mascot/explorer-nobg.webp',
  hello: '/mascot/hello-nobg.webp',
  run: '/mascot/onfire-nobg.webp',
  sleep: '/mascot/sleepy-nobg.webp',
  tada: '/mascot/victory-nobg.webp',
  sad: '/mascot/crying-nobg.webp',
};

type Extra = Partial<Omit<GagBeat, 'phase' | 'pose' | 'ms'>>;

function b(phase: BeatPhase, pose: string, ms: number, extra: Extra = {}): GagBeat {
  return { phase, pose, ms, out: 8, y: 0, rotate: 0, scaleX: 1, scaleY: 1, ...extra };
}

const prop = (kind: PropKind, move: PropMove) => ({ prop: { kind, move } });
const squash = { scaleX: 1.3, scaleY: 0.62 };
const stretch = { scaleX: 0.82, scaleY: 1.25 };
const leave = { out: 84 };

const isWord = (e: { kind: string }) => e.kind === 'word-submitted';

/** Gag content is data: swap or extend this list without touching the director. */
export const GAG_CATALOG: readonly GagDef[] = [
  {
    id: 'measuring-tape',
    bible: 2,
    chance: 1,
    running: true,
    perSession: true,
    after: 'finger-count',
    matches: (e) => isWord(e) && 'wordLength' in e && e.wordLength >= 7,
    variants: [
      { id: 'measures-the-word', beats: [
        b('windup', P.think, 520, prop('tape', 'enter')),
        b('action', P.cheer, 160, { ...stretch, ...prop('tape', 'zip-out'), sound: 'gagTapeMeasure' }),
        b('freeze', P.shock, 620, { ...stretch, ...prop('tape', 'hold') }),
        b('reaction', P.smug, 520, { scaleX: 1.1, scaleY: 1.1, ...prop('tape', 'snap') }),
        b('reaction', P.smug, 300, leave),
      ] },
      { id: 'tapes-two-together', beats: [
        b('windup', P.think, 460, prop('tape', 'enter')),
        b('action', P.cheer, 150, { ...stretch, ...prop('tape', 'zip-out'), sound: 'gagTapeMeasure' }),
        b('freeze', P.shock, 560, { ...squash, ...prop('tape', 'hold') }),
        b('reaction', P.think, 560, { rotate: -6, ...prop('tape-double', 'enter') }),
        b('reaction', P.smug, 820, { scaleX: 1.14, scaleY: 1.14, ...prop('tape-double', 'hold') }),
      ] },
    ],
  },
  {
    id: 'finger-count',
    bible: 1,
    chance: 0.2,
    matches: (e) => isWord(e) && 'wordLength' in e && e.wordLength >= 7,
    variants: [
      { id: 'toes-tip-over', clip: 'faceplant-thumbsup', beats: [
        b('windup', P.think, 620, { rotate: -4 }),
        b('action', P.shock, 150, { y: 6, rotate: 70, ...squash, cry: true, sound: 'gagFaceplantThud' }),
        b('freeze', P.sleep, 520, { y: 6, rotate: 70, ...squash }),
        b('reaction', P.tada, 420, { y: -8, ...stretch }),
        b('reaction', P.tada, 320, leave),
      ] },
      { id: 'pretend-knew-it', clip: 'puffed-chest-smug', beats: [
        b('windup', P.think, 640, { rotate: 4 }),
        b('action', P.shock, 140, { ...stretch, cry: true }),
        b('freeze', P.shock, 460, stretch),
        b('reaction', P.smug, 700, { scaleX: 1.12, scaleY: 1.12 }),
        b('reaction', P.smug, 300, leave),
      ] },
    ],
  },
  {
    id: 'dictionary-bonk',
    bible: 4,
    chance: 1,
    ignoresGap: true,
    matches: (e, ctx) => e.kind === 'word-rejected' && ctx.rejectionsThisRound === 3,
    variants: [
      { id: 'book-snaps-shut', clip: 'bonk-dizzy', beats: [
        b('windup', P.think, 560, prop('book', 'enter')),
        b('action', P.shock, 140, { ...squash, ...prop('book', 'close'), cry: true, sound: 'gagBookSlam' }),
        b('freeze', P.shock, 480, { ...squash, ...prop('book', 'close') }),
        b('reaction', P.dizzy, 700, { rotate: 720, sound: 'gagDizzyStars' }),
        b('reaction', P.dizzy, 300, leave),
      ] },
      { id: 'book-drops-from-shelf', clip: 'bonk-dizzy', beats: [
        b('windup', P.sneak, 520, { rotate: -6 }),
        b('action', P.shock, 140, { ...squash, ...prop('book', 'drop'), cry: true, sound: 'gagBookSlam' }),
        b('freeze', P.shock, 500, { ...squash, ...prop('book', 'hold') }),
        b('reaction', P.dizzy, 640, { rotate: -540, sound: 'gagDizzyStars' }),
        b('reaction', P.dizzy, 300, leave),
      ] },
    ],
  },
  {
    id: 'stamp-too-early',
    bible: 3,
    chance: 0.2,
    matches: (e, ctx) => e.kind === 'word-rejected' && ctx.rejectionsThisRound !== 3,
    variants: [
      { id: 'turns-stamp-around', clip: 'slow-burn-stare', beats: [
        b('windup', P.smug, 480, prop('stamp', 'enter')),
        b('action', P.cheer, 140, { ...squash, ...prop('stamp', 'drop'), sound: 'gagRubberStamp' }),
        b('freeze', P.shock, 520, prop('stamp', 'hold')),
        b('reaction', P.oops, 900, prop('stamp', 'flip')),
        b('reaction', P.oops, 300, leave),
      ] },
      { id: 'hides-stamp', clip: 'slow-burn-stare', beats: [
        b('windup', P.smug, 460, prop('stamp', 'enter')),
        b('action', P.cheer, 140, { ...stretch, ...prop('stamp', 'drop'), sound: 'gagRubberStamp' }),
        b('freeze', P.shock, 560, prop('stamp', 'hold')),
        b('reaction', P.think, 820, { rotate: 6, ...prop('stamp', 'exit') }),
        b('reaction', P.think, 300, leave),
      ] },
    ],
  },
  {
    id: 'stack-collapse',
    bible: 6,
    chance: 0.35,
    matches: (e) => e.kind === 'combo-broken' && e.fromLevel >= 3,
    variants: [
      { id: 'last-tile-on-nose', clip: 'bonk-dizzy', beats: [
        b('windup', P.cheer, 380, { ...prop('tile-stack', 'hold'), sound: 'gagTileStackWobble', soundRate: 1.3 }),
        b('action', P.shock, 160, { ...squash, ...prop('tile-stack', 'fall'), sound: 'gagTileStackCrash' }),
        b('freeze', P.shock, 700, squash),
        b('reaction', P.dizzy, 520, { ...squash, ...prop('tile', 'drop'), sound: 'gagBonk' }),
        b('reaction', P.dizzy, 300, leave),
      ] },
      { id: 'catches-all-but-one', clip: 'bonk-dizzy', beats: [
        b('windup', P.cheer, 360, { ...prop('tile-stack', 'hold'), sound: 'gagTileStackWobble', soundRate: 1.3 }),
        b('action', P.cheer, 160, { ...stretch, ...prop('tile-stack', 'fall'), sound: 'gagTileStackCrash' }),
        b('freeze', P.smug, 620, stretch),
        b('reaction', P.oops, 560, { ...squash, ...prop('tile', 'drop'), sound: 'gagBonk' }),
        b('reaction', P.oops, 300, leave),
      ] },
    ],
  },
  {
    id: 'caught-tracing',
    bible: 7,
    chance: 1,
    holdUntil: 'word',
    matches: (e) => e.kind === 'idle',
    variants: [
      { id: 'traces-then-double-take', clip: 'glass-peek', beats: [
        b('windup', P.sneak, 700, { out: 8 }),
        b('action', P.think, 160, { out: 0, rotate: -10, sound: 'gagGlassSqueak' }),
        b('freeze', P.think, 900, { out: 0, rotate: -10 }),
        b('reaction', P.shock, 240, { out: 2, ...stretch }),
        b('reaction', P.oops, 600, { out: 4 }),
      ] },
      { id: 'dozes-then-double-take', clip: 'double-take', beats: [
        b('windup', P.dizzy, 700, { out: 8 }),
        b('action', P.sleep, 180, { out: 0, rotate: -14, y: 6 }),
        b('freeze', P.sleep, 1400, { out: 0, rotate: -14, y: 6 }),
        b('reaction', P.shock, 220, { out: 2, ...stretch }),
        b('reaction', P.think, 600, { out: 4 }),
      ] },
    ],
  },
  {
    id: 'holds-back-timer',
    bible: 8,
    anchor: 'timer',
    chance: 1,
    holdUntil: 'round-end',
    matches: (e) => e.kind === 'timer-final-10s',
    variants: [
      { id: 'pushes-the-edge', beats: [
        b('windup', P.run, 360, { out: 30, rotate: -10 }),
        b('action', P.hello, 150, { out: 0, scaleX: 0.6, scaleY: 1.2, sound: 'gagGlassSqueak' }),
        b('freeze', P.hello, 8000, { out: 0, scaleX: 0.62, scaleY: 1.18 }),
        b('reaction', P.oops, 400, leave),
      ] },
      { id: 'back-against-the-edge', beats: [
        b('windup', P.sneak, 380, { out: 30 }),
        b('action', P.run, 150, { out: 2, rotate: 8, scaleX: 0.7, scaleY: 1.15 }),
        b('freeze', P.run, 8000, { out: 2, rotate: 8, scaleX: 0.72, scaleY: 1.12 }),
        b('reaction', P.oops, 400, leave),
      ] },
    ],
  },
  {
    id: 'record-overreaction',
    bible: 9,
    chance: 1,
    daily: true,
    dailyGroup: 'personal-best',
    interrupts: true,
    ignoresGap: true,
    matches: (e) => e.kind === 'personal-best',
    variants: [
      // soundRate 1.34 lands the drumroll's cymbal (1.0s in) on the 760ms action beat.
      { id: 'drumroll-faceplant', clip: 'faceplant-thumbsup', beats: [
        b('windup', P.think, 760, { sound: 'gagDrumrollShort', soundRate: 1.34 }),
        b('action', P.tada, 150, { ...stretch, y: -12, cry: true, ...prop('trophy', 'enter') }),
        b('freeze', P.tada, 520, { ...stretch, y: -12, ...prop('trophy', 'hold') }),
        b('reaction', P.sleep, 460, { rotate: 80, ...squash, sound: 'gagFaceplantThud' }),
        b('reaction', P.tada, 360, leave),
      ] },
      { id: 'drumroll-trophy-hoist', clip: 'puffed-chest-smug', beats: [
        b('windup', P.think, 760, { sound: 'gagDrumrollShort', soundRate: 1.34 }),
        b('action', P.tada, 150, { ...stretch, y: -14, cry: true }),
        b('freeze', P.smug, 600, { ...stretch, y: -14, ...prop('trophy', 'hold') }),
        b('reaction', P.smug, 520, { scaleX: 1.15, scaleY: 1.15, ...prop('trophy', 'hold') }),
        b('reaction', P.smug, 320, leave),
      ] },
    ],
  },
  {
    id: 'crumpled-record',
    bible: 10,
    chance: 1,
    daily: true,
    dailyGroup: 'personal-best',
    interrupts: true,
    ignoresGap: true,
    matches: (e) => e.kind === 'personal-best',
    variants: [
      { id: 'crumples-it-slowly', clip: 'slow-burn-stare', beats: [
        b('windup', P.smug, 620, prop('score-sheet', 'enter')),
        b('action', P.shock, 150, { ...stretch, ...prop('score-sheet', 'hold') }),
        b('freeze', P.shock, 620, { ...stretch, ...prop('score-sheet', 'hold') }),
        b('reaction', P.sad, 1100, { ...squash, ...prop('score-sheet', 'crumple'), sound: 'gagCrumple' }),
        b('reaction', P.sad, 300, leave),
      ] },
      { id: 'crumples-and-tosses-it', clip: 'slow-burn-stare', beats: [
        b('windup', P.smug, 600, prop('score-sheet', 'enter')),
        b('action', P.shock, 150, { ...stretch, ...prop('score-sheet', 'hold') }),
        b('freeze', P.think, 640, prop('score-sheet', 'hold')),
        b('reaction', P.oops, 1000, { ...prop('score-sheet', 'crumple'), sound: 'gagCrumple', soundRate: 0.9 }),
        b('reaction', P.smug, 420, { rotate: 8, ...prop('score-sheet', 'fall') }),
      ] },
    ],
  },
  {
    id: 'rare-letter-whimper',
    bible: 12,
    chance: 0.25,
    matches: (e) => e.kind === 'rare-letter',
    variants: [
      { id: 'tiny-whimper', clip: 'puffed-chest-smug', beats: [
        b('windup', P.cheer, 520, { out: 20, ...prop('tile', 'hold') }),
        b('action', P.shock, 140, { out: 16, ...stretch, ...prop('tile', 'exit') }),
        b('freeze', P.sad, 620, { out: 16 }),
        b('reaction', P.sad, 420, { out: 20, sound: 'gagTinyWhimper' }),
        b('reaction', P.sad, 300, leave),
      ] },
      { id: 'hides-it-behind-back', clip: 'puffed-chest-smug', beats: [
        b('windup', P.sneak, 500, { out: 20, ...prop('tile', 'hold') }),
        b('action', P.smug, 140, { out: 14, ...squash, ...prop('tile', 'exit') }),
        b('freeze', P.smug, 600, { out: 14, scaleX: 1.12, scaleY: 1.12 }),
        b('reaction', P.oops, 480, { out: 20, sound: 'mascotGasp', soundRate: 1.3 }),
        b('reaction', P.oops, 300, leave),
      ] },
    ],
  },
  {
    id: 'photo-evidence',
    bible: 13,
    chance: 0.5,
    matches: (e) => e.kind === 'duplicate-word',
    variants: [
      { id: 'holds-up-photo', beats: [
        b('windup', P.think, 460, prop('photo', 'enter')),
        b('action', P.cheer, 140, { ...stretch, ...prop('photo', 'drop') }),
        b('freeze', P.smug, 700, prop('photo', 'hold')),
        b('reaction', P.smug, 520, { rotate: 6, ...prop('photo', 'exit') }),
      ] },
      { id: 'taps-the-photo', beats: [
        b('windup', P.sneak, 440, prop('photo', 'enter')),
        b('action', P.cheer, 140, { ...squash, ...prop('photo', 'flip') }),
        b('freeze', P.smug, 680, prop('photo', 'hold')),
        b('reaction', P.think, 540, { rotate: -6, ...prop('photo', 'exit') }),
      ] },
    ],
  },
  {
    id: 'dusty-practising',
    bible: 16,
    chance: 1,
    matches: (e) => e.kind === 'session-start' && e.daysAway !== null && e.daysAway >= 3,
    variants: [
      { id: 'cheat-sheet-showing', clip: 'double-take', beats: [
        b('windup', P.sleep, 700, prop('dust', 'hold')),
        b('action', P.shock, 160, { ...stretch, ...prop('dust', 'fall') }),
        b('freeze', P.shock, 460, stretch),
        b('reaction', P.think, 900, prop('cheat-sheet', 'enter')),
        b('reaction', P.think, 300, leave),
      ] },
      { id: 'book-upside-down', clip: 'double-take', beats: [
        b('windup', P.sleep, 700, prop('dust', 'hold')),
        b('action', P.shock, 160, { ...stretch, ...prop('dust', 'fall') }),
        b('freeze', P.shock, 460, stretch),
        b('reaction', P.smug, 900, prop('book', 'flip')),
        b('reaction', P.smug, 300, leave),
      ] },
    ],
  },
  {
    id: 'slow-clap',
    bible: 20,
    chance: 0.2,
    running: true,
    matches: (e) => isWord(e) && 'wordLength' in e && e.wordLength <= 3,
    variants: [
      { id: 'clap-slows-down', clip: 'slow-burn-stare', beats: [
        b('windup', P.smug, 400, { out: 20 }),
        b('action', P.cheer, 140, { out: 14, ...squash, sound: 'gagSlowClap' }),
        b('freeze', P.cheer, 380, { out: 14 }),
        b('reaction', P.smug, 900, { out: 14, scaleX: 1.08 }),
        b('reaction', P.smug, 300, leave),
      ] },
      { id: 'clap-stops-midway', clip: 'slow-burn-stare', beats: [
        b('windup', P.smug, 400, { out: 20 }),
        b('action', P.cheer, 140, { out: 14, ...squash }),
        b('freeze', P.think, 760, { out: 14 }),
        b('reaction', P.think, 700, { out: 18 }),
        b('reaction', P.think, 300, leave),
      ] },
      { id: 'one-clap-and-leaves', clip: 'slow-burn-stare', beats: [
        b('windup', P.smug, 420, { out: 22 }),
        b('action', P.cheer, 140, { out: 14, ...squash }),
        b('freeze', P.dizzy, 640, { out: 14 }),
        b('reaction', P.dizzy, 520, leave),
      ] },
    ],
  },
];

export function gagById(id: string): GagDef | undefined {
  return GAG_CATALOG.find((g) => g.id === id);
}
