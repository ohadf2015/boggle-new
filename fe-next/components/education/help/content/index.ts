import { fillHelpVars } from '../helpText';
import { HELP_FACTS } from '../helpFacts';
import type { HelpArticleText, HelpBlock, HelpLocaleContent, HelpQuickAnswer } from '../helpTypes';
import { enA } from './en.a';
import { enB } from './en.b';
import { enQuick, enT } from './en.t';
import { heA } from './he.a';
import { heB } from './he.b';
import { heQuick, heT } from './he.t';
import { svA } from './sv.a';
import { svB } from './sv.b';
import { svQuick, svT } from './sv.t';
import { jaA } from './ja.a';
import { jaB } from './ja.b';
import { jaQuick, jaT } from './ja.t';
import { esA } from './es.a';
import { esB } from './es.b';
import { esQuick, esT } from './es.t';

export interface HelpContent {
  articles: HelpLocaleContent;
  quick: HelpQuickAnswer[];
}

const RAW: Record<string, HelpContent> = {
  en: { articles: { ...enA, ...enB, ...enT }, quick: enQuick },
  he: { articles: { ...heA, ...heB, ...heT }, quick: heQuick },
  sv: { articles: { ...svA, ...svB, ...svT }, quick: svQuick },
  ja: { articles: { ...jaA, ...jaB, ...jaT }, quick: jaQuick },
  es: { articles: { ...esA, ...esB, ...esT }, quick: esQuick },
};

/** Unfilled text, for tests that check which facts an article quotes. */
export function getRawHelpContent(locale: string): HelpContent {
  return RAW[locale] ?? RAW.en;
}

const vars = HELP_FACTS as unknown as Record<string, string | number>;
const fill = (s: string) => fillHelpVars(s, vars);

function fillBlock(b: HelpBlock): HelpBlock {
  switch (b.t) {
    case 'steps':
      return { ...b, items: b.items.map((s) => ({ ...s, title: fill(s.title), body: s.body && fill(s.body) })) };
    case 'list':
      return { ...b, items: b.items.map(fill) };
    case 'shot':
      return { ...b, caption: fill(b.caption) };
    default:
      return { ...b, text: fill(b.text) };
  }
}

function fillArticle(a: HelpArticleText): HelpArticleText {
  return { ...a, title: fill(a.title), summary: fill(a.summary), blocks: a.blocks.map(fillBlock) };
}

const FILLED = new Map<string, HelpContent>();

export function getHelpContent(locale: string): HelpContent {
  const key = RAW[locale] ? locale : 'en';
  const cached = FILLED.get(key);
  if (cached) return cached;
  const raw = RAW[key];
  const filled: HelpContent = {
    articles: Object.fromEntries(Object.entries(raw.articles).map(([k, a]) => [k, fillArticle(a)])),
    quick: raw.quick.map((q) => ({ ...q, q: fill(q.q), a: fill(q.a) })),
  };
  FILLED.set(key, filled);
  return filled;
}
