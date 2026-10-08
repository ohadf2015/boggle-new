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
  /\b(cuba|méxico|mexic\w*|ecuador|aragón|chile|chilen\w*|argentin\w*|perú|peruan\w*|colombia\w*|venezuela\w*|bolivia\w*|uruguay\w*|paraguay\w*|guatemala|honduras|nicaragua|costa rica|panamá|puerto rico|rioja|navarra|andaluc\w*|extremadura|galicia|canarias|américa|amerindi\w*|castilla)\b/i,
  /\b(antiguo|antigua|antiguos|antiguas|antiguamente|desusad\w*|arcaic\w*|obsolet\w*)\b/i,
  // taxonomy-style obscurity
  /^(especie|arbusto|garrapatero|planta|árbol|hierba|pez|ave|insecto|molusco|mamífero|género|familia)\b.*\b(de|del|familia|especies)\b.*/i,
  /\b(especie de|planta de la familia|arbusto|garrapatero)\b/i,
];

export function rejectNounClueEs(clue: string): boolean {
  return RULES.some((r) => r.test(clue));
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
