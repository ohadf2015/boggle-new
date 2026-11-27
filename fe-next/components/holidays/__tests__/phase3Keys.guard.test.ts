import { describe, it, expect } from 'vitest';
import { HUNT_ITEMS, HUNT_SLOTS } from '@/lib/holidays/hunt';
import { EGG_IDS } from '@/lib/holidays/eggs';
import { GIFT_HINT_COUNT } from '@/lib/holidays/gift';
import { HOLIDAY_ALL_PART_KEYS } from '@/lib/holidayEvent/rewards';

const H = ['hanukkah', 'christmas'];

const KEYS = [
  'title.seeker',
  ...HOLIDAY_ALL_PART_KEYS.map((k) => `part.${k.slice(k.indexOf(':') + 1)}`),
  ...H.flatMap((h) => [`gift.${h}.title`, ...Array.from({ length: GIFT_HINT_COUNT }, (_, i) => `gift.${h}.hint.${i}`), `comeback.${h}`]),
  ...['grows', 'stalled', 'opensOn', 'shakeLabel', 'open', 'openCta', 'openError', 'openedTitle'].map((k) => `gift.${k}`),
  ...HUNT_SLOTS.map((s) => `hunt.hint.${s}`),
  ...Object.values(HUNT_ITEMS).flat().map((i) => `hunt.item.${i}`),
  ...['foundToday', 'progress', 'found', 'seeker', 'error', 'itemLabel'].map((k) => `hunt.${k}`),
  ...EGG_IDS.filter((e) => e.startsWith('word_')).map((e) => `eggs.word.${e.slice(5)}`),
  ...['lost_latke', 'snowman', 'gingerbread'].flatMap((k) => [`eggs.permanent.${k}`, `eggs.permanent.${k}Label`]),
  ...['close', 'dreidelLabel', 'dreidelIL', 'dreidelWorld', 'mascotLabel', 'globeTitle', 'globeShake', 'secretFound', 'secretsLeft', 'secretsAll'].map((k) => `eggs.${k}`),
  ...['kohaku', 'bells108', 'chimes', 'roscon'].map((m) => `moment.${m}.title`),
  ...['loadError', 'sleigh', 'fika', 'boxingDay', 'inocentes.fake', 'inocentes.reveal', 'kohaku.team.red', 'kohaku.team.white', 'kohaku.guest', 'kohaku.red', 'kohaku.white',
    'bells.label', 'bells.hint', 'bells.done', 'chimes.intro', 'chimes.start', 'chimes.lost', 'chimes.won',
    'roscon.hint', 'roscon.slice', 'roscon.signIn', 'roscon.haba', 'roscon.figurine', 'roscon.none'].map((k) => `moment.${k}`),
  ...H.flatMap((h) => ['title', 'intro', 'days', 'shareText'].map((k) => `wrapped.${h}.${k}`)),
  ...['cta', 'words', 'longest', 'hunt', 'secrets', 'finale', 'share', 'next', 'prev', 'close', 'loading', 'error'].map((k) => `wrapped.${k}`),
];

function get(tree: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((n, k) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[k] : undefined), tree);
}

describe('holiday phase 3 translation keys', () => {
  it.each(['en', 'he', 'es', 'sv', 'ja', 'ru'])('Given %s, then every key the gift, hunt, eggs, moments and Wrapped use is a string', async (lang) => {
    const mod: Record<string, Record<string, unknown>> = await import(`../../../translations/${lang}.js`);
    const holiday = mod[lang].holiday;
    for (const k of KEYS) expect(typeof get(holiday, k), `${lang} holiday.${k}`).toBe('string');
  });
});
