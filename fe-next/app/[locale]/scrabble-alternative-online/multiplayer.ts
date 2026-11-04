export const MULTIPLAYER_HEADING = 'An online multiplayer Scrabble alternative: how a room works';

export const MULTIPLAYER_INTRO =
  'Most online multiplayer Scrabble games are turn-based, so you wait for each opponent to move. A LexiClash room plays out live instead. Everyone gets the same letter grid at the same moment, and the round ends when the timer does.';

export const MULTIPLAYER_STEPS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Open a room',
    body: 'You get a room code, a link and a QR code. Send whichever is easiest.',
  },
  {
    title: 'Friends join from a browser',
    body: 'Phone, tablet or laptop, with no app and no account. One room holds up to 50 players.',
  },
  {
    title: 'The host sets the game',
    body: 'Pick a 5×5, 6×6 or 7×7 board, a round of 1, 1:30, 2 or 3 minutes (1:30 is the default), a shortest word of 2, 3 or 4 letters, and the dictionary: English, Spanish, Swedish, Japanese, Hebrew or Russian.',
  },
  {
    title: 'Everyone plays at once',
    body: 'Trace words by joining neighbouring letters. Longer words are worth more, and the scores come up as soon as the round ends.',
  },
];

export const MULTIPLAYER_FAQ = {
  q: 'Is there a free online multiplayer Scrabble alternative?',
  a: 'Yes. LexiClash is a free word game for groups that runs in the browser. One person opens a room and shares the link, code or QR, and up to 50 players join without an account. Everyone searches the same grid at the same time, so a round lasts one to three minutes instead of a full evening of turns.',
};
