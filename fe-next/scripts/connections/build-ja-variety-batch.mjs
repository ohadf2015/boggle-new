#!/usr/bin/env node
/**
 * One-off builder + OBJECTIVE validator for the 2026-06-04 Japanese "variety
 * wave". Unlike es/he, ja needs NO LLM and NO native speaker: every puzzle is
 * MINED from the game's own curated common Japanese word list — both compounds
 * are attested 二字熟語 in backend/common_hunt_words_ja.txt.
 *
 * For a puzzle X·Y·Z: full1 = XY, full2 = YZ, bridge = Y (all single kanji).
 * Validation (hard):
 *   1. full1 ∈ common-2-kanji set AND full2 ∈ common-2-kanji set.
 *   2. concat alignment full1 === X+Y, full2 === Y+Z (exact kanji, no separators).
 *   3. non-degenerate X≠Y≠Z.
 *   4. not a duplicate of an existing ja pool triple.
 *
 * The CURATED list below was hand-picked from the 135 mined candidates for
 * bridge diversity + everyday clarity (see /tmp/ja-mine2.mjs). Difficulty is a
 * rough commonness call.
 *
 * Run: node build-ja-variety-batch.mjs   (prints INSERT SQL to stdout)
 */
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(f, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const KANJI = /^[一-龯々]+$/;
const common = new Set();
for (const w of read('backend/common_hunt_words_ja.txt')) {
  if ([...w].length === 2 && KANJI.test(w)) common.add(w);
}

// Existing ja pool triples — avoid duplicates.
const existing = new Set();
{
  const src = readFileSync('lib/connections/puzzles/generated/ja.generated.ts', 'utf8');
  const re = /word1:\s*"([^"]+)",\s*bridge:\s*"([^"]+)",\s*word2:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) existing.add(`${m[1]}${m[2]}${m[3]}`);
}

/** [X, Y(bridge), Z, difficulty] — curated for diversity + clarity. */
const ROWS = [
  ['入', '口', '笛', 'easy'],   // 入口 entrance / 口笛 whistle
  ['七', '夕', '日', 'medium'], // 七夕 Tanabata / 夕日 sunset
  ['丸', '太', '陽', 'easy'],   // 丸太 log / 太陽 sun
  ['吹', '雪', '山', 'easy'],   // 吹雪 blizzard / 雪山 snowy mountain
  ['団', '子', '供', 'easy'],   // 団子 dango / 子供 child
  ['大', '仏', '像', 'easy'],   // 大仏 great buddha / 仏像 statue
  ['大', '地', 'figure', 'easy'], // placeholder fixed below
  ['妖', '怪', '物', 'medium'], // 妖怪 yokai / 怪物 monster
  ['巨', '人', '形', 'easy'],   // 巨人 giant / 人形 doll
  ['平', '和', '食', 'easy'],   // 平和 peace / 和食 Japanese food
  ['悪', '魔', '法', 'easy'],   // 悪魔 devil / 魔法 magic
  ['提', '灯', '台', 'medium'], // 提灯 lantern / 灯台 lighthouse
  ['新', '月', '光', 'easy'],   // 新月 new moon / 月光 moonlight
  ['納', '豆', '腐', 'medium'], // 納豆 natto / 豆腐 tofu
  ['海', '老', '人', 'medium'], // 海老 shrimp / 老人 old person
  ['火', '花', '見', 'easy'],   // 火花 spark / 花見 flower viewing
  ['花', '火', '山', 'easy'],   // 花火 fireworks / 火山 volcano
  ['茶', '道', '場', 'medium'], // 茶道 tea ceremony / 道場 dojo
  ['裸', '足', '袋', 'medium'], // 裸足 barefoot / 足袋 tabi
  ['深', '海', '岸', 'medium'], // 深海 deep sea / 海岸 coast
  ['台', '風', '車', 'easy'],   // 台風 typhoon / 風車 windmill
  ['火', '山', '脈', 'medium'], // 火山 volcano / 山脈 mountain range
  ['天', '国', '旗', 'medium'], // 天国 heaven / 国旗 national flag
  ['農', '家', '族', 'easy'],   // 農家 farmer / 家族 family
  ['夜', '桜', '餅', 'medium'], // 夜桜 night cherry blossoms / 桜餅 sakura mochi
  ['小', '鳥', '居', 'medium'], // 小鳥 small bird / 鳥居 torii gate
  ['庭', '園', '芸', 'medium'], // 庭園 garden / 園芸 gardening
  ['月', '夜', '空', 'medium'], // 月夜 moonlit night / 夜空 night sky
  ['稲', '荷', '物', 'medium'], // 稲荷 inari / 荷物 luggage
  ['漁', '師', '匠', 'medium'], // 漁師 fisherman / 師匠 master
];
// fix the placeholder row (大地 / 地図)
ROWS[6] = ['大', '地', '図', 'easy'];

const sqlStr = (s) => `'${s.replace(/'/g, "''")}'`;
const errs = [];
const out = [];
ROWS.forEach(([x, y, z, diff], i) => {
  const id = `ja-v-${String(i + 1).padStart(3, '0')}`;
  const f1 = x + y;
  const f2 = y + z;
  if (!common.has(f1)) errs.push(`${id} ${f1} not in common list`);
  if (!common.has(f2)) errs.push(`${id} ${f2} not in common list`);
  if (x === y || y === z || x === z) errs.push(`${id} degenerate`);
  if (existing.has(`${x}${y}${z}`)) errs.push(`${id} duplicate of existing ${x}${y}${z}`);
  const examples = JSON.stringify([{ w1: f1, w2: f2, bridge: y }]);
  out.push(
    `(${sqlStr(id)}, 'ja', ${sqlStr(x)}, ${sqlStr(y)}, ${sqlStr(z)}, ` +
      `${sqlStr(examples)}::jsonb, ${sqlStr(diff)}, 'authored', true)`,
  );
});

if (errs.length) {
  console.error('VALIDATION FAILED:\n' + errs.join('\n'));
  process.exit(1);
}
console.error(`OK: ${ROWS.length} ja puzzles, ${new Set(ROWS.map((r) => r[1])).size} distinct bridges, 0 errors.`);
console.log(
  `INSERT INTO public.connections_puzzles\n  (id, locale, word1, bridge, word2, examples, difficulty, source, is_active)\nVALUES\n  ${out.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;`,
);
