import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Shares never carry emoji, so marketing copy must not promise an emoji result grid.
// Blog posts and comparison blurbs that describe Wordle's own grid are fine.
const ROOTS = ['translations', 'app/[locale]', 'lib/comparison'];
const SKIP = /(__tests__|\/blog\/|best-online-word-games|privacy)/;
const PROMISE =
  /share emoji|emoji (results?|grid)|emoji-(resultat|baserade|rutn)|resultados? emoji|comparte emoji|絵文字(で結果|の結果|結果|グリッド|ベース)|(результат\S* )?эмодзи(-сетк)?|תוצא\S* (ב)?אמוג/i;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (SKIP.test(p)) return [];
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|js)$/.test(p) ? [p] : [];
  });
}

describe('copy never promises emoji share results', () => {
  it('no page or translation promises an emoji result grid', () => {
    const hits = ROOTS.flatMap(files).flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .map((line, i) => ({ f, i: i + 1, line }))
        .filter(({ line }) => PROMISE.test(line.replace(/competitor:.*$/, '')) && /share|dela|compart|シェア|共有|подел|делись|שתפ|copy|kopiera|copia|grid|result/i.test(line)),
    );
    expect(hits.map(({ f, i, line }) => `${f}:${i} ${line.trim().slice(0, 120)}`)).toEqual([]);
  });
});
