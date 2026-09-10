import { dictionaryFloor } from '@/lib/seo/dictionaryStats';
import type { LocaleContent } from '../_englishLearner/types';

export const en: LocaleContent = {
  metaTitle: 'English Games for Adults — Workplace Vocab, Register | LexiClash',
  metaDescription:
    'English games for an adult ESL class: learners join from phones with a six-character code, the board goes on the projector, and you set Support, Core or Challenge per person. Workplace verbs, register, conversation starters, six languages, free for 3 classes of 50.',
  ogTitle: 'English Games for Adults',
  ogDescription: 'Teacher-led English games for adult classrooms. Workplace collocations, a shared board, six dictionaries.',
  twitterDescription: 'Free English games for adult ESL. Live class, workplace vocab, 6 languages, no student accounts.',
  heroTag: '★ Adult ESL ★ Free To Start ★',
  heroH1: { highlight: 'English Games for Adults', rest1: 'in the', rest2: 'workplace class.' },
  heroSubtitle:
    'Teacher-led English games for adult rooms. You paste workplace verbs and collocations, the group joins from phones, and the projector shows the board. Six dictionaries, no student accounts, and a per-learner tier so a mixed evening class still plays together.',
  ctaLabel: 'Create Free Classroom',
  heroCtas: {
    primary: '▶ Run an Adult Class Game',
    primaryNote: 'Whole group · 5 minutes',
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
      heading: 'Which dictionary a workplace English answer is checked against',
      answer: `English answers are checked against a dictionary of over ${dictionaryFloor('en', 'en')} words, not a short teaching list. Spanish, Swedish, Hebrew, Russian and Japanese each carry their own: over ${dictionaryFloor('es', 'en')}, ${dictionaryFloor('sv', 'en')}, ${dictionaryFloor('he', 'en')}, ${dictionaryFloor('ru', 'en')} and ${dictionaryFloor('ja', 'en')} hiragana words.`,
      points: [
        'A learner who finds a real English collocation — even one that was not on this week’s workplace list — still gets credit.',
        'Your custom list still drives the drills, so the meeting verbs and register phrases are what get repeated.',
        'Six languages ship with their own dictionary: English, Hebrew, Swedish, Japanese, Spanish, and Russian.',
      ],
    },
    {
      heading: 'Setting the difficulty for a mixed evening class',
      answer:
        'The board has three sizes — 5x5, 6x6 and 7x7 — and you set round length and minimum word length. Each adult also carries Support, Core or Challenge, so the shared board asks different things of a beginner and a fluent colleague without splitting the room.',
      points: [
        'A round defaults to the 6x6 board and a three-letter minimum; raise it when the list is longer workplace stems.',
        'Round length is set in minutes by the teacher and defaults to three minutes.',
        'The free tier covers 3 classes of 50 students each; Teacher Pro is $9/month for unlimited classes and reports.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} ways an adult can drill one workplace list',
    intro:
      'The same workplace list reaches an adult learner in {count} different shapes. {live} of them are live class modes; the other {practice} are solo drills, six of which target a single skill — definitions, synonyms, antonyms, context clues, multiple meanings, and roots and affixes — so a collocation is met in more than one form.',
    liveLabel: '{live} live class modes',
    practiceLabel: '{practice} solo drills, by skill',
  },
  workflow: {
    heading: 'One evening slot, start to finish',
    intro:
      'The loop fits in the last ten minutes of an evening class. You paste eight to twelve workplace verbs, put a code on the projector, and the group plays from phones while you keep the controls — including a pause when a register discussion starts.',
    steps: [
      { when: '0:00', what: 'Paste this week’s workplace list — meeting verbs, email phrases, polite refusals.' },
      { when: '0:30', what: 'Pick Classic or Word Hunt and a three-minute round. The join code goes on the board.' },
      { when: '1:00', what: 'Adults open the browser and type six characters. No email, no account.' },
      { when: '2:00', what: 'Play. Pause if a collocation needs a register note, add thirty seconds, or skip a word.' },
      { when: '8:00', what: 'Read the missed phrases out together, then set anyone who stumbled on false friends to Support.' },
    ],
  },
  arcadeNote: {
    heading: 'When a student arcade is the better tool',
    body: 'This page is built for one case: a teacher running a round for an adult room. If what you want is dozens of self-serve mini-games at home, a library site is broader than we are. Come back here when you need the whole group on one board with the controls in your hand.',
    href: 'https://7esl.com/word-games/',
    cta: '7ESL word games',
  },
  faqTitle: 'Frequently Asked Questions',
  features: [
    { icon: 'globe', text: 'Six dictionaries, including English judged as English — not a translated list' },
    { icon: 'users', text: 'Whole-class live play; adults join with a six-character code from a phone' },
    { icon: 'timer', text: 'Three-minute rounds that fit the end of an evening class' },
    { icon: 'book', text: 'Paste workplace verbs, collocations, email phrases, or conversation starters' },
    { icon: 'monitor', text: 'Works on phones, laptops and the classroom projector' },
    { icon: 'lock', text: 'No student accounts. Free tier covers 3 classes of 50' },
  ],
  proficiencyLevels: [
    { tag: 'Support', title: 'Finding the phrase', desc: 'Shorter workplace words, a longer timer, and a visible word bank so a new arrival still scores.' },
    { tag: 'Core', title: 'On the job list', desc: 'Mixed collocations, standard timer. The shared 6x6 board is enough for a mixed evening room.' },
    { tag: 'Challenge', title: 'Register and tone', desc: 'Longer collocations and a tighter timer, still on the same board so nobody is pulled out.' },
  ],
  sections: {
    builtFor: 'Built for workplace English classes.',
    setLevelPerClass: 'Set the level per class.',
    ctaHeading: 'Twenty minutes left in class?',
    ctaSubtitle: 'Run a workplace vocab round.',
    ctaPrimaryButtonLabel: '▶ Start Adult Class Game',
    ctaSecondaryButtonLabel: 'Back to Education',
  },
  faqs: [
    {
      q: 'Which English games work with adult learners?',
      a: 'Timed letter-grid games built around workplace vocabulary. Adults find collocations, meeting verbs and conversation starters on a shared board while you keep the round length and the minimum word length. Pause when a register question comes up — the board can wait.',
    },
    {
      q: 'Do adults need an account?',
      a: 'No. They join with a six-character code from a phone or laptop. Accounts stay with the teacher. The free tier covers 3 classes of 50.',
    },
    {
      q: 'Can I drill workplace English and register?',
      a: 'Yes. Paste this week’s meeting verbs, email phrases or polite refusals. Live rounds still score any real English word the dictionary knows, so a learner who spots a real collocation that was not on the sheet still gets credit.',
    },
    {
      q: 'How do I run a mixed-ability evening class?',
      a: 'One shared board, three tiers. Support sees a word bank; Challenge hunts longer collocations on the same grid. Nobody is sent to a different room, which matters when the group only meets once a week.',
    },
    {
      q: 'Can the interface stay in the learner’s language?',
      a: 'Yes. The interface can stay in Spanish, Hebrew, Swedish, Japanese or Russian while the round is judged in English. Hebrew is right-to-left, including the board.',
    },
    {
      q: 'Where does an adult class start?',
      a: 'Open the classroom game, paste eight workplace phrases, put the code on the projector. Five minutes is enough for a first round at the end of an evening session.',
    },
  ],
};
