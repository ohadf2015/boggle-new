/** Mirrors PARENT_REPORT_TOKEN_DAYS without pulling the signing module into the browser. */
export const PARENT_LINK_DAYS = 30;

export interface ParentLink {
  studentId: string;
  name: string;
  path: string;
}

export function absoluteReportUrl(origin: string, locale: string, path: string): string {
  return `${origin}/${locale}${path}`;
}

function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n']/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function parentLinksToCsv(
  links: ParentLink[],
  opts: { origin: string; locale: string; studentHeader: string; linkHeader: string },
): string {
  const rows = [
    [opts.studentHeader, opts.linkHeader],
    ...links.map((l) => [l.name, absoluteReportUrl(opts.origin, opts.locale, l.path)]),
  ];
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

export function parentLinksToText(links: ParentLink[], opts: { origin: string; locale: string }): string {
  return links.map((l) => `${l.name}: ${absoluteReportUrl(opts.origin, opts.locale, l.path)}`).join('\n');
}
