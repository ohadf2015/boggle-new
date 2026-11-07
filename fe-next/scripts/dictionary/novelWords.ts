/** Prints (JSON) the words the game dictionary does NOT already accept. Usage: tsx novelWords.ts <lang> '<json array>' */
import { isValidWordLoaded } from '../../backend/dictionary';
import { normalizeWord } from '../../shared/utils/wordNormalization';
import type { Language } from '../../shared/types/game';

async function main(): Promise<void> {
  const [lang, json] = process.argv.slice(2) as [Language, string];
  const words = [...new Set((JSON.parse(json) as string[]).map((w) => normalizeWord(w.trim(), lang)).filter(Boolean))];
  const novel: string[] = [];
  for (const w of words) if (!(await isValidWordLoaded(w, lang))) novel.push(w);
  console.log(JSON.stringify(novel));
  process.exit(0);
}
void main();
