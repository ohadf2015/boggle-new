import { MAX_PLAYERS_PER_ROOM, ROOM_CODE_LENGTH } from '@/shared/constants/gameConstants';

/**
 * Scoped on purpose. Web ad providers ship dormant (`useInterstitialAd` routes
 * production web to H5 Games Ads behind `NEXT_PUBLIC_H5_ADS_ENABLED`) and the
 * Android build declares "contains ads", so this page claims what the browser
 * serves today and never promises a permanent absence.
 * `__tests__/claims.guard.test.ts` holds the line.
 */
export const AD_CLAIM =
  'The browser game runs no ads today — no banner, no pre-roll, nothing to dismiss before a round starts. ' +
  'The Android app does carry ads, so stay in a browser tab if you want it clean.';

export const ANDROID_ADS_FAQ = {
  q: 'Does LexiClash have ads?',
  a:
    'The browser game runs no ads today: no banners, no pre-roll video, nothing between you and the grid. ' +
    'The free Android app does carry ads — that is what pays for it — so play in a browser tab if you would rather skip them. ' +
    'Classroom and student sessions serve no ads on any platform.',
} as const;

/**
 * Ordered by how hard the claim is to falsify. Pay-to-win leads because no
 * config flag can turn it on: real money buys only Teacher Pro (classroom
 * reporting), and a multiplayer room exposes no boost at all. The solo modes
 * do spend earned coins (Blast upgrades, survival clues) — hence the scoping.
 */
export const PAIN_POINTS = [
  {
    title: 'No pay-to-win power-ups in multiplayer',
    desc: 'A multiplayer room offers nothing that freezes the clock, reveals a word or reshuffles the grid — not for coins, and not for cash. Whoever finds the most words wins.',
  },
  {
    title: 'No install, no account',
    desc: 'Open a link and you are in. No app store, no download, no email, no password — on a phone or a laptop.',
  },
  {
    title: 'Nothing interrupts the round',
    desc: 'The timer runs from the first tap to the last. No pop-up asking you to upgrade at the moment you spot a seven-letter word.',
  },
  {
    title: 'A whole room, not a duel',
    desc: `One room holds up to ${MAX_PLAYERS_PER_ROOM} players on the same grid — a party, a family, a classroom — not just you and one opponent.`,
  },
  {
    title: 'Everyone plays the same board',
    desc: 'No matchmaking queue to wait in and no hidden rating deciding who you face. You share a room code; the grid is identical for all of you.',
  },
  {
    title: 'Six languages, full dictionaries',
    desc: 'English, Hebrew (right-to-left), Swedish, Japanese, Spanish and Russian — each with its own real word list, not a translated menu.',
  },
] as const;

/** [feature, LexiClash, Boggle With Friends] */
export const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Where it runs', 'Any browser — phone, tablet, laptop', 'App install (iOS / Android)'],
  ['Getting in', `Open a link or type a ${ROOM_CODE_LENGTH}-character room code`, 'Install, open, sign in'],
  ['Players per room', `Up to ${MAX_PLAYERS_PER_ROOM}`, 'Head-to-head'],
  ['Power-ups that affect the score', 'None in a multiplayer room', 'Purchasable boosts'],
  ['Account required', 'No', 'Yes'],
  ['Languages', '6, including Hebrew RTL', 'English'],
  ['Game modes', 'Grid battles, daily puzzles, adventure, blast, drills, party', 'Grid battles'],
  ['Classroom use', 'Built in — no student logins, no ads', 'Not designed for it'],
];

export const STATS = [
  { value: '0', label: 'Power-ups in multiplayer', color: 'text-neo-lime' },
  { value: String(MAX_PLAYERS_PER_ROOM), label: 'Players per room', color: 'text-neo-pink' },
  { value: '6', label: 'Languages', color: 'text-neo-cyan' },
  { value: '~10s', label: 'From link to grid', color: 'text-neo-yellow' },
] as const;

export const HOW_TO_STEPS = [
  {
    n: '01',
    title: 'Open the lobby',
    desc: 'Any browser, any device. Nothing to install and no account to make.',
    mascot: '/mascot/explorer.webp',
    tint: 'border-neo-cyan',
  },
  {
    n: '02',
    title: 'Share the code',
    desc: `Create a room and you get a ${ROOM_CODE_LENGTH}-character code plus a link and a QR. Send it however you already talk to each other.`,
    mascot: '/mascot/dj.webp',
    tint: 'border-neo-pink',
  },
  {
    n: '03',
    title: 'Race the same grid',
    desc: 'Everyone sees identical letters at the same moment. Trace words through touching tiles; the longest and rarest score most.',
    mascot: '/mascot/flexing.webp',
    tint: 'border-neo-lime',
  },
] as const;

export const faqs = [
  {
    q: 'What is a good alternative to Boggle With Friends?',
    a:
      'LexiClash plays the part people actually want from Boggle With Friends — a real-time race on one shared letter grid — in a browser tab, with no power-ups for sale. ' +
      `Create a room, share the ${ROOM_CODE_LENGTH}-character code, and up to ${MAX_PLAYERS_PER_ROOM} players can be tracing words on the same board about ten seconds later. No install, no account.`,
  },
  {
    q: 'Is there a multiplayer word game with no ads?',
    a: `${AD_CLAIM} Either way, nothing ever plays in the middle of a round — the clock runs uninterrupted from the first tap to the last.`,
  },
  ANDROID_ADS_FAQ,
  {
    q: 'Can I play without power-ups deciding the game?',
    a:
      'In a multiplayer room, yes — there is nothing to spend and nothing to buy that affects your score, so no wallet can out-find you. ' +
      'The solo modes do have boosts (extra moves in Blast, clues in the daily survival puzzle) bought with coins you earn by playing; they are not sold for money and they do not exist in multiplayer. ' +
      'The only thing real money buys anywhere on LexiClash is Teacher Pro, a classroom reporting add-on for educators.',
  },
  {
    q: 'Do my friends need to download anything?',
    a:
      'No. Send them the room link and it opens in whatever browser they already use. ' +
      'It works on iPhone, Android, tablets and desktops, and you can add it to a home screen if you want an icon — but that is never required to play.',
  },
  {
    q: 'How many people can play at once?',
    a:
      `A single room holds up to ${MAX_PLAYERS_PER_ROOM} players, all on the same grid at the same time. ` +
      'That covers a party, a family on three different devices, or a full class — not just a two-player match.',
  },
  {
    q: 'How long does a game take?',
    a:
      'A round is a couple of minutes, and a match is a handful of rounds, so a full session fits in a coffee break. ' +
      'Nobody waits days for someone else to take a turn, because there are no turns — you are all searching simultaneously.',
  },
  {
    q: 'Is it really free?',
    a:
      'The multiplayer game, the daily puzzles and the single-player modes are free, with no paid tier that plays better. ' +
      'Teacher Pro ($9/month) adds classroom analytics and reporting for educators; it changes nothing about how the game itself plays.',
  },
  {
    q: 'Which languages can we play in?',
    a:
      'Six, each with a full dictionary: English, Hebrew (with right-to-left layout), Swedish, Japanese, Spanish and Russian. ' +
      'Pick the language per room, which makes mixed-language groups and language classes workable.',
  },
] as const;

export const CROSS_LINKS = [
  {
    href: 'blog/best-boggle-alternatives-2026',
    tag: 'GUIDE',
    title: 'Best Boggle Alternatives',
    desc: 'Six apps compared, honestly',
    accent: 'border-neo-yellow text-neo-yellow',
  },
  {
    href: 'play-boggle-online-free',
    tag: 'PLAY',
    title: 'Play Boggle Online Free',
    desc: 'Straight to a grid, no install',
    accent: 'border-neo-lime text-neo-lime',
  },
  {
    href: 'words-with-friends-alternative',
    tag: 'ALT',
    title: 'Words With Friends Alternative',
    desc: 'Real-time instead of turn-based',
    accent: 'border-neo-pink text-neo-pink',
  },
  {
    href: 'multiplayer',
    tag: 'LOBBY',
    title: 'Open the Multiplayer Lobby',
    desc: 'Make a room, share the code',
    accent: 'border-neo-cyan text-neo-cyan',
  },
] as const;

export const STICKER_BADGES = [
  'NO POWER-UPS',
  'NO DOWNLOAD',
  'NO SIGNUP',
  'REAL-TIME',
  `${MAX_PLAYERS_PER_ROOM} PER ROOM`,
  '6 LANGUAGES',
  'PLAY IN 10s',
];
