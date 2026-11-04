// The Japanese dictionary is hiragana and kanji, and a Japanese keyboard types ？ and ＊ full-width.
export function foldJapaneseInput(text: string): string {
  return text
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/？/g, '?')
    .replace(/＊/g, '*');
}
