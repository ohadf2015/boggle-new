export type PracticeMode = {
  title: string;
  desc: string;
};

export type RoutineStep = {
  step: string;
  focus: string;
  activity: string;
};

export type FaqItem = {
  q: string;
  a: string;
};

export type LocaleContent = {
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  badgeText: string;
  h1Part1: string;
  h1Part2: string;
  h1Part3: string;
  h1Part4: string;
  mainParagraph: string;
  startWordHuntLabel: string;
  freeLabel: string;
  duelLabel: string;
  pairWithStudentLabel: string;
  modesHeading: string;
  modes: PracticeMode[];
  practiceNowLabel: string;
  routineHeading: string;
  routineIntro: string;
  routineItems: RoutineStep[];
  faqHeading: string;
  faqs: FaqItem[];
  bottomSectionHeading1: string;
  bottomSectionHeading2: string;
  noAppText: string;
  startPracticingLabel: string;
  seeEducationHubLabel: string;
};

export const EDUCATION_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type EducationLocale = (typeof EDUCATION_LOCALES)[number];

// EN-only landing (2026-08-21): demand evidence is a US teacher who wrote
// "site word builder" on the education-access application — a misspelling of
// SIGHT WORDS, the Dolch/Fry high-frequency-word term US parents and teachers
// search for. Unlike the sibling education landings this page ships English
// copy only; every locale renders the EN body and non-EN versions are
// noindexed in page metadata with hreflang pointing back at each locale's
// /education fallback (same shape as the sitemap's educationLandings cluster).
const content: LocaleContent = {
  metaTitle: 'Sight Words Practice Online — Free Dolch & Fry Word Games | LexiClash',
  metaDescription:
    'Free sight words practice with real games. Paste any Dolch or Fry list into a custom word list, then drill it with flashcards, word matching, spelling challenges, and whole-class word games. No student accounts, no downloads — just a browser.',
  heroTitle: 'Sight Words Practice Online. Free.',
  heroSubtitle:
    'Turn any Dolch or Fry sight-word list into games kids actually want to play — flashcards, word matching, spelling challenges, and live classroom word hunts. No student accounts, no app, no prep.',
  badgeText: '★ Dolch & Fry Sight Words ★ Free ★',
  h1Part1: 'Sight Words',
  h1Part2: 'Practice',
  h1Part3: 'That Kids',
  h1Part4: 'Ask For.',
  mainParagraph:
    'Sight words stick through repetition — and kids repeat what feels like play. LexiClash turns your Dolch or Fry list into flashcard reviews, word-matching rounds, spelling challenges, and live multiplayer word games. Works on any browser, students join with a 6-character code, and every practice mode runs on the exact words you are teaching this week.',
  startWordHuntLabel: '▶ Try the Daily Word Hunt',
  freeLabel: 'Free · in the browser',
  duelLabel: '⚔ 1v1 Word Duel',
  pairWithStudentLabel: 'Pair two students',
  modesHeading: 'Four ways to drill sight words.',
  modes: [
    {
      title: 'Flashcard Review',
      desc: 'Rapid-fire flip cards built from your own word list, with audio pronunciation per word. The classic sight-word drill — without printing a single card.',
    },
    {
      title: 'Word Matching',
      desc: 'Students match words from your list in a timed pairing game. Trains the instant whole-word recognition sight words exist for.',
    },
    {
      title: 'Spelling Challenge',
      desc: 'Kids spell each list word letter by letter in a guided challenge. Bridges recognition into writing — the step most sight-word apps skip.',
    },
    {
      title: 'Live Classroom Word Game',
      desc: 'Run a whole-class word hunt on a shared letter grid. Up to 30 students join with a 6-character code — no student accounts, no logins.',
    },
  ],
  practiceNowLabel: 'Practice now →',
  routineHeading: 'A 10-minute daily sight-word routine.',
  routineIntro:
    'Sight words are mastered by frequency, not marathon sessions. This routine uses real LexiClash modes in 10 minutes a day — built for pre-K through grade 3 readers and the adults helping them.',
  routineItems: [
    {
      step: 'Step 1',
      focus: 'Load this week\'s list',
      activity:
        'A teacher or parent pastes the week\'s Dolch or Fry words (any 5-15 words) into a custom word list in the LexiClash teacher dashboard. Bulk import takes under a minute.',
    },
    {
      step: 'Step 2',
      focus: 'Flashcard warm-up (3 min)',
      activity:
        'Run one flashcard round over the list. Students see each word, hear it with the built-in pronunciation, and flip for confirmation. Repeat only the misses.',
    },
    {
      step: 'Step 3',
      focus: 'Game round (5 min)',
      activity:
        'Play a word-matching or spelling-challenge round on the same list, or open the daily Word Hunt grid and race to spot familiar words — recognition under time pressure is the whole point of sight-word fluency.',
    },
    {
      step: 'Step 4',
      focus: 'Make it social (2 min)',
      activity:
        'Pair two students for a 1v1 word duel, or run the list as a whole-class game with a 6-character join code. Kids who beg for "one more round" are doing the repetition for you.',
    },
  ],
  faqHeading: 'Sight-words FAQ.',
  faqs: [
    {
      q: 'What are sight words, and what is the difference between Dolch and Fry lists?',
      a: 'Sight words are high-frequency English words that beginning readers learn to recognize instantly, "by sight," instead of sounding out. The Dolch list (220 words plus 95 nouns, grouped from pre-primer to grade 3) and the Fry instant-words list (1,000 words ranked by frequency, usually taught in groups of 100) are the two standard lists used in US elementary classrooms. LexiClash works with either: you paste whichever list your school uses into a custom word list, and every practice mode runs on exactly those words.',
    },
    {
      q: 'How do I practice Dolch or Fry sight words with LexiClash?',
      a: 'Create a free teacher account, open the word-list editor in the teacher dashboard, and paste or bulk-import your sight-word list — Dolch pre-primer, Fry first 100, or your own. Assign it to your class, and students practice it through flashcards, word matching, spelling challenges, warm-up rounds, and timed blitz drills. Parents can do the same at home for one child.',
    },
    {
      q: 'Do students need accounts or downloads to play?',
      a: 'No. Students join a classroom session with a 6-character code and play instantly in any browser — Chromebooks, tablets, phones, or desktops. There is no app to install and no student login to manage. Only the adult creating the word list needs an account.',
    },
    {
      q: 'Which LexiClash game modes help with sight-word recognition?',
      a: 'Sight words demand instant whole-word recognition, so the best fits are the list-driven modes: flashcard review for rapid exposure and recall, word matching for recognizing word shapes at speed, and the spelling challenge for moving from reading to writing each word. The daily Word Hunt grid adds scan-and-spot practice under time pressure, and 1v1 duels keep reluctant readers repeating words voluntarily.',
    },
    {
      q: 'Is LexiClash free for sight-word practice?',
      a: 'The word games are free to play — open the browser and start, with no per-student cost. Teachers can try the education tools (custom word lists, classroom dashboard, assignments) free for 30 days, and school plans start at $149/year.',
    },
    {
      q: 'What ages and grades is sight-word practice for?',
      a: 'Sight-word instruction typically runs from pre-K through grade 3 (roughly ages 4-9), which matches the Dolch pre-primer-to-grade-3 groupings and the first few hundred Fry words. Because you control the word list, the same modes also work for older struggling readers, ESL students, and intervention groups who need the same high-frequency words at a different pace.',
    },
    {
      q: 'Can I use it for at-home sight-word practice or homework?',
      a: 'Yes. Everything runs in the browser, so a list assigned in class can be practiced at home the same evening — no printing, no photocopied flashcards, no app install on a family device. A parent can also build their own list directly and skip the classroom flow entirely.',
    },
    {
      q: 'Does it work for ESL and English-language learners?',
      a: 'Yes. LexiClash ships with separate dictionaries for English, Hebrew, Swedish, Japanese, and Spanish, and every list word carries audio pronunciation — useful when a student is still mapping English sounds to English spellings. High-frequency-word practice is a standard early-literacy step in ESL programs for the same reason it is in first-language classrooms.',
    },
  ],
  bottomSectionHeading1: '10 minutes a day.',
  bottomSectionHeading2: 'Every sight word, by heart.',
  noAppText:
    'No app to install, no printing, no student logins. Paste a list, pick a mode, start practicing.',
  startPracticingLabel: '▶ Start Practicing',
  seeEducationHubLabel: 'See Education Hub',
};

export function getSightWordsContent(_locale: string): LocaleContent {
  // EN-only by design — every locale renders the English body; indexing is
  // gated to /en in the page metadata.
  return content;
}
