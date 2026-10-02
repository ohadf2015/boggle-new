export type HelpSegment =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'label'; key: string }
  | { type: 'link'; value: string; target: string };

const TOKEN = /\[\[([\w.]+)\]\]|\*\*(.+?)\*\*|\[([^\]]+)\]\(((?:help|app):[^)\s]+)\)/g;

export function fillHelpVars(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/** `[[i18n.key]]` = the app's own button label, `**x**` = bold, `[text](help:slug|app:/path)` = link. */
export function parseHelpText(text: string): HelpSegment[] {
  const out: HelpSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ type: 'text', value: text.slice(last, at) });
    if (m[1]) out.push({ type: 'label', key: m[1] });
    else if (m[2]) out.push({ type: 'bold', value: m[2] });
    else out.push({ type: 'link', value: m[3], target: m[4] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

/** Plain-text rendering for JSON-LD and search, with chips resolved through `label`. */
export function helpPlainText(text: string, label: (key: string) => string): string {
  return parseHelpText(text)
    .map((s) => (s.type === 'label' ? label(s.key) : s.value))
    .join('');
}
