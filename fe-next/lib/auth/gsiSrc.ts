const GSI_SRC = 'https://accounts.google.com/gsi/client';

let pinnedSrc: string | null = null;

// A second GSI copy (new `hl` after a client-side language switch) shares window globals with the first and crashes inside renderButton.
export function gsiClientSrc(language: string): string {
  const src = `${GSI_SRC}?hl=${language}`;
  if (typeof window === 'undefined') return src;
  pinnedSrc ??= src;
  return pinnedSrc;
}

export function __resetGsiClientSrcForTests(): void {
  pinnedSrc = null;
}
