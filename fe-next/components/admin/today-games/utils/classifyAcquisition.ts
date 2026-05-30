export type AcquisitionKind =
  | 'search'
  | 'social'
  | 'ai'
  | 'portal'
  | 'email'
  | 'push'
  | 'ads'
  | 'referral'
  | 'direct'
  | 'unknown';

export interface AcquisitionTag {
  kind: AcquisitionKind;
  rawLabel: string | null;
  tooltip: string;
}

interface ClassifyInput {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer_source?: string | null;
  is_guest?: boolean;
}

const SEARCH = ['google', 'bing', 'duckduckgo', 'yandex', 'baidu', 'ecosia', 'brave', 'startpage', 'yahoo'];
const SOCIAL = [
  'facebook', 'fb', 'instagram', 'ig', 'twitter', 'x.com', 'tiktok', 'youtube', 'youtu.be',
  'reddit', 'pinterest', 'linkedin', 'discord', 'telegram', 'whatsapp', 'snapchat', 'threads',
  'tumblr', 'vk', 'weibo', 'line',
];
const AI = ['chatgpt', 'openai', 'perplexity', 'claude', 'anthropic', 'gemini', 'bard', 'copilot', 'you.com', 'poe.com'];
const PORTAL = [
  'crazygames', 'gamemonetize', 'gd', 'gamedistribution', 'kongregate', 'poki', 'miniclip',
  'y8', 'armorgames', 'addictinggames', 'silvergames', 'lagged', 'coolmathgames',
];
const MAIL = ['gmail', 'mail.google', 'outlook', 'hotmail', 'yahoo mail', 'mail.yahoo', 'mail.ru', 'proton', 'protonmail'];
// Internal app navigation / share tokens that leak into utm_source — NOT acquisition
// channels. Verified live (2026-05-30): mobile-lobby / solo-confirm / copy. Collapse
// to 'direct' so the host-acquisition view stays a clean channel breakdown.
const INTERNAL = ['mobile-lobby', 'lobby', 'solo-confirm', 'copy', 'in-app', 'app', 'mobile-app', 'player_invite'];

function host(value: string): string {
  if (!/^https?:\/\//i.test(value)) return value.toLowerCase();
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function matches(needle: string, list: string[]): boolean {
  return list.some((entry) => needle === entry || needle.includes(entry));
}

export function classifyAcquisition(input: ClassifyInput): AcquisitionTag {
  const utm = (input.utm_source || '').toLowerCase().trim();
  const medium = (input.utm_medium || '').toLowerCase().trim();
  const campaign = (input.utm_campaign || '').toLowerCase().trim();
  const referrer = (input.referrer_source || '').trim();
  const referrerHost = referrer ? host(referrer) : '';

  const tooltipParts: string[] = [];
  if (utm) tooltipParts.push(`utm_source=${utm}`);
  if (medium) tooltipParts.push(`utm_medium=${medium}`);
  if (campaign) tooltipParts.push(`utm_campaign=${campaign}`);
  if (referrer) tooltipParts.push(`referrer=${referrerHost}`);
  const tooltip = tooltipParts.join(' · ');

  // Explicit medium signals first — most reliable.
  if (medium === 'email' || matches(utm, MAIL) || matches(referrerHost, MAIL)) {
    return { kind: 'email', rawLabel: utm || referrerHost || null, tooltip };
  }
  if (medium === 'push' || medium === 'notification' || utm === 'push' || utm === 'fcm') {
    return { kind: 'push', rawLabel: campaign || utm || null, tooltip };
  }
  if (['cpc', 'paid', 'ppc', 'ads', 'display', 'cpm', 'adwords'].includes(medium)) {
    return { kind: 'ads', rawLabel: campaign || utm || null, tooltip };
  }

  // Internal app navigation / share tokens are not acquisition channels → direct.
  if (utm && INTERNAL.includes(utm)) {
    return { kind: 'direct', rawLabel: null, tooltip };
  }

  // Source / referrer host classification.
  const needle = utm || referrerHost;
  if (needle) {
    if (matches(needle, AI)) return { kind: 'ai', rawLabel: needle, tooltip };
    if (matches(needle, SEARCH)) return { kind: 'search', rawLabel: needle, tooltip };
    if (matches(needle, SOCIAL)) return { kind: 'social', rawLabel: needle, tooltip };
    if (matches(needle, PORTAL)) return { kind: 'portal', rawLabel: needle, tooltip };
  }

  if (medium === 'referral' || referrerHost) {
    return { kind: 'referral', rawLabel: utm || referrerHost || null, tooltip };
  }

  if (utm) {
    return { kind: 'unknown', rawLabel: utm, tooltip };
  }

  if (input.is_guest) {
    return { kind: 'direct', rawLabel: null, tooltip: '' };
  }

  return { kind: 'unknown', rawLabel: null, tooltip: '' };
}

export const ACQUISITION_TONE: Record<AcquisitionKind, string> = {
  search: 'bg-neo-cyan/20 text-neo-cyan border-neo-cyan/40',
  social: 'bg-neo-pink/20 text-neo-pink border-neo-pink/40',
  ai: 'bg-neo-purple/20 text-neo-purple border-neo-purple/40',
  portal: 'bg-neo-lime/20 text-neo-lime border-neo-lime/40',
  email: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  push: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  ads: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  referral: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  direct: 'bg-slate-600/40 text-slate-300 border-slate-500/50',
  unknown: 'bg-slate-700/40 text-slate-400 border-slate-600/50',
};
