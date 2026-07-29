// Content for /education/for-schools — the school/district lead-capture + commercial
// SEO + GEO page. EN is the indexed target (other locales are noindex + hreflang→EN,
// matching the /education/vocabulary-games-classroom pattern), so the marketing body
// is authored in EN. The conversion form itself is fully localized via t().

export const EDUCATION_LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
export type EducationLocale = (typeof EDUCATION_LOCALES)[number];

export interface ForSchoolsFaq {
  q: string;
  a: string;
}

export interface ForSchoolsCompareRow {
  competitor: string;
  freeTierLimit: string;
  lexiclash: string;
}

export interface ForSchoolsContent {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  heroTag: string;
  heroH1: string;
  heroHighlight: string;
  heroSubtitle: string;
  freeForeverTitle: string;
  freeForeverBody: string;
  whyTitle: string;
  why: { title: string; body: string }[];
  compareTitle: string;
  compareIntro: string;
  compareRows: ForSchoolsCompareRow[];
  comingTitle: string;
  comingIntro: string;
  coming: { title: string; body: string }[];
  leadTitle: string;
  leadIntro: string;
  faqTitle: string;
  faqs: ForSchoolsFaq[];
  closingTitle: string;
  closingCta: string;
}

const EN: ForSchoolsContent = {
  metaTitle: 'LexiClash for Schools — Free Vocabulary Games, Built to Scale',
  metaDescription:
    'A free-forever multiplayer word game for schools: 5 languages (incl. Hebrew RTL), no student logins, 1v1 duels and whole-class play. Free for every teacher. Tell us about your school for early access to district features.',
  ogTitle: 'LexiClash for Schools',
  ogDescription:
    'Free vocabulary games for every classroom — no student logins, 5 languages, 1v1 duels. Built to scale across your school or district.',
  heroTag: 'For Schools & Districts',
  heroH1: 'Vocabulary games your whole school can',
  heroHighlight: 'actually use',
  heroSubtitle:
    'LexiClash is free for every teacher — no student logins, no per-seat fee, no ads in class. 5 languages including Hebrew RTL, live whole-class play, and 1v1 word duels. When your school is ready to scale it, we are too.',
  freeForeverTitle: 'Free forever for teachers — that part never changes',
  freeForeverBody:
    'The classroom experience is free and stays free. No participant caps that break a 30-student class, no 5-student trial wall, no “upgrade to unlock the game.” Schools and districts can later license admin and analytics tooling that sits on top — but a teacher never has to pay to play with their class.',
  whyTitle: 'Why schools choose LexiClash',
  why: [
    { title: 'No student logins', body: 'Students join a class game with a code — no accounts to provision, no rostering before you can play, no student data to manage.' },
    { title: '5 languages, including Hebrew RTL', body: 'English, Hebrew (full right-to-left), Spanish, Swedish and Japanese with native dictionaries — built for bilingual, ESL and immersion classrooms.' },
    { title: '1v1 duels + whole-class', body: 'Pair students head-to-head or run a live whole-class round. Word-building gameplay, not passive multiple-choice.' },
    { title: 'Zero prep', body: 'Pick a word list, pick a mode, share the code. A 5-minute warm-up or an end-of-unit review with no setup.' },
  ],
  compareTitle: 'How the free tiers actually compare',
  compareIntro:
    'Most “free” classroom game tools cap the free tier so low it breaks a real class, then charge per teacher or per student. Here is the honest comparison.',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: 'Free tier caps live players (too few for a full class); school plans are per-teacher.', lexiclash: 'No player cap for a class game. Free.' },
    { competitor: 'Gimkit', freeTierLimit: 'Free tier limited to 5 students; school plans run $650–$1,000/yr.', lexiclash: 'No student cap. Free for the whole class.' },
    { competitor: 'Vocabulary.com', freeTierLimit: 'No real free tier — $199/classroom to start.', lexiclash: 'Free, every classroom, no card.' },
    { competitor: 'Wordwall', freeTierLimit: 'Free tier limited to a handful of activities.', lexiclash: 'Unlimited play. Free.' },
  ],
  comingTitle: 'What’s coming for schools & districts',
  comingIntro:
    'These are the things schools tell us they would pay for — layered on top of the free classroom, never gating it. Tell us which matter to you and we’ll bring you in early.',
  coming: [
    { title: 'District admin dashboard', body: 'See usage across every class and teacher in your school or district from one place.' },
    { title: 'Cross-class analytics', body: 'Cohort benchmarks, vocabulary-mastery trends and exportable reports for grading and standards.' },
    { title: 'Curriculum content libraries', body: 'Curated multilingual word sets mapped to your curriculum — across all five languages.' },
    { title: 'Ad-free school mode & SSO', body: 'A fully ad-free environment plus single sign-on (Clever / ClassLink / Google) for easy rollout.' },
  ],
  leadTitle: 'Tell us about your school',
  leadIntro:
    'Using LexiClash with your class, or thinking about rolling it out wider? Tell us about your school or district and what you need — we’ll be in touch about early access to school features (and pricing, if you ask).',
  faqTitle: 'Schools & districts — frequently asked',
  faqs: [
    { q: 'Is LexiClash really free for teachers?', a: 'Yes. The full classroom game — whole-class play, 1v1 duels, all five languages, no ads — is free for every teacher, with no participant cap and no credit card. That does not change.' },
    { q: 'Then what would a school or district pay for?', a: 'Only tooling layered on top of the free classroom: a district admin dashboard, cross-class analytics and reporting, curated curriculum content libraries, an ad-free school environment, and SSO (Clever / ClassLink / Google). The teacher-facing game itself is never gated.' },
    { q: 'Do students need accounts or logins?', a: 'No. Students join a class game with a code — nothing to provision, no student data to manage. That makes a school-wide rollout far simpler than tools that require rostering or SSO before play.' },
    { q: 'Which languages are supported?', a: 'English, Hebrew (full right-to-left support), Spanish, Swedish and Japanese, each with a native dictionary — built for ESL, bilingual and immersion classrooms.' },
    { q: 'How do we get early access to school features?', a: 'Fill in the “Tell us about your school” form on this page with your role, school or district, and rough student count. We use that to bring schools into early access and to share pricing when it’s ready.' },
    { q: 'How is this different from Kahoot, Gimkit or Quizlet?', a: 'Those are quiz/flashcard tools that cap their free tiers and are English-first. LexiClash is a word-building game (not multiple-choice), genuinely free for the whole class with no player cap, supports five languages including Hebrew RTL, and offers true 1v1 duels.' },
  ],
  closingTitle: 'Ready to bring LexiClash to your school?',
  closingCta: 'Tell us about your school',
};

export function getForSchoolsContent(_locale: string): ForSchoolsContent {
  // EN is the indexed, canonical copy; non-EN routes render the same body but are
  // noindexed (hreflang → EN). The interactive lead form is localized via t().
  return EN;
}
