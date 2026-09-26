import React from 'react';

/**
 * Natural wrap seams inside a single username token: after `_ - .`, at a
 * camelCase hump (lower→Upper) and at a letter→digit boundary. Spaces need no
 * help — the browser already wraps there — so Hebrew names stay whole words.
 * (Char tests, not a lookbehind regex: that is a parse-time SyntaxError on iOS < 16.4.)
 */
const SEPARATOR = /[_\-.]/;
const LOWER = /\p{Ll}/u;
const UPPER = /\p{Lu}/u;
const LETTER = /\p{L}/u;
const DIGIT = /\p{N}/u;

function isSeam(prev: string, next: string): boolean {
  if (/\s/.test(prev) || /\s/.test(next)) return false;
  if (SEPARATOR.test(prev)) return !SEPARATOR.test(next);
  if (LOWER.test(prev) && UPPER.test(next)) return true;
  return LETTER.test(prev) && DIGIT.test(next);
}

/** Split a name at its wrap seams; joining the result always gives the name back. */
export function seatNameSegments(name: string): string[] {
  const chars = Array.from(name);
  const out: string[] = [];
  let current = '';
  chars.forEach((ch, i) => {
    if (i > 0 && isSeam(chars[i - 1], ch)) {
      out.push(current);
      current = '';
    }
    current += ch;
  });
  out.push(current);
  return out;
}

/**
 * A seat name with `<wbr>` at each seam. Pair it with `text-balance` +
 * `line-clamp-2`: "LobJoinTp4s0p" then wraps as "LobJoin / Tp4s0p" instead of
 * breaking at any character and orphaning "0p".
 */
export function SeatNameText({ name }: { name: string }) {
  const parts = seatNameSegments(name);
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <wbr />}
          {part}
        </React.Fragment>
      ))}
    </>
  );
}
