// Same value as JoinCodeField's JOIN_CODE_LENGTH; that module is 'use client', so a server
// page can't read the number from it (lib/seo/educationJsonLd.ts keeps its own copy too).
export const JOIN_CODE_LENGTH = 6;

export const BASE_URL = 'https://www.lexiclash.live';
export const PAGE_PATH = '/lexiclash-join';
export const CANONICAL = `${BASE_URL}/en${PAGE_PATH}`;

export const faqs = [
  {
    q: 'How do I join a LexiClash game?',
    a: `Open the join page, type the ${JOIN_CODE_LENGTH}-character code your teacher shows on the board, pick a nickname and tap GO. If your teacher shows a QR code, scan it with your phone camera and the code is filled in for you.`,
  },
  {
    q: 'Do I need an account to join?',
    a: 'No. You can join as a guest with just a nickname. If you already have a LexiClash account and are signed in, you join under your own name.',
  },
  {
    q: 'Where do I find the LexiClash code?',
    a: 'Your teacher, or the friend hosting the game, sees the code on their screen when they start a room. It is usually projected on the board or shared in the class chat as a link.',
  },
  {
    q: 'My code is not working. What now?',
    a: `Check that you typed all ${JOIN_CODE_LENGTH} characters, then ask the host whether the game is still open. A code stops working once the host ends the game.`,
  },
  {
    q: 'Can I play on a phone?',
    a: 'Yes. LexiClash runs in the browser on phones, tablets, Chromebooks and laptops, with nothing to install.',
  },
];
