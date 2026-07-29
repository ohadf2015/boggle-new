/**
 * Tests for JMdict reading extraction — bulk Japanese dictionary expansion.
 *
 * The JA validation set is ~12k hiragana words (vs en ~417k). JMdict (the JMdict
 * source Jisho uses) has ~190k entries with kana readings. We extract every kana
 * reading, fold katakana → hiragana (the game validates hiragana), keep
 * pure-hiragana words, and skip entries flagged sensitive/X-rated (slur family).
 */

import { katakanaToHiragana, parseJmdictReadings } from '../readings';

describe('katakanaToHiragana', () => {
  it('folds katakana to hiragana', () => {
    expect(katakanaToHiragana('サクラ')).toBe('さくら');
    expect(katakanaToHiragana('ネコ')).toBe('ねこ');
  });
  it('leaves hiragana and the long-vowel mark untouched', () => {
    expect(katakanaToHiragana('ねこ')).toBe('ねこ');
    expect(katakanaToHiragana('ラーメン')).toBe('らーめん');
  });
});

describe('parseJmdictReadings', () => {
  const xml = `
    <entry><ent_seq>1</ent_seq>
      <r_ele><reb>ねこ</reb></r_ele>
      <sense><pos>&n;</pos><gloss>cat</gloss></sense>
    </entry>
    <entry><ent_seq>2</ent_seq>
      <r_ele><reb>サクラ</reb></r_ele>
      <sense><pos>&n;</pos><gloss>cherry</gloss></sense>
    </entry>
    <entry><ent_seq>3</ent_seq>
      <r_ele><reb>わるいことば</reb></r_ele>
      <sense><pos>&n;</pos><misc>&sens;</misc><gloss>slur</gloss></sense>
    </entry>
    <entry><ent_seq>4</ent_seq>
      <r_ele><reb>えっちなの</reb></r_ele>
      <sense><pos>&n;</pos><misc>&X;</misc><gloss>x-rated</gloss></sense>
    </entry>
    <entry><ent_seq>5</ent_seq>
      <r_ele><reb>ABC・テスト</reb></r_ele>
      <sense><pos>&n;</pos><gloss>has latin + middle dot</gloss></sense>
    </entry>
  `;

  it('extracts hiragana readings and folds katakana', () => {
    const set = parseJmdictReadings(xml);
    expect(set.has('ねこ')).toBe(true);
    expect(set.has('さくら')).toBe(true); // katakana サクラ folded
  });

  it('skips entries flagged sensitive (&sens;) or X-rated (&X;)', () => {
    const set = parseJmdictReadings(xml);
    expect(set.has('わるいことば')).toBe(false);
    expect(set.has('えっちなの')).toBe(false);
  });

  it('drops readings that are not pure hiragana (latin / middle dot)', () => {
    const set = parseJmdictReadings(xml);
    for (const w of set) expect(/^[぀-ゟー]+$/.test(w)).toBe(true);
  });

  it('returns a deduplicated set', () => {
    const dup = '<entry><r_ele><reb>ねこ</reb></r_ele><sense><gloss>a</gloss></sense></entry>'
      + '<entry><r_ele><reb>ねこ</reb></r_ele><sense><gloss>b</gloss></sense></entry>';
    expect(parseJmdictReadings(dup).size).toBe(1);
  });
});
