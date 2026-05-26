/**
 * Shiritori single-player bot dictionary — a curated hiragana pool that the
 * bot draws from. Player words go through /api/dictionary/check (the full
 * server dict). This curated list ensures the bot has fluent moves for every
 * common head kana without shipping the ~9.4k server dictionary to the
 * client. ~120 entries, hand-picked common nouns/verbs.
 *
 * Tier is a difficulty hint: easy = short common words, hard = longer/rarer.
 */
export interface BotWord {
  word: string;
  tier: 'easy' | 'medium' | 'hard';
}

export const BOT_DICT: BotWord[] = [
  // あ row
  { word: 'あめ', tier: 'easy' },
  { word: 'あさ', tier: 'easy' },
  { word: 'あひる', tier: 'easy' },
  { word: 'あんこ', tier: 'medium' },
  { word: 'あした', tier: 'easy' },
  { word: 'いぬ', tier: 'easy' },
  { word: 'いす', tier: 'easy' },
  { word: 'いちご', tier: 'easy' },
  { word: 'いえ', tier: 'easy' },
  { word: 'いと', tier: 'medium' },
  { word: 'うみ', tier: 'easy' },
  { word: 'うた', tier: 'easy' },
  { word: 'うし', tier: 'easy' },
  { word: 'うちゅう', tier: 'medium' },
  { word: 'えき', tier: 'easy' },
  { word: 'えんぴつ', tier: 'medium' },
  { word: 'えほん', tier: 'easy' },
  { word: 'おに', tier: 'easy' },
  { word: 'おちゃ', tier: 'easy' },
  { word: 'おかし', tier: 'easy' },
  // か行
  { word: 'かさ', tier: 'easy' },
  { word: 'かに', tier: 'easy' },
  { word: 'かめ', tier: 'easy' },
  { word: 'かばん', tier: 'medium' },
  { word: 'きつね', tier: 'easy' },
  { word: 'きのこ', tier: 'easy' },
  { word: 'きって', tier: 'medium' },
  { word: 'くつ', tier: 'easy' },
  { word: 'くも', tier: 'easy' },
  { word: 'くるま', tier: 'easy' },
  { word: 'けむり', tier: 'medium' },
  { word: 'けいたい', tier: 'medium' },
  { word: 'こま', tier: 'medium' },
  { word: 'こおり', tier: 'medium' },
  { word: 'こども', tier: 'easy' },
  // さ行
  { word: 'さくら', tier: 'easy' },
  { word: 'さかな', tier: 'easy' },
  { word: 'さる', tier: 'easy' },
  { word: 'しか', tier: 'easy' },
  { word: 'しま', tier: 'easy' },
  { word: 'しろ', tier: 'easy' },
  { word: 'すいか', tier: 'easy' },
  { word: 'すずめ', tier: 'medium' },
  { word: 'せみ', tier: 'easy' },
  { word: 'せかい', tier: 'medium' },
  { word: 'そら', tier: 'easy' },
  { word: 'そば', tier: 'easy' },
  // た行
  { word: 'たこ', tier: 'easy' },
  { word: 'たぬき', tier: 'easy' },
  { word: 'たいよう', tier: 'medium' },
  { word: 'ちず', tier: 'medium' },
  { word: 'ちか', tier: 'medium' },
  { word: 'ちょう', tier: 'easy' },
  { word: 'つき', tier: 'easy' },
  { word: 'つくえ', tier: 'easy' },
  { word: 'つばさ', tier: 'medium' },
  { word: 'てがみ', tier: 'medium' },
  { word: 'てんき', tier: 'easy' },
  { word: 'とけい', tier: 'easy' },
  { word: 'とり', tier: 'easy' },
  { word: 'とうふ', tier: 'medium' },
  // な行
  { word: 'なつ', tier: 'easy' },
  { word: 'なまえ', tier: 'easy' },
  { word: 'にじ', tier: 'easy' },
  { word: 'にんじん', tier: 'medium' },
  { word: 'ぬま', tier: 'medium' },
  { word: 'ねこ', tier: 'easy' },
  { word: 'ねずみ', tier: 'medium' },
  { word: 'のはら', tier: 'medium' },
  // は行
  { word: 'はな', tier: 'easy' },
  { word: 'はる', tier: 'easy' },
  { word: 'はち', tier: 'easy' },
  { word: 'はと', tier: 'medium' },
  { word: 'ひかり', tier: 'medium' },
  { word: 'ひと', tier: 'easy' },
  { word: 'ふね', tier: 'easy' },
  { word: 'ふゆ', tier: 'easy' },
  { word: 'へび', tier: 'easy' },
  { word: 'へや', tier: 'easy' },
  { word: 'ほし', tier: 'easy' },
  { word: 'ほん', tier: 'easy' },
  { word: 'ほたる', tier: 'medium' },
  // ま行
  { word: 'まど', tier: 'easy' },
  { word: 'まめ', tier: 'easy' },
  { word: 'みず', tier: 'easy' },
  { word: 'みなと', tier: 'medium' },
  { word: 'むし', tier: 'easy' },
  { word: 'むぎ', tier: 'medium' },
  { word: 'めがね', tier: 'easy' },
  { word: 'もも', tier: 'easy' },
  { word: 'もり', tier: 'easy' },
  // や行
  { word: 'やま', tier: 'easy' },
  { word: 'やね', tier: 'easy' },
  { word: 'ゆき', tier: 'easy' },
  { word: 'ゆめ', tier: 'easy' },
  { word: 'よる', tier: 'easy' },
  { word: 'よこ', tier: 'medium' },
  // ら行
  { word: 'らくだ', tier: 'medium' },
  { word: 'らっぱ', tier: 'medium' },
  { word: 'りす', tier: 'easy' },
  { word: 'りんご', tier: 'easy' },
  { word: 'るす', tier: 'medium' },
  { word: 'れんが', tier: 'medium' },
  { word: 'ろうそく', tier: 'medium' },
  // わ行
  { word: 'わに', tier: 'easy' },
  { word: 'わた', tier: 'medium' },
  { word: 'わかめ', tier: 'medium' },
];

export function botPoolForDifficulty(d: 'easy' | 'medium' | 'hard'): string[] {
  if (d === 'easy') return BOT_DICT.filter((w) => w.tier === 'easy').map((w) => w.word);
  if (d === 'medium') return BOT_DICT.filter((w) => w.tier !== 'hard').map((w) => w.word);
  return BOT_DICT.map((w) => w.word);
}
