/**
 * Hand a classroom off to Google Classroom without asking Google for anything.
 *
 * Measured 2026-08-27: our create-flow is 3 clicks to a join code (Google Classroom's own is 6),
 * and 33 of 35 approved teachers still finished nothing. The step they stall on is the one AFTER
 * the code — getting 28 children to type six characters. Google Classroom already holds that
 * class, and every one of those students is already signed in to it.
 *
 * `https://classroom.google.com/share` is Google's own share dialog. `url` is the only required
 * parameter and the flow involves NO OAuth, NO API key and NO credential of any kind: Google
 * prompts the teacher inside its own dialog, they pick a class, and we never learn which one.
 *
 * That is the entire reason this exists in preference to the Classroom API. The API route needs
 * `classroom.rosters.readonly`, which is a sensitive scope (weeks of Google verification, capped
 * at 100 users until it clears) and which returns the Google identities of minors — a privacy
 * decision this project has not made. See docs/2026-08-27-google-classroom-integration.md.
 *
 * Pure: no network, no side effects, no browser APIs. Safe on the server.
 */

export interface GoogleClassroomShareArgs {
  /** Absolute http(s) URL a student can open to join — the code lives in its path. */
  joinUrl: string;
  /** Post title. Caller localises it; blank/whitespace is omitted rather than sent empty. */
  title?: string;
  /** Post body. Same rules as title. */
  body?: string;
}

const SHARE_ENDPOINT = 'https://classroom.google.com/share';

/**
 * Build the share-dialog URL.
 *
 * @throws if `joinUrl` is not an absolute http(s) URL. The result is placed in an anchor a teacher
 * clicks, so a `javascript:` or otherwise unparseable value must never survive to the DOM.
 */
export function buildGoogleClassroomShareUrl({ joinUrl, title, body }: GoogleClassroomShareArgs): string {
  let parsed: URL;
  try {
    parsed = new URL(joinUrl);
  } catch {
    throw new Error(`buildGoogleClassroomShareUrl: joinUrl is not a valid URL: ${joinUrl}`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`buildGoogleClassroomShareUrl: joinUrl must be http(s), got ${parsed.protocol}`);
  }

  const share = new URL(SHARE_ENDPOINT);
  share.searchParams.set('url', joinUrl);
  // Announcement rather than assignment: this is "come and join us", not graded work, and the
  // Stream is where students actually look. An assignment would also demand a due date.
  share.searchParams.set('itemtype', 'announcement');

  // Only send what we actually have — Google renders whatever it is given, so an empty title
  // produces an empty post. The join code is deliberately NOT repeated as its own parameter;
  // it already lives in the URL path, and duplicating it would put it in referrer logs and
  // browser history for no benefit.
  const trimmedTitle = title?.trim();
  if (trimmedTitle) share.searchParams.set('title', trimmedTitle);
  const trimmedBody = body?.trim();
  if (trimmedBody) share.searchParams.set('body', trimmedBody);

  return share.toString();
}

/**
 * One-click Google Classroom post for a 3-min reteach Live from missed words.
 *
 * Reuses Phase 1 share dialog (no OAuth). The linked page is either the live
 * room (when `gameCode` is known) or the class-gap card (missed words, no
 * student names). Class-level only — never put student names in title/body.
 */
export interface ReteachLiveShareArgs {
  /** Absolute http(s) URL students open — room join or class-gap card. */
  joinUrl: string;
  lessonName: string;
  missedWords: string[];
  /** Already-localised title; optional override. */
  title?: string;
  /** Already-localised body; optional override. */
  body?: string;
}

export function buildReteachLiveJoinUrl(opts: {
  locale: string;
  gameCode?: string | null;
  /** Absolute class-gap URL used when there is no live room to join. */
  classGapUrl: string;
  origin?: string;
}): string {
  const code = (opts.gameCode || '').trim();
  if (code) {
    const origin = opts.origin || 'https://www.lexiclash.live';
    const locale = (opts.locale || 'en').split('-')[0];
    return `${origin}/${locale}/multiplayer?room=${encodeURIComponent(code)}&classroom=true`;
  }
  return opts.classGapUrl;
}

export function buildReteachLiveGoogleClassroomShareUrl({
  joinUrl,
  lessonName,
  missedWords,
  title,
  body,
}: ReteachLiveShareArgs): string {
  const words = (missedWords || []).map((w) => w.trim()).filter(Boolean).slice(0, 12);
  const lesson = (lessonName || '').trim() || 'class';
  const defaultTitle = title?.trim() || `3-min reteach Live — ${lesson}`;
  const defaultBody =
    body?.trim() ||
    (words.length
      ? `Tap to join a quick Live reteach on: ${words.join(', ')}. No student names — class words only.`
      : `Tap to join a quick Live reteach for ${lesson}.`);
  return buildGoogleClassroomShareUrl({
    joinUrl,
    title: defaultTitle,
    body: defaultBody,
  });
}

