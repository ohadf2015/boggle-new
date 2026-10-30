import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

type Tree = { [k: string]: string | Tree };
const BUNDLES = { en, he, sv, ja, es, ru } as unknown as Record<string, Tree>;

function resolve(tree: Tree, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Tree)[part] : undefined), tree);
}

const placeholders = (s: string) => [...s.matchAll(/\{\{?\s*(\w+)\s*\}?\}/g)].map((m) => m[0]).sort();

const EXPECTED_EN: Record<string, string> = {
  'education.starterPacks.sessions.title': 'Ready-made class games',
  'eduShell.home.rail.run': 'Pick',
  'eduShell.home.startLive': 'Pick a game',
  'academy.hq.openProjector': 'Show code on board',
  'education.projectorLobby.rehearseCta': 'Try it with bots',
  'academy.hq.codeReady': 'Open to join',
  'academy.hq.joinedGoal': '{count} joined, aim for {goal}',
  'eduShell.week.students': 'Students in your classes',
  'eduShell.week.active': 'Classes that played',
  'eduPickers.board.label': 'Language: {language}',
  'eduShell.host.changeList': 'Change list',
  'eduShell.warmup.send': 'Send list as homework',
  'eduShell.warmup.sent': 'Sent as homework',
  'eduShell.warmup.status': '{done} of {total} students practised',
  'eduShell.warmup.capped': 'Free plan homework limit reached. Pro sends unlimited homework.',
  'eduShell.delivery.projector': 'Needs projector',
  'eduShell.delivery.phones': 'Phones only',
  'eduShell.delivery.both': 'Projector optional',
  'eduShell.host.bestForList': 'Best match',
  'eduShell.host.bestForListHint': 'Best match for this word list',
  'eduShell.host.untried': 'Not tried',
  'eduShell.host.untriedHint': "You haven't played this one lately",
  'eg2Modes.complexity.simple': 'Easy rules',
  'eg2Modes.complexity.medium': 'Some rules',
  'eg2Modes.complexity.tricky': 'Tricky rules',
  'teacher.classroom.playStyle.ffa': 'Everyone vs everyone',
  'eduShell.host.lateJoinOn': 'Latecomers can join',
  'eduShell.host.lateJoinOff': 'No latecomers',
  'teacher.classroom.presets.title': 'Quick setups',
};

describe('teacher home and Pick-a-game copy says what each label does', () => {
  it.each(Object.entries(EXPECTED_EN))('en %s reads "%s"', (key, value) => {
    expect(resolve(BUNDLES.en, key)).toBe(value);
  });

  for (const [lang, bundle] of Object.entries(BUNDLES)) {
    it.each(Object.keys(EXPECTED_EN))(`${lang} %s is translated, dash-free, with the en placeholders`, (key) => {
      const value = resolve(bundle, key);
      expect(typeof value).toBe('string');
      const s = value as string;
      expect(s.trim().length).toBeGreaterThan(0);
      expect(s).not.toMatch(/[–—]/);
      expect(placeholders(s)).toEqual(placeholders(EXPECTED_EN[key]));
      if (lang !== 'en') expect(s).not.toBe(EXPECTED_EN[key]);
    });
  }

  it('tile stickers stay one or two words in every locale', () => {
    for (const bundle of Object.values(BUNDLES)) {
      for (const key of ['eduShell.host.bestForList', 'eduShell.host.untried']) {
        const v = resolve(bundle, key) as string;
        expect(v.split(/\s+/).length, key).toBeLessThanOrEqual(2);
        expect(v.length, key).toBeLessThanOrEqual(12);
      }
    }
  });

  it('the play-style name matches the mode chip in every locale', () => {
    for (const bundle of Object.values(BUNDLES)) {
      expect(resolve(bundle, 'teacher.classroom.playStyle.ffa')).toBe(resolve(bundle, 'eg2Modes.style.ffa'));
    }
  });
});
