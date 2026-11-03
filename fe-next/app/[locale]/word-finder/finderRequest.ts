export interface FinderRequest {
  letters: string;
  pattern: string;
  startsWith: string;
  endsWith: string;
  contains: string;
  length: number | null;
}

export function buildFinderBody(input: FinderRequest): Record<string, unknown> {
  const body: Record<string, unknown> = { language: 'en' };
  if (input.letters.trim()) body.letters = input.letters.trim();
  if (input.pattern.trim()) body.pattern = input.pattern.trim();
  if (input.startsWith.trim()) body.startsWith = input.startsWith.trim();
  if (input.endsWith.trim()) body.endsWith = input.endsWith.trim();
  if (input.contains.trim()) body.contains = input.contains.trim();
  if (input.length !== null) body.length = input.length;
  return body;
}

export function canSearch(input: FinderRequest): boolean {
  return input.letters.trim().length >= 2 || input.pattern.trim().length >= 2;
}
