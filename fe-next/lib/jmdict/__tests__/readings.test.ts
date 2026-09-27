/**
 * Tests for JMdict reading extraction — bulk Japanese dictionary expansion.
 *
 * The JA validation set is ~12k hiragana words (vs en ~417k). JMdict (the JMdict
 * source Jisho uses) has ~190k entries with kana readings. We extract every kana
 * reading, fold katakana → hiragana (the game validates hiragana), keep
 * pure-hiragana words, and skip entries flagged sensitive/X-rated (slur family).
 */

import { katakanaToHiragana, parseJmdictReadings, parseJmdictInflectables } from '../readings';

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

describe('parseJmdictInflectables', () => {
  const xml = `
    <entry><ent_seq>1</ent_seq>
      <k_ele><keb>食べる</keb></k_ele>
      <r_ele><reb>たべる</reb></r_ele>
      <sense><pos>&v1;</pos><pos>&vt;</pos><gloss>to eat</gloss></sense>
    </entry>
    <entry><ent_seq>2</ent_seq>
      <r_ele><reb>のむ</reb></r_ele>
      <sense><pos>&v5m;</pos><gloss>to drink</gloss></sense>
    </entry>
    <entry><ent_seq>3</ent_seq>
      <r_ele><reb>たかい</reb></r_ele>
      <sense><pos>&adj-i;</pos><gloss>high</gloss></sense>
    </entry>
    <entry><ent_seq>4</ent_seq>
      <r_ele><reb>ねこ</reb></r_ele>
      <sense><pos>&n;</pos><gloss>cat</gloss></sense>
    </entry>
    <entry><ent_seq>5</ent_seq>
      <r_ele><reb>いく</reb></r_ele>
      <sense><pos>&v5k-s;</pos><gloss>to go (special)</gloss></sense>
    </entry>
    <entry><ent_seq>6</ent_seq>
      <r_ele><reb>くさいことば</reb></r_ele>
      <sense><pos>&v1;</pos><misc>&sens;</misc><gloss>slur verb</gloss></sense>
    </entry>
  `;

  it('returns reading + POS entities only for conjugatable entries', () => {
    const items = parseJmdictInflectables(xml);
    const byReading = Object.fromEntries(items.map((i) => [i.reading, i.pos]));
    expect(byReading['たべる']).toEqual(expect.arrayContaining(['v1']));
    expect(byReading['のむ']).toEqual(expect.arrayContaining(['v5m']));
    expect(byReading['たかい']).toEqual(expect.arrayContaining(['adj-i']));
  });

  it('excludes nouns and other non-conjugatable POS', () => {
    const readings = parseJmdictInflectables(xml).map((i) => i.reading);
    expect(readings).not.toContain('ねこ');
  });

  it('includes the high-frequency irregular いく (v5k-s) so the runner can conjugate it', () => {
    const readings = parseJmdictInflectables(xml).map((i) => i.reading);
    expect(readings).toContain('いく');
  });

  it('skips entries flagged sensitive/X-rated even when conjugatable', () => {
    const readings = parseJmdictInflectables(xml).map((i) => i.reading);
    expect(readings).not.toContain('くさいことば');
  });
});
