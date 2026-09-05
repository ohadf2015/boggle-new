/**
 * Unified admin navigation config — single source of truth for both the
 * desktop sidebar and the mobile bottom nav. Pure module (no React/lucide)
 * so the active-route logic is fast and exhaustively testable.
 *
 * IA: 5 primary buckets. Combined buckets own NON-ADJACENT routes
 * (Content owns /curators + /connections-review; People owns /guests +
 * /teacher-access) — so active detection is prefix-set membership, NOT a
 * single startsWith. That mismatch is the classic bug this module prevents.
 *
 * Icons are referenced by string `iconKey` and mapped to lucide components
 * in the React layer (see adminNavIcons).
 */

export type AdminBadgeKey = 'moderation';

export interface AdminNavBucket {
  /** Stable key, also used for translation/active comparisons. */
  key: string;
  /** Translation key for the visible label. */
  labelKey: string;
  /** String name mapped to a lucide icon in the component layer. */
  iconKey: string;
  /** Route (relative to /{lang}/admin) the tab navigates to. '' = root. */
  defaultPath: string;
  /** Routes (relative) this bucket is the active owner of. */
  ownedPrefixes: string[];
  /** Which live badge count, if any, renders on this tab. */
  badge?: AdminBadgeKey;
  /** True for the "More" tab: opens an overflow sheet, no direct nav. */
  isOverflow?: boolean;
}

export interface AdminNavLeaf {
  key: string;
  labelKey: string;
  iconKey: string;
  defaultPath: string;
}

/**
 * The 4 destination buckets + the More overflow trigger, in display order.
 * No `home` tab — exiting the admin zone lives inside the More sheet so it
 * can never be mistaken for "admin overview".
 */
export const ADMIN_PRIMARY_TABS: AdminNavBucket[] = [
  {
    key: 'overview',
    labelKey: 'admin.sidebar.overview',
    iconKey: 'LayoutDashboard',
    defaultPath: '',
    ownedPrefixes: [''],
  },
  {
    key: 'content',
    labelKey: 'admin.sidebar.content',
    iconKey: 'BookOpen',
    defaultPath: '/content',
    ownedPrefixes: [
      '/content',
      '/dictionary',
      '/invalid-words',
      '/milog-words',
      '/words',
      '/wikipedia-words',
      '/word-bank',
      '/connections-review',
      '/curators',
    ],
  },
  {
    key: 'moderation',
    labelKey: 'admin.sidebar.moderation',
    iconKey: 'ShieldAlert',
    defaultPath: '/moderation',
    ownedPrefixes: ['/moderation'],
    badge: 'moderation',
  },
  {
    key: 'people',
    labelKey: 'admin.sidebar.people',
    iconKey: 'Users',
    defaultPath: '/players',
    ownedPrefixes: ['/players', '/guests', '/teacher-access', '/teacher-pro', '/school-leads', '/blocklist'],
  },
  {
    key: 'more',
    labelKey: 'admin.sidebar.more',
    iconKey: 'Menu',
    defaultPath: '',
    ownedPrefixes: [],
    isOverflow: true,
  },
];

/**
 * Items shown inside the More sheet. `analytics`/`system`/`web-vitals` are
 * real admin routes; `exit` leaves the admin zone (handled in the component).
 */
export const ADMIN_OVERFLOW_ITEMS: AdminNavLeaf[] = [
  {
    key: 'analytics',
    labelKey: 'admin.sidebar.analytics',
    iconKey: 'BarChart3',
    defaultPath: '/analytics',
  },
  {
    key: 'system',
    labelKey: 'admin.sidebar.system',
    iconKey: 'Settings',
    defaultPath: '/system',
  },
  {
    key: 'webVitals',
    labelKey: 'admin.nav.webVitals',
    iconKey: 'Activity',
    defaultPath: '/web-vitals',
  },
  {
    key: 'exit',
    labelKey: 'admin.nav.exitToSite',
    iconKey: 'LogOut',
    defaultPath: '',
  },
];

/**
 * Leaf sub-routes per bucket — the single source consumed by both the
 * desktop sidebar (inline expand) and the mobile AdminSubNav. Keyed by the
 * primary bucket key.
 */
export const ADMIN_BUCKET_CHILDREN: Record<string, AdminNavLeaf[]> = {
  content: [
    { key: 'dictionary', labelKey: 'admin.nav.dictionary', iconKey: 'BookOpen', defaultPath: '/dictionary' },
    { key: 'invalid-words', labelKey: 'admin.nav.invalidWords', iconKey: 'AlertTriangle', defaultPath: '/invalid-words' },
    { key: 'milog-words', labelKey: 'admin.nav.milogWords', iconKey: 'BookCheck', defaultPath: '/milog-words' },
    { key: 'words', labelKey: 'admin.nav.dailyChallenge', iconKey: 'Calendar', defaultPath: '/words' },
    { key: 'wikipedia-words', labelKey: 'admin.nav.wikipediaWords', iconKey: 'Globe', defaultPath: '/wikipedia-words' },
    { key: 'word-bank', labelKey: 'admin.nav.wordBank', iconKey: 'Database', defaultPath: '/word-bank' },
    { key: 'connections-review', labelKey: 'admin.sidebar.puzzleReview', iconKey: 'Puzzle', defaultPath: '/connections-review' },
    { key: 'curators', labelKey: 'curator.admin.title', iconKey: 'Languages', defaultPath: '/curators' },
  ],
  people: [
    { key: 'players', labelKey: 'admin.sidebar.players', iconKey: 'Users', defaultPath: '/players' },
    { key: 'guests', labelKey: 'admin.nav.guests', iconKey: 'UserRound', defaultPath: '/guests' },
    { key: 'teacher-access', labelKey: 'admin.nav.teacherAccess', iconKey: 'GraduationCap', defaultPath: '/teacher-access' },
    { key: 'teacher-pro', labelKey: 'admin.nav.teacherPro', iconKey: 'Gift', defaultPath: '/teacher-pro' },
    { key: 'school-leads', labelKey: 'admin.nav.schoolLeads', iconKey: 'Building2', defaultPath: '/school-leads' },
    { key: 'blocklist', labelKey: 'admin.sidebar.blocklist', iconKey: 'Ban', defaultPath: '/blocklist' },
  ],
};

/** Boundary-safe prefix match: whole-segment, never a raw substring. */
function matchesPrefix(cleanPath: string, prefix: string): boolean {
  if (prefix === '') {
    return cleanPath === '' || cleanPath === '/';
  }
  return cleanPath === prefix || cleanPath.startsWith(prefix + '/');
}

/**
 * Resolve which primary tab should be highlighted for a given route.
 * @param cleanPath pathname with the `/{lang}/admin` base stripped.
 * @returns the primary tab key, `'more'` for overflow routes, or `null`.
 *
 * Most-specific (longest) prefix wins, so a leaf like `/content/dictionary`
 * beats the bucket root `/content` — irrelevant here since both map to the
 * same bucket, but it keeps the matcher correct if buckets ever overlap.
 */
export function getActiveAdminTab(cleanPath: string): string | null {
  // Overview is an exact-root match and must be checked first so deeper
  // routes never collapse back onto it.
  if (cleanPath === '' || cleanPath === '/') return 'overview';

  let bestKey: string | null = null;
  let bestLen = -1;

  for (const tab of ADMIN_PRIMARY_TABS) {
    if (tab.isOverflow) continue;
    for (const prefix of tab.ownedPrefixes) {
      if (prefix === '') continue; // overview handled above
      if (matchesPrefix(cleanPath, prefix) && prefix.length > bestLen) {
        bestKey = tab.key;
        bestLen = prefix.length;
      }
    }
  }
  if (bestKey) return bestKey;

  // Overflow routes light up the More tab.
  for (const item of ADMIN_OVERFLOW_ITEMS) {
    if (item.defaultPath && matchesPrefix(cleanPath, item.defaultPath)) {
      return 'more';
    }
  }

  return null;
}
