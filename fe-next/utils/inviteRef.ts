/**
 * Invite-ref persistence: capture `?ref=<username>` from invite links and replay
 * after sign-up so the invitee auto-sends a friend request to the inviter
 * (no manual search step). See AddFriendDialog where the link is generated.
 */

export const INVITE_REF_KEY = 'lc_invite_ref';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const USERNAME_RE = /^[a-zA-Z0-9_.-]{2,32}$/;

interface StoredRef {
  username: string;
  ts: number;
}

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function captureInviteRef(
  username: string | null | undefined,
  currentUsername?: string | null
): void {
  if (!username) return;
  const trimmed = username.trim();
  if (!trimmed || !USERNAME_RE.test(trimmed)) return;
  if (currentUsername && trimmed.toLowerCase() === currentUsername.trim().toLowerCase()) {
    return;
  }
  const storage = safeStorage();
  if (!storage) return;
  try {
    const payload: StoredRef = { username: trimmed, ts: Date.now() };
    storage.setItem(INVITE_REF_KEY, JSON.stringify(payload));
  } catch {
    /* quota / privacy mode — ignore */
  }
}

export function peekInviteRef(): string | null {
  const storage = safeStorage();
  if (!storage) return null;
  const raw = storage.getItem(INVITE_REF_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredRef;
    if (!parsed?.username) return null;
    if (Date.now() - parsed.ts > TTL_MS) {
      storage.removeItem(INVITE_REF_KEY);
      return null;
    }
    return parsed.username;
  } catch {
    return null;
  }
}

export function clearInviteRef(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(INVITE_REF_KEY);
  } catch {
    /* noop */
  }
}

interface FoundUser {
  username: string;
  odUserId: string;
}

interface ConsumeDeps {
  searchUsers: (query: string) => Promise<Array<{ username: string; odUserId: string }>>;
  sendFriendRequest: (userId: string) => Promise<{ success: boolean; error?: string }>;
}

export type ConsumeResult =
  | { username: string; success: true }
  | { username: string; success: false; reason: 'not_found' }
  | { username: string; success: false; reason: 'send_failed'; error?: string };

export async function consumePendingInviteRef(
  deps: ConsumeDeps
): Promise<ConsumeResult | null> {
  const username = peekInviteRef();
  if (!username) return null;

  let match: FoundUser | undefined;
  try {
    const results = await deps.searchUsers(username);
    match = results.find(
      (r) => r.username.toLowerCase() === username.toLowerCase()
    );
  } catch {
    // Network failures: leave ref in place so a later auth event can retry.
    return null;
  }

  if (!match) {
    clearInviteRef();
    return { username, success: false, reason: 'not_found' };
  }

  let sendResult: { success: boolean; error?: string };
  try {
    sendResult = await deps.sendFriendRequest(match.odUserId);
  } catch {
    clearInviteRef();
    return { username, success: false, reason: 'send_failed' };
  }

  clearInviteRef();
  if (sendResult.success) {
    return { username, success: true };
  }
  return {
    username,
    success: false,
    reason: 'send_failed',
    error: sendResult.error,
  };
}
