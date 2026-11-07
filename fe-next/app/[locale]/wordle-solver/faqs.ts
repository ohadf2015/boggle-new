import benchmark from '@/lib/wordleSolver/benchmark.json';

export const faqs = [
  {
    q: 'How does the Wordle solver pick the next guess?',
    a: `It keeps every answer that still fits your colors, then tries each possible guess against all of them and picks the word that splits the remaining answers into the most different color patterns. More patterns means the next row tells you more. It opens with ${benchmark.opener.toUpperCase()}.`,
  },
  {
    q: 'How good is it?',
    a: `We ran it against all ${benchmark.games.toLocaleString('en-US')} answers in the original Wordle list. It solved ${benchmark.solvedInSix.toLocaleString('en-US')} of them within six guesses and averaged ${benchmark.average} guesses per game. The best solvers anyone has published average about 3.42, so this is close to the ceiling.`,
  },
  {
    q: 'Can I use it if I already guessed a different word?',
    a: 'Yes. Type the word you actually played into the guess row, tap each tile until its color matches your game, and press Next guess. The solver only cares about the colors you got, not about which word it suggested.',
  },
  {
    q: 'What do the tile colors mean?',
    a: 'Green means the letter is in that exact spot. Yellow means the letter is in the word but in a different spot. Gray means the letter is not in the word, or not as many times as you guessed it. Tap a tile to cycle gray, yellow, green.',
  },
  {
    q: 'Is this the official Wordle site?',
    a: 'No. This helper is made by LexiClash and is not affiliated with or endorsed by The New York Times. Wordle is a trademark of The New York Times Company.',
  },
];
