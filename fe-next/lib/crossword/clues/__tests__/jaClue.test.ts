import { describe, it, expect } from 'vitest';
import { rejectNounClueJa } from '../nounClueFilter';
import { endsDangling } from '../danglingEnd';
import { jaClueFromDefinition } from '../jaClue';

describe('rejectNounClueJa', () => {
  it.each([
    ['ascii digit', '十二支の11番目'],
    ['full-width digit', '方位角３００度'],
    ['latin', '学名は Felis silvestris catus'],
    ['hiragana-spelling stub', '「挨拶」のひらがな表記'],
    ['form-of', '「やむ」の未然形'],
    ['abbreviation', '桜肉の略称'],
    ['see-also', '猫を参照'],
    ['archaic', '古語で、夜のこと'],
    ['dialect', '方言で、川のこと'],
    ['historic kana', '歴史的仮名遣い'],
    ['sexual', '同性愛者のうち、性行為において受け身の側'],
    ['genital', '男性の性器'],
    ['vulgar label', '俗語で、警察官'],
    ['slur', '人を罵る言葉'],
    ['drugs', '大麻の葉を乾燥させたもの'],
    ['excrement', '動物の糞'],
    ['markup', '== 名詞 =='],
    ['ellipsis', '家具のひとつで…'],
    ['headword brackets', '揚げ句【擧句・上句・結局】'],
    ['katakana-only respelling', 'アットゥシ'],
  ])('rejects %s', (_label, clue) => {
    expect(rejectNounClueJa(clue)).toBe(true);
  });

  it.each([
    '地形の呼称で周囲よりも高く盛り上がった土地',
    '家具のひとつ',
    '水素と酸素の化合物',
    '春に咲く花',
  ])('keeps a plain family-safe definition: %s', (clue) => {
    expect(rejectNounClueJa(clue)).toBe(false);
  });
});

describe('endsDangling (ja)', () => {
  it('flags a clue that stops on a comma or conjunction', () => {
    expect(endsDangling('木の枝、', 'ja')).toBe(true);
    expect(endsDangling('犬または', 'ja')).toBe(true);
    expect(endsDangling('犬および', 'ja')).toBe(true);
  });
  it('passes complete clues, including ones ending in もの', () => {
    expect(endsDangling('家具のひとつ', 'ja')).toBe(false);
    expect(endsDangling('積み重ねたもの', 'ja')).toBe(false);
  });
});

describe('jaClueFromDefinition', () => {
  it('takes the first sentence and drops 。', () => {
    expect(jaClueFromDefinition('地形の呼称で周囲よりも高く盛り上がった土地。山岳。', 'やま', ['山']))
      .toBe('地形の呼称で周囲よりも高く盛り上がった土地');
  });

  it('strips parenthesised readings and labels', () => {
    expect(jaClueFromDefinition('（比喩）甘えん坊な人（ひと）。', 'ねこ', ['猫'])).toBe('甘えん坊な人');
  });

  it('rejects a clue containing the answer, even written in katakana', () => {
    expect(jaClueFromDefinition('ネコ科の動物。', 'ねこ', ['猫'])).toBeNull();
    expect(jaClueFromDefinition('ねこのような人。', 'ねこ', [])).toBeNull();
  });

  it('rejects a kanji respelling whose parenthesised reading is the answer', () => {
    expect(jaClueFromDefinition('愛する (あいする)', 'あいする', [])).toBeNull();
    expect(jaClueFromDefinition('当て字（あてじ）', 'あてじ', [])).toBeNull();
  });

  it('rejects a clue containing the answer\'s own kanji spelling', () => {
    expect(jaClueFromDefinition('山の多い土地。', 'やま', ['山'])).toBeNull();
  });

  it('rejects clues that are too long or too short', () => {
    expect(jaClueFromDefinition('あ'.repeat(31) + '。', 'くるま', [])).toBeNull();
    expect(jaClueFromDefinition('木。', 'つくえ', [])).toBeNull();
  });

  it('rejects filtered content and empty input', () => {
    expect(jaClueFromDefinition('「挨拶」のひらがな表記。', 'あいさつ', ['挨拶'])).toBeNull();
    expect(jaClueFromDefinition(null, 'あいさつ', [])).toBeNull();
  });

  it('keeps a clean definition', () => {
    expect(jaClueFromDefinition('水素と酸素の化合物。', 'みず', ['水'])).toBe('水素と酸素の化合物');
  });
});
