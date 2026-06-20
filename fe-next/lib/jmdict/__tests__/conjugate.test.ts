/**
 * Tests for deterministic Japanese conjugation derivation.
 *
 * JMdict is a lemma dictionary — inflected forms (past/neg/polite/te) are absent,
 * so players forming たべた / のんだ / たかかった on a hiragana board get rejected.
 * Conjugation is deterministic GIVEN the verb class, which JMdict declares via
 * <pos> entities (v1, v5*, adj-i). We generate from authority, never guess:
 * irregular/special classes are skipped so we mint zero junk.
 */

import { classifyConjugation, deriveForms } from '../conjugate';

describe('classifyConjugation', () => {
  it('maps ichidan and godan POS entities to a class', () => {
    expect(classifyConjugation(['v1'])).toBe('ichidan');
    expect(classifyConjugation(['v1-s'])).toBe('ichidan');
    expect(classifyConjugation(['v5m'])).toBe('godan-m');
    expect(classifyConjugation(['v5k'])).toBe('godan-k');
    expect(classifyConjugation(['adj-i'])).toBe('adj-i');
  });

  it('uses the first recognised class when several POS tags are present', () => {
    expect(classifyConjugation(['vt', 'v5g', 'n'])).toBe('godan-g');
  });

  it('returns null for irregular / special / non-conjugatable POS', () => {
    expect(classifyConjugation(['v5k-s'])).toBeNull(); // iku special
    expect(classifyConjugation(['v5r-i'])).toBeNull(); // aru special
    expect(classifyConjugation(['v5aru'])).toBeNull();
    expect(classifyConjugation(['vs-i'])).toBeNull(); // suru
    expect(classifyConjugation(['vk'])).toBeNull(); // kuru
    expect(classifyConjugation(['adj-ix'])).toBeNull(); // ii/yoi irregular
    expect(classifyConjugation(['n', 'adj-na'])).toBeNull();
    expect(classifyConjugation([])).toBeNull();
  });
});

describe('deriveForms — ichidan', () => {
  it('conjugates たべる (eat) into core forms, excluding the lemma', () => {
    const forms = deriveForms('たべる', ['v1', 'vt']);
    expect(forms).toEqual(
      expect.arrayContaining(['たべた', 'たべない', 'たべます', 'たべました', 'たべて', 'たべなかった']),
    );
    expect(forms).not.toContain('たべる'); // lemma already in dict
  });
});

describe('deriveForms — godan euphonic changes', () => {
  it('v5m のむ (drink) → ん-stem past/te', () => {
    const f = deriveForms('のむ', ['v5m']);
    expect(f).toEqual(expect.arrayContaining(['のんだ', 'のんで', 'のまない', 'のみます', 'のみました', 'のまなかった']));
  });
  it('v5k かく (write) → い-stem past/te', () => {
    const f = deriveForms('かく', ['v5k']);
    expect(f).toEqual(expect.arrayContaining(['かいた', 'かいて', 'かかない', 'かきます']));
  });
  it('v5g およぐ (swim) → い-stem with だ/で voicing', () => {
    const f = deriveForms('およぐ', ['v5g']);
    expect(f).toEqual(expect.arrayContaining(['およいだ', 'およいで', 'およがない', 'およぎます']));
  });
  it('v5s はなす (speak) → し-stem', () => {
    const f = deriveForms('はなす', ['v5s']);
    expect(f).toEqual(expect.arrayContaining(['はなした', 'はなして', 'はなさない', 'はなします']));
  });
  it('v5u かう (buy) → っ-stem with わ-negative', () => {
    const f = deriveForms('かう', ['v5u']);
    expect(f).toEqual(expect.arrayContaining(['かった', 'かって', 'かわない', 'かいます']));
  });
  it('v5r のる (ride) → っ-stem with ら-negative', () => {
    const f = deriveForms('のる', ['v5r']);
    expect(f).toEqual(expect.arrayContaining(['のった', 'のって', 'のらない', 'のります']));
  });
  it('v5t まつ (wait) → っ-stem', () => {
    const f = deriveForms('まつ', ['v5t']);
    expect(f).toEqual(expect.arrayContaining(['まった', 'まって', 'またない', 'まちます']));
  });
  it('v5b あそぶ (play) → ん-stem', () => {
    const f = deriveForms('あそぶ', ['v5b']);
    expect(f).toEqual(expect.arrayContaining(['あそんだ', 'あそんで', 'あそばない', 'あそびます']));
  });
});

describe('deriveForms — i-adjective', () => {
  it('たかい (high) → かった / くない / くて / く', () => {
    const f = deriveForms('たかい', ['adj-i']);
    expect(f).toEqual(expect.arrayContaining(['たかかった', 'たかくない', 'たかくて', 'たかく', 'たかくなかった']));
    expect(f).not.toContain('たかい');
  });
});

describe('deriveForms — high-frequency irregulars (explicit, POS-gated)', () => {
  it('する (vs-i) → します / しない / して / しました', () => {
    const f = deriveForms('する', ['vs-i']);
    expect(f).toEqual(expect.arrayContaining(['します', 'しない', 'して', 'しました', 'しなかった']));
  });
  it('くる (vk) → きます / こない / きて', () => {
    const f = deriveForms('くる', ['vk']);
    expect(f).toEqual(expect.arrayContaining(['きます', 'こない', 'きて', 'きました', 'こなかった']));
  });
  it('いく (v5k-s) → いった / いかない / いきます', () => {
    const f = deriveForms('いく', ['v5k-s']);
    expect(f).toEqual(expect.arrayContaining(['いった', 'いって', 'いかない', 'いきます', 'いかなかった']));
  });
  it('does NOT fire irregular forms for a noun reading that merely looks like する', () => {
    // a compound-suru entry stores the noun reading (べんきょう), not する → no forms
    expect(deriveForms('べんきょう', ['vs-i'])).toEqual([]);
    // and a plain noun reading equal to くる with noun POS stays empty
    expect(deriveForms('くる', ['n'])).toEqual([]);
  });
});

describe('deriveForms — safety guards', () => {
  it('returns [] when the reading does not end in the class okurigana (e.g. noun reading on a vs entry)', () => {
    expect(deriveForms('べんきょう', ['v1'])).toEqual([]); // not ending in る
    expect(deriveForms('のむ', ['v1'])).toEqual([]); // ichidan must end る
    expect(deriveForms('たかい', ['v5m'])).toEqual([]); // godan-m must end む
  });
  it('returns [] for unclassifiable / non-verb POS', () => {
    expect(deriveForms('ねこ', ['n'])).toEqual([]);
    expect(deriveForms('きれい', ['adj-na'])).toEqual([]);
    expect(deriveForms('ゆっくり', ['adv'])).toEqual([]);
  });
  it('returns [] for one-mora readings (empty stem)', () => {
    expect(deriveForms('る', ['v1'])).toEqual([]);
    expect(deriveForms('い', ['adj-i'])).toEqual([]);
  });
  it('only emits pure-hiragana forms', () => {
    const all = [
      ...deriveForms('たべる', ['v1']),
      ...deriveForms('のむ', ['v5m']),
      ...deriveForms('たかい', ['adj-i']),
    ];
    for (const w of all) expect(w).toMatch(/^[ぁ-ゟー]+$/);
  });
});
