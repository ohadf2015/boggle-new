const FUNCTION_WORDS: Record<string, Set<string>> = {
  es: new Set('el la los las un una unos unas de del al en a con por para y o u e que sin sobre entre desde hasta su sus se lo'.split(' ')),
  ru: new Set('и или а но в во на с со к ко по для от из о об за при у до под над не что как же ли бы'.split(' ')),
};

/** True when a length-cut clue stops on an article/preposition/conjunction (reads as truncated). */
// Japanese has no spaces to tokenize; a cut clue ends on a comma or a conjunction.
const JA_DANGLING = /([、，,・]|および|及び|または|又は|並びに|ならびに|あるいは|もしくは)$/;

export function endsDangling(clue: string, lang: string): boolean {
  if (lang === 'ja') return JA_DANGLING.test(clue.trim());
  const last = (clue.toLowerCase().match(/\p{L}+/gu) ?? []).pop();
  return !!last && !!FUNCTION_WORDS[lang]?.has(last);
}
