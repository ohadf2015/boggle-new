export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function dayNumber(localDate: string): number {
  return Math.floor(Date.parse(`${localDate}T00:00:00Z`) / 86_400_000);
}
