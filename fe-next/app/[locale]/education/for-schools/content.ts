// Content for /education/for-schools -- the school/district lead-capture + commercial
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
  heroCta1: string;
  heroCta2: string;
  closingTitle: string;
  closingCta: string;
}

const EN: ForSchoolsContent = {
  metaTitle: 'LexiClash for Schools -- Vocabulary Games, Free Trial, Built to Scale',
  metaDescription:
    'Multiplayer vocabulary games for schools: 5 languages (incl. Hebrew RTL), no student logins, 1v1 duels and whole-class play. Free 30-day trial for teachers -- school plans from $149/year. Tell us about your school for early access.',
  ogTitle: 'LexiClash for Schools',
  ogDescription:
    'Vocabulary games for every classroom -- no student logins, 5 languages, 1v1 duels. Free trial for teachers. School plans from $149/year.',
  heroTag: 'For Schools & Districts',
  heroH1: 'Vocabulary games your whole school can',
  heroHighlight: 'actually use',
  heroSubtitle:
    'Try LexiClash free for 30 days -- no student logins, no credit card, no ads in class. 5 languages including Hebrew RTL, live whole-class play, and 1v1 word duels. Individual teachers keep basic access free after trial; school and district plans scale from there.',
  freeForeverTitle: 'Start free -- school plans from $149/year',
  freeForeverBody:
    'Every teacher gets a full 30-day trial: no student logins, no player cap, no credit card. After your trial, the basic classroom game stays free for individual teachers. School plans add admin dashboards, cross-class analytics, curriculum libraries, an ad-free environment, and SSO -- starting at $149/school/year.',
  whyTitle: 'Why schools choose LexiClash',
  why: [
    { title: 'No student logins', body: 'Students join a class game with a code -- no accounts to provision, no rostering before you can play, no student data to manage.' },
    { title: '5 languages, including Hebrew RTL', body: 'English, Hebrew (full right-to-left), Spanish, Swedish and Japanese with native dictionaries -- built for bilingual, ESL and immersion classrooms.' },
    { title: '1v1 duels + whole-class', body: 'Pair students head-to-head or run a live whole-class round. Word-building gameplay, not passive multiple-choice.' },
    { title: 'Zero prep', body: 'Pick a word list, pick a mode, share the code. A 5-minute warm-up or an end-of-unit review with no setup.' },
  ],
  compareTitle: 'How the free tiers actually compare',
  compareIntro:
    'Most "free" classroom game tools cap the free tier so low it breaks a real class, then charge per teacher or per student. Here is the honest comparison - all during our free trial.',
  compareRows: [
    { competitor: 'Kahoot', freeTierLimit: 'Free tier caps live players (too few for a full class); school plans are per-teacher.', lexiclash: 'No player cap during trial. School plans $149/year.' },
    { competitor: 'Gimkit', freeTierLimit: 'Free tier limited to 5 students; school plans run $650-$1,000/yr.', lexiclash: 'No student cap during trial. School plans from $149/year.' },
    { competitor: 'Vocabulary.com', freeTierLimit: 'No real free tier -- $199/classroom to start.', lexiclash: 'Full trial, no card. School plans from $149/year.' },
    { competitor: 'Wordwall', freeTierLimit: 'Free tier limited to a handful of activities.', lexiclash: 'Unlimited play in trial. School plans from $149/year.' },
  ],
  comingTitle: 'What school & district plans include',
  comingIntro:
    'These are the features schools tell us they need at scale -- available in school plans ($149/year), layered on top of the free classroom, never gating it.',
  coming: [
    { title: 'District admin dashboard', body: 'See usage across every class and teacher in your school or district from one place.' },
    { title: 'Cross-class analytics', body: 'Cohort benchmarks, vocabulary-mastery trends and exportable reports for grading and standards.' },
    { title: 'Curriculum content libraries', body: 'Curated multilingual word sets mapped to your curriculum -- across all five languages.' },
    { title: 'Ad-free school mode & SSO', body: 'A fully ad-free environment plus single sign-on (Clever / ClassLink / Google) for easy rollout.' },
  ],
  leadTitle: 'Tell us about your school',
  leadIntro:
    "Using LexiClash with your class, or thinking about rolling it out wider? Tell us about your school or district and what you need -- we'll be in touch about your trial, school plan pricing ($149/year), or early access to district features.",
  faqTitle: 'Schools & districts -- frequently asked',
  faqs: [
    { q: 'Is LexiClash free for teachers?', a: 'Every teacher gets a full 30-day trial: whole-class play, 1v1 duels, all five languages, no ads, no student logins, no credit card. After the trial, the basic classroom game stays free for individual teachers. School plans -- which add admin dashboards, analytics, curriculum libraries, and an ad-free environment -- start at $149/school/year.' },
    { q: 'What does a school or district plan include?', a: 'School plans ($149/year per school) add the features that scale: a district admin dashboard, cross-class analytics and reporting, curated curriculum content libraries, an ad-free school environment, and SSO (Clever / ClassLink / Google). The basic classroom game stays free -- plans layer on top, never gate it.' },
    { q: 'Do students need accounts or logins?', a: 'No. Students join a class game with a code -- nothing to provision, no student data to manage. That makes a school-wide rollout far simpler than tools that require rostering or SSO before play.' },
    { q: 'Which languages are supported?', a: 'English, Hebrew (full right-to-left support), Spanish, Swedish and Japanese, each with a native dictionary -- built for ESL, bilingual and immersion classrooms.' },
    { q: 'How do we start our trial or get a school plan?', a: 'Fill in the form on this page with your role, school or district, and rough student count. We\'ll confirm your trial access and share school plan details -- $149/year per school, district pricing on request.' },
    { q: 'How is this different from Kahoot, Gimkit or Quizlet?', a: 'Those are quiz/flashcard tools that cap their free tiers and are English-first. LexiClash is a word-building game (not multiple-choice), supports five languages including Hebrew RTL, has no player cap during the trial, and offers true 1v1 duels.' },
  ],
  heroCta1: 'Play a class game free',
  heroCta2: 'Tell us about your school',
  closingTitle: 'Ready to bring LexiClash to your school?',
  closingCta: 'Tell us about your school',
};

export function getForSchoolsContent(_locale: string): ForSchoolsContent {
  // EN is the indexed, canonical copy; non-EN routes render the same body but are
  // noindexed (hreflang → EN). The interactive lead form is localized via t().
  return EN;
}
