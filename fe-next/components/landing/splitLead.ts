/** First sentence for a hero lead, the rest for the hero's `more`; no characters are dropped. */
export function splitLead(text: string): [string, string] {
  const match = text.match(/^(.+?(?:[.!?](?=\s)|。))\s*(\S[\s\S]*)$/);
  return match ? [match[1], match[2]] : [text, ''];
}
