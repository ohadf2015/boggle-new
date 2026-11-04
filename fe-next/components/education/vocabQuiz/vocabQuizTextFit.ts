// Size steps by length so a definition-length prompt or choice wraps whole instead of truncating on a 390px phone.
export function promptSizeClass(text: string): string {
  const len = text.trim().length;
  if (len <= 18) return 'text-[clamp(2.25rem,11vw,4rem)] [@media(max-width:639px)_and_(min-height:800px)]:text-[3.5rem] leading-none';
  if (len <= 40) return 'text-[clamp(1.375rem,6.5vw,2.25rem)] leading-tight';
  return 'text-[clamp(1.125rem,5vw,1.75rem)] leading-snug';
}

// One size per question so no card's word looks smaller than its neighbour's; a phrase-length set steps down together.
export function choiceSetSizeClass(choices: readonly string[]): string {
  const longest = Math.max(0, ...choices.map((c) => c.trim().length));
  if (longest <= 10) return 'text-[clamp(1.5rem,7.4vw,1.75rem)] sm:text-[2rem] leading-tight';
  if (longest <= 24) return 'text-[1.375rem] sm:text-[1.75rem] leading-tight';
  return 'text-lg sm:text-xl leading-snug';
}
