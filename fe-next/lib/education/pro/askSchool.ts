export type UpgradeTab = 'teacher' | 'school';

const MAX_NAME = 60;
const LINKISH = /(https?:|www\.|[a-z0-9-]+\.(com|net|org|io|co|me|ly|xyz|info|biz|app|live|edu|gov|ru|il|se|jp|es|uk|us)\b|@|[<>{}[\]\\/])/i;

// The requester name is printed on our page from a URL anyone can craft, so it must never carry a link.
export function sanitizeRequesterName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const name = raw.replace(/\s+/g, ' ').trim();
  if (!name || LINKISH.test(name)) return '';
  return name.slice(0, MAX_NAME);
}

export function buildAskSchoolLink({ origin, locale, name }: { origin: string; locale: string; name?: string }): string {
  const url = new URL(`/${locale}/teacher/upgrade`, origin);
  url.searchParams.set('plan', 'school');
  const clean = sanitizeRequesterName(name);
  if (clean) url.searchParams.set('for', clean);
  return url.toString();
}

export function readAskSchoolParams(params: URLSearchParams): { tab: UpgradeTab; requester: string } {
  return {
    tab: params.get('plan') === 'school' ? 'school' : 'teacher',
    requester: sanitizeRequesterName(params.get('for')),
  };
}

export function buildMailtoHref(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
