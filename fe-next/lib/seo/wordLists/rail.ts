import { getCatalog } from './catalog';
import type { ListLang } from './model';
import { LISTS_PATH, gradeHubPath, langHubPath, pickLocale, topicHubPath } from './paths';
import type { TopicId } from './topics';
import { gradeLabel, langName, topicLabel, tr, wordsIn } from './i18n';

export interface RailLink {
  href: string;
  label: string;
}

type Target = { grade: number } | { topic: TopicId };

/** Which word lists each landing page's reader is most likely looking for. English grades. */
const TARGETS: Record<string, Target[]> = {
  'vocabulary-games-classroom': [{ topic: 'animals' }, { topic: 'food' }, { topic: 'school' }],
  'esl-word-games': [{ grade: 1 }, { grade: 2 }, { grade: 3 }, { topic: 'verbs' }],
  'games-for-teachers': [{ topic: 'animals' }, { topic: 'science' }, { topic: 'math' }],
  'for-schools': [{ topic: 'academic' }, { topic: 'science' }, { topic: 'history' }],
  'spelling-bee-practice': [{ grade: 3 }, { grade: 4 }, { grade: 5 }, { topic: 'adjectives' }],
  'sight-words-practice': [{ grade: 1 }, { grade: 2 }, { topic: 'everyday-words' }],
  'brain-breaks-word-games': [{ topic: 'animals' }, { topic: 'emotions' }, { topic: 'food' }],
  'indoor-recess-games': [{ topic: 'animals' }, { topic: 'food' }, { topic: 'body' }],
  'early-finishers-activities': [{ topic: 'academic' }, { topic: 'science' }, { grade: 4 }],
  'first-day-of-school-icebreakers': [{ topic: 'school' }, { topic: 'family' }, { topic: 'emotions' }],
  'end-of-year-classroom-activities': [{ topic: 'weather-seasons' }, { topic: 'school' }, { topic: 'everyday-words' }],
  'middle-school-word-games': [{ grade: 6 }, { grade: 7 }, { grade: 8 }],
  'english-games-elementary': [{ grade: 1 }, { grade: 2 }, { grade: 3 }, { grade: 4 }, { grade: 5 }],
  'english-games-middle-school': [{ grade: 6 }, { grade: 7 }, { grade: 8 }, { topic: 'academic' }],
  'english-games-adults': [{ topic: 'academic' }, { grade: 10 }, { grade: 11 }, { grade: 12 }],
  'irregular-verbs-games': [{ topic: 'verbs' }, { grade: 3 }, { grade: 7 }],
  'english-vocabulary-topics': [
    { topic: 'animals' },
    { topic: 'food' },
    { topic: 'school' },
    { topic: 'body' },
    { topic: 'home' },
  ],
};

const RAIL_LOCALES = new Set(['en', 'he', 'es', 'sv', 'ja']);
const MAX = 6;

export function wordListRail(slug: string, locale: string): RailLink[] {
  if (!RAIL_LOCALES.has(locale)) return [];
  const c = getCatalog();
  const out: RailLink[] = [];
  const push = (href: string, label: string) => {
    if (out.length < MAX && !out.some((o) => o.href === href)) out.push({ href, label });
  };

  for (const t of TARGETS[slug] ?? []) {
    if (out.length >= MAX - 2) break;
    if ('grade' in t) {
      const hub = c.gradeHubs.find((h) => h.lang === 'en' && h.grade === t.grade);
      if (!hub) continue;
      push(
        `/${pickLocale(hub.locales, locale)}${gradeHubPath('en', hub.grade)}`,
        tr(locale, 'hub.gradeTitle', {
          grade: gradeLabel(locale, hub.grade),
          language: langName(locale, 'en'),
          wordsIn: wordsIn(locale, 'en'),
        }),
      );
    } else {
      const hub = c.topicHubs.find((h) => h.topic === t.topic);
      if (!hub) continue;
      push(
        `/${pickLocale(hub.locales, locale)}${topicHubPath(hub.topic)}`,
        tr(locale, 'hub.topicTitle', { topic: topicLabel(locale, hub.topic) }),
      );
    }
  }

  const ownLang = c.langHubs.find((h) => h.lang === (locale as ListLang) && h.lang !== 'en');
  for (const hub of [ownLang, c.langHubs.find((h) => h.lang === 'en')]) {
    if (hub) push(`/${pickLocale(hub.locales, locale)}${langHubPath(hub.lang)}`, tr(locale, `hub.langTitle.${hub.lang}`));
  }
  push(`/${locale}${LISTS_PATH}`, tr(locale, 'nav.lists'));
  return out;
}
