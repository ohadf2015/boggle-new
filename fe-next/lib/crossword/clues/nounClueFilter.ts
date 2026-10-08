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
