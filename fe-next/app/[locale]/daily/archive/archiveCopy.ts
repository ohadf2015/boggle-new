/** `daily.archivePage.*` copy from an already-loaded translation tree (server components). */
export function archiveCopy(translations: Record<string, unknown> | null | undefined) {
  const section = (translations?.daily as Record<string, unknown> | undefined)?.archivePage as
    | Record<string, unknown>
    | undefined;
  return (key: string, vars: Record<string, string | number> = {}): string => {
    const raw = section?.[key];
    if (typeof raw !== 'string') return `daily.archivePage.${key}`;
    return raw.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
  };
}
