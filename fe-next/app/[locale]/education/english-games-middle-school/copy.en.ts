import { dictionaryFloor } from '@/lib/seo/dictionaryStats';
import type { LocaleContent } from '../_englishLearner/types';

export const en: LocaleContent = {
  metaTitle: 'English Games for Middle School — Academic Vocab, Duels | LexiClash',
  metaDescription:
    'English games for a middle-school ESL class: teens join from phones with a six-character code, the board goes on the projector, and you set Support, Core or Challenge per student. Academic vocabulary, live duels, six languages, free for 3 classes of 50.',
  ogTitle: 'English Games for Middle School',
  ogDescription: 'Teacher-led English games for teen classrooms. Academic vocab, a shared board, live duels, six dictionaries.',
  twitterDescription: 'Free English games for middle-school ESL. Live class, duels, 6 languages, no student accounts.',
  heroTag: '★ Middle School ESL ★ Free To Start ★',
  heroH1: { highlight: 'English Games', rest1: 'for', rest2: 'Middle School.' },
  heroSubtitle:
    'Teacher-led English games for teen classrooms. You paste academic vocabulary, the class joins from phones, and the projector shows the board. Live duels, six dictionaries, no student accounts, and a per-student tier so a mixed Year 7 still plays together.',
  ctaLabel: 'Create Free Classroom',
  heroCtas: {
    primary: '▶ Run a Middle-School Game',
    primaryNote: 'Whole class · 5 minutes',
    secondary: '⚔ Open a Duel',
    secondaryNote: 'Two-by-two practice',
  },
  related: {
    label: 'Related education resources',
    vocabulary: '→ ESL Word Games',
    teachers: '→ Games for Teachers',
    hub: '→ Education Hub',
  },
  depth: [
    {
      heading: 'Which dictionary an academic English answer is checked against',
      answer: `English answers are checked against a dictionary of over ${dictionaryFloor('en', 'en')} words, not a short teaching list. Spanish, Swedish, Hebrew, Russian and Japanese each carry their own: over ${dictionaryFloor('es', 'en')}, ${dictionaryFloor('sv', 'en')}, ${dictionaryFloor('he', 'en')}, ${dictionaryFloor('ru', 'en')} and ${dictionaryFloor('ja', 'en')} hiragana words.`,
      points: [
        'A teen who finds a real English word — including a science term that was not on the sheet — still gets credit.',
        'Your academic list still drives the drills, so prefixes, roots and this week’s unit words are what get repeated.',
        'Six languages ship with their own dictionary: English, Hebrew, Swedish, Japanese, Spanish, and Russian.',
      ],
    },
    {
      heading: 'Keeping a mixed Year 7 on one board',
      answer:
        'The board has three sizes — 5x5, 6x6 and 7x7 — and you set round length and minimum word length. Each student also carries Support, Core or Challenge, so the shared board asks different things of different teens without splitting the room.',
      points: [
        'A round defaults to the 6x6 board and a three-letter minimum; raise the minimum when the unit is longer stems.',
        'Round length is set in minutes by the teacher and defaults to three minutes.',
        'The free tier covers 3 classes of 50 students each; Teacher Pro is $9/month for unlimited classes and reports.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} ways a teen can drill one academic list',
    intro:
      'A middle-school English list can reach a teen in {count} different shapes. {live} of them are live class modes, including a duel for two; the other {practice} are solo drills, six of which target a single skill — definitions, synonyms, antonyms, context clues, multiple meanings, and roots and affixes.',
    liveLabel: '{live} live class modes',
    practiceLabel: '{practice} solo drills, by skill',
  },
  workflow: {
    heading: 'A twelve-minute academic round',
    intro:
      'The loop fits between a reading and the bell. You paste eight to fifteen academic words, put a code on the projector, and the class plays from phones — or you open a duel for two while the rest watch the board.',
    steps: [
      { when: '0:00', what: 'Paste this week’s academic list — prefixes, roots, science or history terms.' },
      { when: '0:30', what: 'Pick Classic for the whole room, or send two students into a duel. The join code goes on the board.' },
      { when: '1:00', what: 'Teens open the browser and type six characters. No email, no account.' },
      { when: '2:00', what: 'Play. Pause for a root, add thirty seconds, or skip a word from your screen.' },
      { when: '10:00', what: 'Read the missed stems out together, then set fast finishers to Challenge.' },
    ],
  },
  arcadeNote: {
    heading: 'When a student arcade is the better tool',
    body: 'This page is built for one case: a teacher running a round for a teen room. If what you want is dozens of self-serve mini-games, a library site is broader than we are. Come back here when you need the whole class on one board — or two students in a duel — with the controls in your hand.',
    href: 'https://7esl.com/word-games/',
    cta: '7ESL word games',
  },
  faqTitle: 'Frequently Asked Questions',
  features: [
    { icon: 'globe', text: 'Six dictionaries, including English judged as English — not a translated list' },
    { icon: 'users', text: 'Whole-class live play plus two-by-two duels; teens join with a six-character code' },
    { icon: 'zap', text: 'Short competitive rounds that hold a Year 7 without a points-only quiz' },
    { icon: 'book', text: 'Paste prefixes, roots, science terms, or this week’s unit list' },
    { icon: 'monitor', text: 'Works on phones, Chromebooks and the classroom projector' },
    { icon: 'graduation', text: 'Support, Core and Challenge on one shared board so nobody is pulled out' },
  ],
  proficiencyLevels: [
    { tag: 'Support', title: 'Building the stem', desc: 'Shorter academic words, a longer timer, and a visible word bank so a quiet Year 7 still scores.' },
    { tag: 'Core', title: 'On the unit', desc: 'Mixed stems and affixes, standard timer. The shared 6x6 board is the default.' },
    { tag: 'Challenge', title: 'Ready to duel', desc: 'Longer academic words and a tighter timer, still on the same board, or a two-player duel.' },
  ],
  sections: {
    builtFor: 'Built for teen English learners.',
    setLevelPerClass: 'Set the level per class.',
    ctaHeading: 'Bell in ten minutes?',
    ctaSubtitle: 'Run an academic vocab round.',
    ctaPrimaryButtonLabel: '▶ Start Middle-School Game',
    ctaSecondaryButtonLabel: 'Back to Education',
  },
  faqs: [
    {
      q: 'What English games work with middle-school ESL teens?',
      a: 'Timed letter-grid games and short duels. Teens hunt academic vocabulary, prefixes and roots on a shared board while you keep the round length and the minimum word length. A two-player duel gives a fast finisher somewhere to go without emptying the room.',
    },
    {
      q: 'Do teens need an account?',
      a: 'No. They join with a six-character code from a phone or Chromebook. Accounts stay with the teacher. The free tier covers 3 classes of 50.',
    },
    {
      q: 'Can I paste academic vocabulary and prefixes?',
      a: 'Yes. Paste this week’s unit words, Greek and Latin roots, or a science glossary. Live rounds still score any real English word the dictionary knows, so a teen who spots a real word that was not on the sheet still gets credit.',
    },
    {
      q: 'How do I keep a mixed Year 7 together?',
      a: 'One shared board, three tiers. Support sees a word bank; Challenge hunts longer stems on the same grid, or you open a duel for two. Nobody is sent to a different room.',
    },
    {
      q: 'Is this only for English?',
      a: 'The interface can stay in Spanish, Hebrew, Swedish, Japanese or Russian while the round is judged in English. Hebrew is right-to-left, including the board.',
    },
    {
      q: 'Where do I start with a teen class?',
      a: 'Open the classroom game, paste ten academic words, put the code on the projector. Five minutes is enough for a first round; open a duel if two students finish early.',
    },
  ],
};
