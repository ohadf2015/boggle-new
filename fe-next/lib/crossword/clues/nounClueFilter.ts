/** Mechanical rejects for Spanish clues pulled from the large nouns list (family/classroom audience). */
const RULES: RegExp[] = [
  /\d/,
  // inflected/variant forms
  /^(primera|segunda|tercera) persona\b/i,
  /^(forma|variante|grafía|plural|femenino|masculino|diminutivo|aumentativo|participio|gerundio|apócope|abreviatura|sigla)\b/i,
  /\b(forma|variante|plural|femenino|masculino|diminutivo|aumentativo) (de|del)\b/i,
  // usage formulas rather than meanings
  /^(se (usa|usaba|dice|díce|utiliza|emplea)|usad[oa]|utilizad[oa]|emplead[oa]|denota|denotando|expresión|expresa|para expresar|dícese|dicho de)\b/i,
  /\binterjección\b/i,
  // vulgar / sexual / drugs
  /genital|sexual|\bsexo\b|vulgar|malsonante|obsceno|coito|\bpene\b|vagina|testícul|excremento|prostitu|cabrón|marihuana|\bdrogas?\b|hachís|cocaína|\bano\b|insulto|despectiv|peyorativ|ofensiv/i,
  /órgano|eréctil|digestivo|enfermedad|tumor|intoxicaci|alcohol|embriag|borrach|cadáver|sangre|asesin|matar/i,
  // markup / formatting junk and colloquial openers
  /={2,}|\s[,.;:]|^(no me|me)\b/i,
  // regional / archaic
  /(?<!\p{L})(cuba|méxico|mexic\p{L}*|ecuador|aragón|chile|chilen\p{L}*|argentin\p{L}*|perú|peruan\p{L}*|colombia\p{L}*|venezuela\p{L}*|bolivia\p{L}*|uruguay\p{L}*|paraguay\p{L}*|guatemala|honduras|nicaragua|costa rica|panamá|puerto rico|rioja|navarra|andaluc\p{L}*|extremadura|galicia|canarias|américa|amerindi\p{L}*|castilla)(?!\p{L})/iu,
  /\b(antiguo|antigua|antiguos|antiguas|antiguamente|desusad\w*|arcaic\w*|obsolet\w*)\b/i,
  // taxonomy-style obscurity
  /^(especie|arbusto|garrapatero|planta|árbol|hierba|pez|ave|insecto|molusco|mamífero|género|familia)\b.*\b(de|del|familia|especies)\b.*/i,
  /\b(especie de|planta de la familia|arbusto|garrapatero)\b/i,
  // later senses lean on an earlier one ("Golpe dado con una pieza tal", "Por extensión, …")
  /^por extensión\b|(?<!\p{L})(tal|tales|este|esta|estos|estas|dicho|dicha|dichos|dichas)(?!\p{L})|\balgun[oa]s otr[oa]s\b/iu,
  /^que ocupa el \p{L}+ lugar\b/iu,
];

export function rejectNounClueEs(clue: string): boolean {
  return RULES.some((r) => r.test(clue));
}

const ES_POS_HEADER = /^=+ (Sustantivo|Verbo|Adjetivo|Adverbio|Pronombre|Interjección|Numeral|Forma)/i;
const ES_FLAGGED_USAGE = /^Uso:.*(anticuad|desusad|obsolet|poco usad|coloquial|vulgar|malsonante|despectiv|peyorativ|jerga|jergal|germanía|rural|infantil|eufemism|lunfardo|festivo|poétic|literari)/i;

type EsSense = { gloss: string; flagged: boolean };

/** Numbered senses of the first part-of-speech section: gloss line + whether its notes mark it archaic/vulgar/regional. */
function parseEsSenses(extract: string | null | undefined): EsSense[] {
  const lines = (extract ?? '').split('\n').map((l) => l.trim());
  const es = lines.indexOf('== Español ==');
  const pos = es < 0 ? -1 : lines.findIndex((l, i) => i > es && ES_POS_HEADER.test(l));
  if (pos < 0) return [];
  const out: EsSense[] = [];
  for (let i = pos + 1; i < lines.length && !lines[i].startsWith('='); i++) {
    if (!/^\d+(\s|$)/.test(lines[i])) continue;
    const gloss = lines[i + 1] ?? '';
    let flagged = false;
    for (let j = i + 2; j < lines.length && !/^\d+(\s|$)/.test(lines[j]) && !lines[j].startsWith('='); j++) {
      if (ES_FLAGGED_USAGE.test(lines[j]) || /^Ámbito:/i.test(lines[j])) flagged = true;
    }
    if (gloss && !gloss.startsWith('=')) out.push({ gloss, flagged });
  }
  return out;
}

/** True when the word's main sense (first sense of the first part of speech) carries an archaic/vulgar/regional note. */
export function esFirstSenseFlagged(extract: string | null | undefined): boolean {
  return parseEsSenses(extract)[0]?.flagged ?? false;
}

/** Glosses of the first few unflagged senses (a circular or overlong first sense can fall back to the next). */
export function esSenses(extract: string | null | undefined, max = 2): string[] {
  return parseEsSenses(extract).filter((x) => !x.flagged).slice(0, max).map((x) => x.gloss);
}

/** Mechanical rejects for Japanese Wiktionary clues (family/classroom audience). */
const JA_RULES: RegExp[] = [
  /[0-9０-９]/,
  /[A-Za-zＡ-Ｚａ-ｚ]/,
  /[=＝[\]{}<>|*#「」『』【】…?？:：]/,
  /^[\u30A0-\u30FF・]+$/, // katakana-only = a respelling, not a meaning
  // spelling stubs / inflected forms / pointers rather than meanings
  /表記|異表記|旧字体|を参照|参照|の略|略称|略語|未然形|連用形|終止形|連体形|仮定形|命令形|已然形|活用|音便|の転|誤記|接頭辞|接尾辞|助詞|助動詞/,
  // archaic / dialect / literary register
  /古語|古文|古典|古称|古く|古風|上代|中古|方言|文語|雅語|廃語|旧称|歴史的仮名遣い|沖縄|琉球/,
  // vulgar / sexual / drugs / violence
  /性交|性行為|性器|陰茎|陰部|陰嚢|膣|女陰|男根|精液|射精|売春|娼|遊女|淫|卑猥|猥褻|わいせつ|俗語|卑語|隠語|罵|侮蔑|蔑称|差別|同性愛|強姦|乳房|ポルノ|麻薬|大麻|覚醒剤|糞|大便|小便|尿|屁|死体|殺|自殺|酔/,
];

export function rejectNounClueJa(clue: string): boolean {
  return JA_RULES.some((r) => r.test(clue));
}

/** Mechanical rejects for Russian Wiktionary senses and clues (family/classroom audience). */
const RU_RULES: RegExp[] = [
  /\d/,
  /^форма(?!\p{L})|(?<!\p{L})падеж|(?<!\p{L})(местоимени|союз|предлог|частиц|междомет|числительн)/iu,
  /^(употребляется|используется|служит|указывает|выражает|обозначает|при обращении|то же,? что)(?!\p{L})/iu,
  /(?<!\p{L})имя(?!\p{L})|(?<!\p{L})фамили/iu,
  // later senses lean on the previous one ("Здание этого учреждения") or go vague-figurative
  /(?<!\p{L})(эт(от|а|о|ого|ой|их|им|ом|у)|так(ой|ая|ое|ие|ого|их|им|ую)|данн\p{L}*|указанн\p{L}*)(?!\p{L})/iu,
  /^(то|нечто|что-либо|что-то|кто-либо|кто-то)(?!\p{L})/iu,
  // "В живописи: …" / "В восточных единоборствах": a field label, not a meaning
  /^(в|во|у) [^,]*(:|$)/iu,
  /\s[,.;:]/,
  // register labels kept on the raw sense line (archaic, dialect, slang, vulgar, colloquial, bookish)
  /^(?:[а-яё-]{1,12}\.,?\s+)*(устар|истор|арх|диал|рег|обл|обсц|вульг|бран|груб|жарг|сленг|разг|прост|сниж|презр|пренебр|неодобр|фам|эвф|ирон|шутл|крим|мол|церк|поэт|книжн|высок|спец|техн|мед|физиол)\./iu,
  /половой|половы|сношени|совокуп|генитал|эротич|секс|проститу|блуд|разврат|наркоти|опиум|конопл|алкогол|спиртн|пьян|водк|самогон|убий|убит|труп|смерт|казн|испражн|кал(?!\p{L})|моч[аие](?!\p{L})|ругат|оскорб|презрит/iu,
  /сибир|урал|кавказ|украин|белорус|казах|дальн\p{L}* восток|дон(?:ск|у|е)(?!\p{L})|кубан|якут|татар|в некоторых местностях|регион/iu,
  /^(род|вид|семейство|отряд|подвид|сорт|порода)(?!\p{L})|(?<!\p{L})(семейства|отряда|рода)(?!\p{L})/iu,
];

export function rejectNounClueRu(clue: string): boolean {
  const text = clue.replace(/\([^)]*\)/g, ' '); // parentheticals are dropped from the clue anyway
  // Latin binomials (even in parentheses) mark taxonomy-level senses
  return /[A-Za-z]/.test(clue) || RU_RULES.some((r) => r.test(text));
}

type RuBlock = { pos: string; lines: string[] };

/** Part-of-speech line and the sense lines of a ru Wiktionary page's morphology/meaning blocks, or null. */
function ruSenseBlock(extract: string | null | undefined): RuBlock | null {
  if (!extract) return null;
  const lines = extract.split('\n').map((l) => l.trim());
  const start = lines.indexOf('= Русский =');
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && /^= [^=].*=$/.test(l));
  const body = lines.slice(start + 1, end < 0 ? undefined : end);
  const morph = body.findIndex((l) => /^=+ Морфологические и синтаксические свойства =+$/.test(l));
  if (morph < 0) return null;
  const until = (from: number) => { const rest = body.slice(from); const e = rest.findIndex((l) => l.startsWith('=')); return e < 0 ? rest : rest.slice(0, e); };
  // headword lines are lowercase ("ве́-ра"); the first capitalized line names the part of speech
  const pos = until(morph + 1).find((l) => /^[А-ЯЁ]/.test(l));
  if (!pos) return null;
  const sense = body.findIndex((l, i) => i > morph && /^=+ Значение =+$/.test(l));
  if (sense < 0) return null;
  const senseLines = until(sense + 1)
    // a sense with no usage example is a stub entry; frequent homographs (гор = of гора) land on these
    .filter((l) => l && !/^Общее прототипическое значение/i.test(l) && !/Отсутствует пример употребления/i.test(l));
  return { pos, lines: senseLines };
}

const takeSenses = (lines: string[], max: number) => lines.slice(0, max).map((l) => l.split('◆')[0].replace(/́/g, '').trim()).filter(Boolean);

/** First few raw sense lines (labels kept, stress marks dropped) of a ru Wiktionary page whose part of speech is a noun, else []. */
export function ruNounSenses(extract: string | null | undefined, max = 2): string[] {
  const b = ruSenseBlock(extract);
  return b?.pos.startsWith('Существительное') ? takeSenses(b.lines, max) : [];
}

const RU_LEMMA_POS = /^(Прилагательное|Глагол|Наречие|Местоимение|Числительное|Междометие)(?!\p{L})/u;
const RU_NOT_LEMMA_POS = /степен|форм|причаст|деепричаст/iu;

/** Senses of a non-noun lemma. Inflected pages (ого-adjectives, -ает verbs) fail on the ending of the word itself. */
export function ruLemmaSenses(extract: string | null | undefined, word: string, max = 2): string[] {
  const b = ruSenseBlock(extract);
  if (!b || !RU_LEMMA_POS.test(b.pos) || RU_NOT_LEMMA_POS.test(b.pos.split(/Сравнительн|Превосходн|Соответствующ/u)[0])) return [];
  const w = word.toLowerCase().replace(/ё/g, 'е');
  if (b.pos.startsWith('Глагол') && !/(ть|ти|чь)(ся|сь)?$/.test(w)) return [];
  if (b.pos.startsWith('Прилагательное') && !/(ый|ий|ой)$/.test(w)) return [];
  return takeSenses(b.lines, max);
}

/** Clue source senses for a ru candidate: noun senses for a noun lemma, else the other accepted lemma senses. */
export function ruClueSenses(extract: string | null | undefined, word: string, max = 2): string[] {
  const noun = ruNounSenses(extract, max);
  return noun.length ? noun : ruLemmaSenses(extract, word, max);
}

/** Non-noun clue rejects: context-only openers (anaphora, grammar labels, topic "О …") and truncated abbreviation tails. */
const RU_LEMMA_CLUE_RULES: RegExp[] = [
  /^(также|тоже|обычно|наречие|вопросительн|указательн|образует|относительн|местоименн|употребл|частиц|неопределённ|притяжательн|определительн|личн|возвратн|сравнительн|превосходн)(?!\p{L})/iu,
  /^об?(?:о)?\s/iu,
  /\s(доп|мест|сравн|разг|нар|гл|ед|мн|знач|прил|сущ)\.?$/iu,
  /\?$/,
];

export function rejectLemmaClueRu(clue: string): boolean {
  return RU_LEMMA_CLUE_RULES.some((r) => r.test(clue.trim()));
}
