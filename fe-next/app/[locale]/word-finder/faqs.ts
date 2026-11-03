export const faqs = [
  {
    q: 'How do I find words with letters in certain positions?',
    a: 'Type a pattern with one character per letter of the word: a letter where you know it and an underscore (_) where you do not. For example, c_a_e finds 5-letter words that start with c, have a in the middle and end in e, such as crane, crate and chase. You can use ? or . instead of _ if that is easier to type.',
  },
  {
    q: 'Can I use my letters and a pattern together?',
    a: 'Yes. Letters in the pattern count as already on the board, so your own letters only have to fill the underscores. With the pattern c_a_e and the letters r, t and n, the finder returns crane and crate but not chase, because you have no h.',
  },
  {
    q: 'How do blank tiles work?',
    a: 'Add a ? to your letters for each blank tile you hold, up to three. A blank can stand for any letter, so retain? finds 7-letter words such as certain, nastier and retains, each using all six of your letters plus one more.',
  },
  {
    q: 'What is the difference between a word finder and an anagram solver?',
    a: 'An anagram solver only rearranges the letters you give it. A word finder also lets you fix letters in exact spots, require a start or end, set a length and use blanks, which is what you need for crosswords, Wordle-style guesses and building off tiles already on a Scrabble board.',
  },
  {
    q: 'Which dictionary does the word finder use?',
    a: 'It uses the same English word list LexiClash uses to accept words in its games, about 275,000 words including many rare Scrabble words. It is not guaranteed to match the official list your game or club uses (NWL or Collins Scrabble Words), so check a rare word there before you play it.',
  },
  {
    q: 'Why does it say "showing first 500"?',
    a: 'A loose search, such as a 6-letter pattern with no letters fixed, can match thousands of words. The finder returns the first 500, longest first. Add a letter to the pattern, a starting letter or your rack to narrow it down.',
  },
  {
    q: 'Is the word finder free?',
    a: 'Yes. It is free, works in any browser and needs no account.',
  },
];
