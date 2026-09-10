import { dictionaryFloor } from '@/lib/seo/dictionaryStats';
import type { LocaleContent } from '../_englishLearner/types';

export const en: LocaleContent = {
  metaTitle: 'Irregular Verb Games — Go, Went, Gone | LexiClash',
  metaDescription:
    'Irregular verb games for an ESL class: paste go/went/gone, eat/ate/eaten and see/saw/seen, students join with a six-character code, and the board goes on the projector. Support, Core or Challenge per student, six languages, free for 3 classes of 50.',
  ogTitle: 'Irregular Verb Games',
  ogDescription: 'Teacher-led irregular-verb drills. Go/went/gone on a shared board, six dictionaries, no student accounts.',
  twitterDescription: 'Free irregular verb games. Live class, go/went/gone, 6 languages, no student accounts.',
  heroTag: '★ Irregular Verbs ★ Free To Start ★',
  heroH1: { highlight: 'Irregular Verb Games', rest1: 'for', rest2: 'the classroom.' },
  heroSubtitle:
    'Teacher-led irregular-verb drills. You paste go, went, gone and the rest of this week’s stems, the class joins from tablets, and the projector shows the board. Six dictionaries, no student accounts, and a per-student tier so mixed tenses still play together.',
  ctaLabel: 'Create Free Classroom',
  heroCtas: {
    primary: '▶ Run an Irregular-Verb Round',
    primaryNote: 'Whole class · 5 minutes',
    secondary: '🔤 Spelling practice',
    secondaryNote: 'Letter-by-letter stems',
  },
  related: {
    label: 'Related education resources',
    vocabulary: '→ ESL Word Games',
    teachers: '→ Spelling Bee Practice',
    hub: '→ Education Hub',
  },
  depth: [
    {
      heading: 'Which dictionary an irregular-verb answer is checked against',
      answer: `English answers are checked against a dictionary of over ${dictionaryFloor('en', 'en')} words, not a short teaching list. Spanish, Swedish, Hebrew, Russian and Japanese each carry their own: over ${dictionaryFloor('es', 'en')}, ${dictionaryFloor('sv', 'en')}, ${dictionaryFloor('he', 'en')}, ${dictionaryFloor('ru', 'en')} and ${dictionaryFloor('ja', 'en')} hiragana words.`,
      points: [
        'A learner who finds a real English form — went, gone, eaten — gets credit even when that form was not the one on this week’s sheet.',
        'Your custom list still drives the drills, so go/went/gone and the other stems you pasted are what get repeated.',
        'Six languages ship with their own dictionary: English, Hebrew, Swedish, Japanese, Spanish, and Russian.',
      ],
    },
    {
      heading: 'Keeping present, past and participle on one board',
      answer:
        'The board has three sizes — 5x5, 6x6 and 7x7 — and you set round length and minimum word length. Each student also carries Support, Core or Challenge, so the shared board can ask one child for go and another for gone without splitting the room.',
      points: [
        'A round defaults to the 6x6 board and a three-letter minimum, which still scores go, ate and saw.',
        'Round length is set in minutes by the teacher and defaults to three minutes.',
        'The free tier covers 3 classes of 50 students each; Teacher Pro is $9/month for unlimited classes and reports.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} ways to drill one go/went/gone list',
    intro:
      'The same go/went/gone list reaches a learner in {count} different shapes. {live} of them are live class modes; the other {practice} are solo drills, six of which target a single skill — definitions, synonyms, antonyms, context clues, multiple meanings, and roots and affixes — so an irregular stem is seen more than once.',
    liveLabel: '{live} live class modes',
    practiceLabel: '{practice} solo drills, by skill',
  },
  workflow: {
    heading: 'Eight minutes of go, went, gone',
    intro:
      'The loop fits in a grammar slot. You paste this week’s irregulars — present, past and participle — put a code on the projector, and the class hunts the forms on one board while you keep the controls.',
    steps: [
      { when: '0:00', what: 'Paste this week’s stems: go/went/gone, eat/ate/eaten, see/saw/seen.' },
      { when: '0:30', what: 'Pick Classic or Spelling and a two-minute round. The join code goes on the board.' },
      { when: '1:00', what: 'Students open the browser and type six characters. No email, no account.' },
      { when: '2:00', what: 'Play. Skip a stem if the room stalls, or add thirty seconds for a tough participle.' },
      { when: '7:00', what: 'Read the missed past forms out together, then set Support on the irregulars that slipped.' },
    ],
  },
  arcadeNote: {
    heading: 'When a student arcade is the better tool',
    body: 'This page is built for one case: a teacher running an irregular-verb round for a room. If what you want is dozens of self-serve mini-games, a library site is broader than we are. Come back here when you need the whole class on one board hunting go, went and gone with the controls in your hand.',
    href: 'https://7esl.com/word-games/',
    cta: '7ESL word games',
  },
  faqTitle: 'Frequently Asked Questions',
  features: [
    { icon: 'book', text: 'Paste go/went/gone, eat/ate/eaten, see/saw/seen — any irregular list' },
    { icon: 'timer', text: 'Two-minute rounds that fit a grammar slot without eating the lesson' },
    { icon: 'users', text: 'Whole-class live play; students join with a six-character code' },
    { icon: 'zap', text: 'Present, past and participle on one shared board, not three worksheets' },
    { icon: 'monitor', text: 'Works on tablets, Chromebooks and the classroom projector' },
    { icon: 'lock', text: 'No student accounts. Free tier covers 3 classes of 50' },
  ],
  proficiencyLevels: [
    { tag: 'Support', title: 'The base form', desc: 'Shorter stems, a longer timer, and a visible word bank so go and eat still score while went is still new.' },
    { tag: 'Core', title: 'Past and participle', desc: 'Mixed go/went/gone on the same list, standard timer. The shared 6x6 board is enough.' },
    { tag: 'Challenge', title: 'The awkward ones', desc: 'Longer irregulars and a tighter timer — brought, thought, caught — still on the same board.' },
  ],
  sections: {
    builtFor: 'Built for irregular-verb drills.',
    setLevelPerClass: 'Set the level per class.',
    ctaHeading: 'Time for a verb drill?',
    ctaSubtitle: 'Run a go/went/gone round.',
    ctaPrimaryButtonLabel: '▶ Start Irregular-Verb Game',
    ctaSecondaryButtonLabel: 'Back to Education',
  },
  faqs: [
    {
      q: 'How do I practise irregular verbs with a whole class?',
      a: 'Paste the three forms — go, went, gone — into a lesson list and run a short timed round on a shared board. Students hunt the forms they know while you keep the round length and the minimum word length. Pair that with a no-device chant of the same stems so the ear gets them too.',
    },
    {
      q: 'Do students need an account?',
      a: 'No. They join with a six-character code from a tablet or Chromebook. Accounts stay with the teacher. The free tier covers 3 classes of 50.',
    },
    {
      q: 'Can I paste go/went/gone lists?',
      a: 'Yes. Paste present, past and participle together, or one column at a time. Live rounds still score any real English word the dictionary knows, so a student who spots ate while you were drilling gone still gets credit.',
    },
    {
      q: 'How do I keep present, past and participle together?',
      a: 'One shared board, three tiers. Support hunts the base form; Challenge hunts the participle on the same grid. Nobody is sent to a different room, and the three forms stay in the same round.',
    },
    {
      q: 'Is this only for English?',
      a: 'The interface can stay in Spanish, Hebrew, Swedish, Japanese or Russian while the round is judged in English. Hebrew is right-to-left, including the board. The verbs themselves stay English — they are the drill.',
    },
    {
      q: 'Where do I start a verb round?',
      a: 'Open the classroom game, paste eight irregulars in three forms, put the code on the projector. Five minutes is enough for a first go/went/gone round.',
    },
  ],
};
