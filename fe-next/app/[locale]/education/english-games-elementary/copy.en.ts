import { dictionaryFloor } from '@/lib/seo/dictionaryStats';
import type { LocaleContent } from '../_englishLearner/types';

export const en: LocaleContent = {
  metaTitle: 'English Word Games for Elementary — Teacher-Led, 6 Languages | LexiClash',
  metaDescription:
    'English word games for an elementary ESL class: young learners join from tablets with a six-character code, the board goes on the projector, and you set Support, Core or Challenge per child. Six languages, no student accounts, free for 3 classes of 50.',
  ogTitle: 'English Word Games for Elementary',
  ogDescription: 'Teacher-led English games for primary classrooms. Short words, a shared board, six dictionaries.',
  twitterDescription: 'Free English games for elementary ESL. Live class, 6 languages, no student accounts.',
  heroTag: '★ Elementary ESL ★ Free To Start ★',
  heroH1: { highlight: 'English Word Games', rest1: 'for', rest2: 'Elementary.' },
  heroSubtitle:
    'Teacher-led English games for primary classrooms. You pick a short list, the class joins from tablets, and the projector shows the board. Six dictionaries, no student accounts, and a per-child tier so a mixed Year 3 still plays together.',
  ctaLabel: 'Create Free Classroom',
  heroCtas: {
    primary: '▶ Run an Elementary Game',
    primaryNote: 'Whole class · 5 minutes',
    secondary: '🔍 Daily Word Hunt',
    secondaryNote: 'Quiet practice',
  },
  related: {
    label: 'Related education resources',
    vocabulary: '→ ESL Word Games',
    teachers: '→ Games for Teachers',
    hub: '→ Education Hub',
  },
  depth: [
    {
      heading: 'Which dictionary an English answer is checked against',
      answer: `English answers are checked against a dictionary of over ${dictionaryFloor('en', 'en')} words, not a short teaching list. Spanish, Swedish, Hebrew, Russian and Japanese each carry their own: over ${dictionaryFloor('es', 'en')}, ${dictionaryFloor('sv', 'en')}, ${dictionaryFloor('he', 'en')}, ${dictionaryFloor('ru', 'en')} and ${dictionaryFloor('ja', 'en')} hiragana words.`,
      points: [
        'A learner who finds a real English word gets credit even when it was not on this week’s list.',
        "Your custom list still drives the drills, so the week’s short words are what get repeated.",
        'Six languages ship with their own dictionary: English, Hebrew, Swedish, Japanese, Spanish, and Russian.',
      ],
    },
    {
      heading: 'Setting the difficulty for a mixed-ability room',
      answer:
        'The board has three sizes — 5x5, 6x6 and 7x7 — and you set round length and minimum word length. Each student also carries Support, Core or Challenge, so the shared board asks different things of different children.',
      points: [
        'A round defaults to the 6x6 board and a three-letter minimum.',
        'Round length is set in minutes by the teacher and defaults to three minutes.',
        'The free tier covers 3 classes of 50 students each; Teacher Pro is $9/month for unlimited classes and reports.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} ways to drill one English list',
    intro:
      'The same vocabulary list reaches a learner in {count} different shapes. {live} of them are live class modes; the other {practice} are solo drills, six of which target a single skill — definitions, synonyms, antonyms, context clues, multiple meanings, and roots and affixes.',
    liveLabel: '{live} live class modes',
    practiceLabel: '{practice} solo drills, by skill',
  },
  workflow: {
    heading: 'Ten minutes, start to finish',
    intro:
      'The whole loop fits in the last ten minutes of a primary lesson. You paste eight to twelve short words, put a code on the projector, and the class plays from tablets while you keep the controls.',
    steps: [
      { when: '0:00', what: "Paste this week's short words — CVC, colours, classroom objects." },
      { when: '0:30', what: 'Pick Classic or Word Hunt and a two-minute round. The join code goes on the board.' },
      { when: '1:00', what: 'Children open the browser and type six characters. No email, no account.' },
      { when: '2:00', what: 'Play. Pause, add thirty seconds, or skip a word from your screen.' },
      { when: '8:00', what: 'Read the missed words out together, then set anyone who struggled to Support.' },
    ],
  },
  arcadeNote: {
    heading: 'When a student arcade is the better tool',
    body: 'This page is built for one case: a teacher running a round for a primary room. If what you want is dozens of self-serve mini-games, a library site is broader than we are. Come back here when you need the whole class on one board with the controls in your hand.',
    href: 'https://7esl.com/word-games/',
    cta: '7ESL word games',
  },
  faqTitle: 'Frequently Asked Questions',
  features: [
    { icon: 'globe', text: 'Six dictionaries, including English judged as English — not a translated list' },
    { icon: 'users', text: 'Whole-class live play; children join with a six-character code' },
    { icon: 'timer', text: 'Two- and three-minute rounds that fit a phonics slot' },
    { icon: 'book', text: "Paste CVC words, colours, animals, or this week's reader list" },
    { icon: 'monitor', text: 'Works on tablets, Chromebooks and the classroom projector' },
    { icon: 'lock', text: 'No student accounts. Free tier covers 3 classes of 50' },
  ],
  proficiencyLevels: [
    { tag: 'Support', title: 'Beginners', desc: '3-letter words, longer timer, a visible word bank so early readers still score.' },
    { tag: 'Core', title: 'On track', desc: 'Mixed 3–5 letter words, standard timer. The shared 5x5 board is enough.' },
    { tag: 'Challenge', title: 'Ready for more', desc: 'Longer words and a tighter timer, still on the same board so nobody is pulled out.' },
  ],
  sections: {
    builtFor: 'Built for young English learners.',
    setLevelPerClass: 'Set the level per class.',
    ctaHeading: 'Five minutes left?',
    ctaSubtitle: 'Run a short-word round.',
    ctaPrimaryButtonLabel: '▶ Start Elementary Game',
    ctaSecondaryButtonLabel: 'Back to Education',
  },
  faqs: [
    {
      q: 'What English games work in an elementary ESL class?',
      a: 'Short, timed letter-grid games. Children find CVC words, colours and classroom objects on a shared board while you keep the round length and the minimum word length. Pair that with a no-device warm-up so early readers are not locked to the screen.',
    },
    {
      q: 'Do children need an account?',
      a: 'No. They join with a six-character code from a tablet or Chromebook. Accounts stay with the teacher. The free tier covers 3 classes of 50.',
    },
    {
      q: 'Can I use my phonics list?',
      a: "Yes. Paste this week's graphemes or reader words into a lesson list. Live rounds still score any real English word the dictionary knows, so a child who spots a real word that was not on the sheet still gets credit.",
    },
    {
      q: 'How do I keep a mixed Year 3 together?',
      a: 'One shared board, three tiers. Support sees a word bank; Challenge hunts longer words on the same grid. Nobody is sent to a different room.',
    },
    {
      q: 'Is this only for English?',
      a: 'The interface can stay in Spanish, Hebrew, Swedish, Japanese or Russian while the round is judged in English. Hebrew is right-to-left, including the board.',
    },
    {
      q: 'Where do I start as a teacher?',
      a: 'Open the classroom game, paste eight short words, put the code on the projector. Five minutes is enough for a first round.',
    },
  ],
};
