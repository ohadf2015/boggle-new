const IN_PATH = /\/join\/([A-Za-z0-9]{6})(?![A-Za-z0-9])/;
const IN_QUERY = /[?&]code=([A-Za-z0-9]{6})(?![A-Za-z0-9])/;

/** The code inside a pasted invite link, or null when the text is not a link to /join. */
export function extractJoinCode(raw: string): string | null {
  const hit = IN_PATH.exec(raw) ?? (/\/join\b/.test(raw) ? IN_QUERY.exec(raw) : null);
  return hit ? hit[1].toUpperCase() : null;
}
