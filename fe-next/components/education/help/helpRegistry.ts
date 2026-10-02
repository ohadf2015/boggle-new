import type { HelpArticleMeta, HelpCategoryId, HelpNextStepId } from './helpTypes';

export const HELP_PATH = '/education/help';

export const HELP_UPDATED = '2026-10-02';

export const HELP_CATEGORY_STYLE: Record<
  HelpCategoryId,
  { accent: 'lime' | 'pink' | 'cyan' | 'purple' | 'yellow' | 'orange'; badge: string }
> = {
  gettingStarted: { accent: 'lime', badge: '/mascot/teacher/badge-coach.webp' },
  liveGame: { accent: 'pink', badge: '/mascot/teacher/badge-go-live.webp' },
  assign: { accent: 'cyan', badge: '/mascot/teacher/badge-planner.webp' },
  reports: { accent: 'yellow', badge: '/mascot/teacher/badge-trophy.webp' },
  wordLists: { accent: 'purple', badge: '/mascot/teacher/badge-word-juggler.webp' },
  privacy: { accent: 'cyan', badge: '/mascot/teacher/sticker-cool.webp' },
  billing: { accent: 'orange', badge: '/mascot/teacher/badge-streak.webp' },
};

export const HELP_ARTICLES: HelpArticleMeta[] = [
  { slug: 'create-teacher-account', category: 'gettingStarted', kind: 'article', minutes: 2, next: 'startClass', related: ['create-a-class', 'start-a-live-game'], howTo: true },
  { slug: 'create-a-class', category: 'gettingStarted', kind: 'article', minutes: 2, next: 'startClass', related: ['how-students-join', 'assign-homework'], howTo: true },
  { slug: 'start-a-live-game', category: 'liveGame', kind: 'article', minutes: 3, next: 'liveGame', related: ['how-students-join', 'run-the-room'], howTo: true },
  { slug: 'how-students-join', category: 'liveGame', kind: 'article', minutes: 2, next: 'liveGame', related: ['student-privacy', 'start-a-live-game'], howTo: true },
  { slug: 'choose-a-game-mode', category: 'liveGame', kind: 'article', minutes: 3, next: 'liveGame', related: ['run-the-room', 'make-a-word-list'], howTo: false },
  { slug: 'run-the-room', category: 'liveGame', kind: 'article', minutes: 3, next: 'liveGame', related: ['after-the-game', 'choose-a-game-mode'], howTo: true },
  { slug: 'assign-homework', category: 'assign', kind: 'article', minutes: 3, next: 'startClass', related: ['make-a-word-list', 'read-class-reports'], howTo: true },
  { slug: 'read-class-reports', category: 'reports', kind: 'article', minutes: 3, next: 'upgrade', related: ['after-the-game', 'teacher-pro-and-trial'], howTo: false },
  { slug: 'after-the-game', category: 'reports', kind: 'article', minutes: 2, next: 'liveGame', related: ['read-class-reports', 'reteach-missed-words'], howTo: false },
  { slug: 'make-a-word-list', category: 'wordLists', kind: 'article', minutes: 3, next: 'liveGame', related: ['use-the-library', 'assign-homework'], howTo: true },
  { slug: 'use-the-library', category: 'wordLists', kind: 'article', minutes: 2, next: 'liveGame', related: ['make-a-word-list', 'start-a-live-game'], howTo: true },
  { slug: 'student-privacy', category: 'privacy', kind: 'article', minutes: 3, next: 'startClass', related: ['how-students-join', 'support-core-challenge'], howTo: false },
  { slug: 'support-core-challenge', category: 'privacy', kind: 'article', minutes: 2, next: 'startClass', related: ['assign-homework', 'student-privacy'], howTo: true },
  { slug: 'teacher-pro-and-trial', category: 'billing', kind: 'article', minutes: 3, next: 'upgrade', related: ['cancel-or-change-plan', 'school-pays'], howTo: false },
  { slug: 'cancel-or-change-plan', category: 'billing', kind: 'article', minutes: 2, next: 'upgrade', related: ['teacher-pro-and-trial', 'school-pays'], howTo: true },
  { slug: 'school-pays', category: 'billing', kind: 'article', minutes: 2, next: 'schools', related: ['teacher-pro-and-trial', 'cancel-or-change-plan'], howTo: true },
  { slug: 'first-live-game-in-5-minutes', category: 'liveGame', kind: 'tutorial', minutes: 5, next: 'liveGame', related: ['start-a-live-game', 'how-students-join'], howTo: true },
  { slug: 'five-minute-vocab-warm-up', category: 'liveGame', kind: 'tutorial', minutes: 5, next: 'liveGame', related: ['choose-a-game-mode', 'use-the-library'], howTo: true },
  { slug: 'homework-in-3-minutes', category: 'assign', kind: 'tutorial', minutes: 3, next: 'startClass', related: ['assign-homework', 'make-a-word-list'], howTo: true },
  { slug: 'reteach-missed-words', category: 'reports', kind: 'tutorial', minutes: 5, next: 'liveGame', related: ['after-the-game', 'read-class-reports'], howTo: true },
];

export const HELP_SLUGS = HELP_ARTICLES.map((a) => a.slug);

export function getHelpArticleMeta(slug: string): HelpArticleMeta | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

export function helpArticlesIn(category: HelpCategoryId): HelpArticleMeta[] {
  return HELP_ARTICLES.filter((a) => a.category === category && a.kind === 'article');
}

export const HELP_TUTORIALS = HELP_ARTICLES.filter((a) => a.kind === 'tutorial');

/** The four questions a teacher asks first, surfaced as chips under the search box. */
export const HELP_POPULAR = ['start-a-live-game', 'how-students-join', 'assign-homework', 'teacher-pro-and-trial'];

export function helpNextStepHref(locale: string, next: HelpNextStepId): string {
  switch (next) {
    case 'startClass':
      return `/${locale}/teacher`;
    case 'liveGame':
      return `/${locale}/education/classroom-game`;
    case 'upgrade':
      return `/${locale}/teacher/upgrade`;
    case 'schools':
      return `/${locale}/education/for-schools`;
  }
}

export function helpArticleHref(locale: string, slug: string): string {
  return `/${locale}${HELP_PATH}/${slug}`;
}
