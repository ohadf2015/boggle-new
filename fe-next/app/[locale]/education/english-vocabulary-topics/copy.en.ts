import { dictionaryFloor } from '@/lib/seo/dictionaryStats';
import type { LocaleContent } from '../_englishLearner/types';

export const en: LocaleContent = {
  metaTitle: 'English Vocabulary by Topic — Food, Animals, Travel, School | LexiClash',
  metaDescription:
    'English vocabulary by topic: paste a food, animals, travel or school list, run it as a live classroom game or a Word Hunt, and set Support, Core or Challenge per student. Six languages, no student accounts, free for 3 classes of 50.',
  ogTitle: 'English Vocabulary by Topic',
  ogDescription: 'Playable English word lists for food, animals, travel and school. Live class, six dictionaries.',
  twitterDescription: 'English vocabulary by topic. Food, animals, travel, school — playable lists, 6 languages.',
  heroTag: '★ Topic lists ★ Free To Start ★',
  heroH1: { highlight: 'English Vocabulary', rest1: 'by', rest2: 'Topic.' },
  heroSubtitle:
    'Playable English word lists for food, animals, travel and school. You paste the topic, the class joins from phones, and the projector shows the board. Six dictionaries, no student accounts, and a per-student tier so mixed ability still plays together.',
  ctaLabel: 'Create Free Classroom',
  heroCtas: {
    primary: '🔍 Play a Topic Hunt',
    primaryNote: 'Solo or class · 3 minutes',
    secondary: '▶ Run it for the class',
    secondaryNote: 'Whole class · 5 minutes',
  },
  related: {
    label: 'Related education resources',
    vocabulary: '→ Classroom Vocabulary Games',
    teachers: '→ ESL Word Games',
    hub: '→ Education Hub',
  },
  depth: [
    {
      heading: 'Which dictionary a topic word is checked against',
      answer: `English answers are checked against a dictionary of over ${dictionaryFloor('en', 'en')} words, so bread, tiger, passport and pencil are real entries, not a flashcard deck. Spanish, Swedish, Hebrew, Russian and Japanese each carry their own: over ${dictionaryFloor('es', 'en')}, ${dictionaryFloor('sv', 'en')}, ${dictionaryFloor('he', 'en')}, ${dictionaryFloor('ru', 'en')} and ${dictionaryFloor('ja', 'en')} hiragana words.`,
      points: [
        'A learner who finds a real topic word gets credit even when it was not on this week’s list.',
        'Your custom list still drives the drills, so food, animals, travel or school is what gets repeated.',
        'Six languages ship with their own dictionary: English, Hebrew, Swedish, Japanese, Spanish, and Russian.',
      ],
    },
    {
      heading: 'Turning a topic list into a live round',
      answer:
        'The board has three sizes — 5x5, 6x6 and 7x7 — and you set round length and minimum word length. Each student also carries Support, Core or Challenge, so the shared board can ask bread of one child and recipe of another.',
      points: [
        'A round defaults to the 6x6 board and a three-letter minimum.',
        'Word Hunt runs the same topic list without opening a classroom.',
        'The free tier covers 3 classes of 50 students each; Teacher Pro is $9/month for unlimited classes and reports.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} ways to drill one topic list',
    intro:
      'The same food or travel list reaches a learner in {count} different shapes. {live} of them are live class modes; the other {practice} are solo drills, six of which target a single skill — definitions, synonyms, antonyms, context clues, multiple meanings, and roots and affixes.',
    liveLabel: '{live} live class modes',
    practiceLabel: '{practice} solo drills, by skill',
  },
  workflow: {
    heading: 'Ten minutes, start to finish',
    intro:
      'The whole loop fits in the last ten minutes of a topic lesson. You paste twelve food, animal, travel or school words, put a code on the projector, and the class plays from phones while you keep the controls.',
    steps: [
      { when: '0:00', what: 'Paste this week’s topic — food, animals, travel or school.' },
      { when: '0:30', what: 'Pick Word Hunt or Classic. The join code goes on the board.' },
      { when: '1:00', what: 'Students open the browser and type six characters. No email, no account.' },
      { when: '2:00', what: 'Play. Pause, add thirty seconds, or skip a word from your screen.' },
      { when: '8:00', what: 'Read the missed topic words, then set anyone who stalled to Support.' },
    ],
  },
  arcadeNote: {
    heading: 'When a student arcade is the better tool',
    body: 'This page is built for a teacher running one topic list with a room. If what you want is dozens of self-serve mini-games, a library site is broader than we are. Come back here when you need food, animals, travel or school on one board with the controls in your hand.',
    href: 'https://7esl.com/word-games/',
    cta: '7ESL word games',
  },
  faqTitle: 'Frequently Asked Questions',
  features: [
    { icon: 'globe', text: 'Six dictionaries; topic words are judged as English, not a translated picture card' },
    { icon: 'users', text: 'Whole-class live play, or a quiet Word Hunt on one list' },
    { icon: 'timer', text: 'Three-minute rounds that fit a topic slot' },
    { icon: 'book', text: 'Paste food, animals, travel or school lists — or your own' },
    { icon: 'monitor', text: 'Phones, Chromebooks and the classroom projector' },
    { icon: 'lock', text: 'No student accounts. Free tier covers 3 classes of 50' },
  ],
  proficiencyLevels: [
    { tag: 'Support', title: 'Picture words', desc: 'Short topic words, a longer timer, a visible word bank.' },
    { tag: 'Core', title: 'On the list', desc: 'Mixed topic lengths, standard timer. The shared 6x6 board is enough.' },
    { tag: 'Challenge', title: 'Off-list finds', desc: 'Longer topic words and a tighter timer, still on the same board.' },
  ],
  sections: {
    builtFor: 'Built for topic vocabulary.',
    setLevelPerClass: 'Set the level per class.',
    ctaHeading: 'Five minutes left?',
    ctaSubtitle: 'Run a topic list round.',
    ctaPrimaryButtonLabel: '▶ Start Topic Game',
    ctaSecondaryButtonLabel: 'Back to Education',
  },
  faqs: [
    {
      q: 'Which English topics can I play as a word list?',
      a: 'Food, animals, travel and school ship as starter lists on this page. Paste any of them into a classroom game or Word Hunt. Live rounds still score any real English word the dictionary knows, so a student who finds bread on a food round gets credit even if you had written toast.',
    },
    {
      q: 'Do students need an account?',
      a: 'No. They join with a six-character code. Accounts stay with the teacher. The free tier covers 3 classes of 50.',
    },
    {
      q: 'Can I mix two topics?',
      a: 'Yes. Paste food and travel together if that is this week’s unit. The board does not care; the dictionary still judges English.',
    },
    {
      q: 'How do I keep mixed ability on one topic?',
      a: 'One shared board, three tiers. Support sees the bank; Challenge hunts longer topic words on the same grid.',
    },
    {
      q: 'Can the interface stay in Spanish?',
      a: 'Yes. Spanish, Hebrew, Swedish, Japanese or Russian on the chrome, English on the board. Hebrew is right-to-left throughout.',
    },
    {
      q: 'Where do I start?',
      a: 'Copy a food, animals, travel or school list from this page, open Word Hunt or the classroom game, paste it. Five minutes is enough.',
    },
  ],
  topics: {
    title: 'Playable topic lists',
    intro: 'Paste any group into a classroom game or Word Hunt. These are English words the dictionary already knows.',
    groups: [
      { label: 'Food', words: ['bread', 'apple', 'rice', 'cheese', 'water', 'sugar', 'lemon', 'onion', 'pasta', 'honey'] },
      { label: 'Animals', words: ['tiger', 'horse', 'whale', 'mouse', 'eagle', 'snake', 'sheep', 'camel', 'panda', 'wolf'] },
      { label: 'Travel', words: ['train', 'hotel', 'ticket', 'passport', 'airport', 'map', 'luggage', 'bridge', 'beach', 'taxi'] },
      { label: 'School', words: ['pencil', 'desk', 'teacher', 'lesson', 'book', 'ruler', 'paper', 'board', 'class', 'exam'] },
    ],
  },
};
