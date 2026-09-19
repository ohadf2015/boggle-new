/**
 * LexiClash shares never carry emoji (rendered OG image + plain text only).
 * Applied at the share choke points so a stray emoji in a translation or a
 * builder can't leak into what players paste.
 */
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}️‍⃣]/gu;

export function stripEmoji(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(EMOJI, '').replace(/[ \t]{2,}/g, ' ').trim())
    .join('\n');
}
