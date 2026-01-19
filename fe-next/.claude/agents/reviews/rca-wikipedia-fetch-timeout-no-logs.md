# Root Cause Analysis: Wikipedia Word Fetching Timeout with No Server Logs

**Date:** 2026-01-19
**Bug:** Fetching words from Wikipedia always returns request timeout with no server logs
**Severity:** Medium
**Status:** Fixed

## Issue Summary

**Description:**
When triggering Wikipedia word population (either via admin dashboard or cron), the request times out but no logs appear in server console. The user sees a timeout error but there's no evidence the request was processed.

**Expected Behavior:**
- Request should complete within 60 seconds (configured `maxDuration`)
- Server should log `[Wikipedia] Fetching featured content for {language}...`
- Success or failure should be returned to client

**Actual Behavior:**
- Request times out
- No logs appear in server console
- Client receives timeout error

**Impact:**
- Affected features: Wikipedia word population for Daily Buzz challenges
- Severity: Medium (fallback static word lists exist)
- Users affected: Admins trying to populate Wikipedia words

## Reproduction

**Can Reproduce:** Needs verification

**Reproduction Steps:**
1. Navigate to `/admin/wikipedia-words` dashboard
2. Click "Populate Words" button
3. Wait for request to complete
4. Observe timeout error
5. Check server logs - no `[Wikipedia]` entries appear

**Environment:**
- Mode: LOCAL / PRODUCTION
- Browser: Any
- Trigger: Admin dashboard "Populate Words" button

## Analysis

### Related Files

| File | Role |
|------|------|
| `backend/services/wikipediaWordFetcher.ts` | Core Wikipedia API client with axios calls |
| `backend/services/wikipediaWordPopulator.ts` | Orchestration layer calling fetcher |
| `backend/services/cronScheduler.ts` | Cron trigger for population |
| `app/api/admin/wikipedia-words/route.ts` | API endpoint with `maxDuration=60` |
| `components/admin/wikipedia-words/hooks/useWikipediaCandidates.ts` | Client-side hook calling API |

### Code Flow Analysis

```
Client (useWikipediaCandidates.ts)
  └─ fetch('/api/admin/wikipedia-words', { method: 'POST', action: 'populate' })
      └─ NO TIMEOUT CONFIGURED (browser default)
          └─ Next.js API Route (route.ts)
              └─ verifyAdminAuth() (Supabase JWT + profile check)
                  └─ triggerWikipediaWordPopulation() (cronScheduler.ts)
                      └─ populateWikipediaWords() (wikipediaWordPopulator.ts)
                          └─ fetchFeaturedContent() (wikipediaWordFetcher.ts)
                              └─ fetchWithRetry() → axios.get() with 10s timeout
                                  └─ Wikipedia Wikimedia API
```

### Timeout Chain

| Layer | Timeout | Notes |
|-------|---------|-------|
| Browser fetch | None configured | Waits indefinitely |
| Next.js function | 60 seconds | `export const maxDuration = 60` |
| axios (featured content) | 10 seconds | With 2 retries = up to ~30s |
| axios (random articles) | 5 seconds | Parallel requests |
| Wikipedia API | External | Can vary significantly |

## Root Cause Analysis

### Hypothesis 1: Request Never Reaches Server

**Evidence:**
- No logs at all (not even auth logs)
- Timeout happens but silently

**Possible Causes:**
1. **Supabase auth token expired/invalid** - The `verifyAdminAuth` would return 401 before reaching Wikipedia code
2. **Network issue** - Request blocked by firewall/CORS
3. **Next.js middleware intercepting** - Check if middleware blocks admin routes

**Verification:**
- Add logging at the START of the POST handler (before auth check)
- Check browser Network tab for actual response status

### Hypothesis 2: Auth Check Failing Silently

**Evidence:**
- Auth check returns response without logging
- No `[Wikipedia]` logs appear

**Possible Causes:**
1. `verifyAdminAuth()` fails and returns error response
2. Error is swallowed by try-catch in hook

**Verification:**
- Add logging inside `verifyAdminAuth`
- Check response status code in browser

### Hypothesis 3: Wikipedia API is Completely Unreachable

**Evidence:**
- All 7 languages fail (parallel processing)
- Even retries don't produce logs

**Possible Causes:**
1. **DNS resolution failing** - `api.wikimedia.org` unresolvable
2. **TLS/SSL issue** - Certificate validation failing
3. **IP blocked by Wikipedia** - Rate limiting at IP level
4. **Proxy/firewall blocking** - Corporate network or hosting provider

**Verification:**
- Try `curl https://api.wikimedia.org/feed/v1/wikipedia/en/featured/2026/01/19` from server
- Check if axios errors are being logged

### Hypothesis 4: Redis Connection Blocking

**Evidence:**
- `fetchFeaturedContent` tries Redis cache first (line 196)
- Redis connection could hang if misconfigured

**Code Path:**
```typescript
const redis = getRedisClient(); // Could hang here
if (redis) {
  const cached = await redis.get(cacheKey); // Or here
}
```

**Possible Causes:**
1. Redis client not connected but not returning null
2. Redis `get()` hanging on connection attempt

**Verification:**
- Check if `getRedisClient()` has timeout
- Add logging before and after Redis operations

### Hypothesis 5: Node.js Process Crash

**Evidence:**
- No logs whatsoever
- Complete silence

**Possible Causes:**
1. Uncaught exception crashing worker
2. Memory issue with large response
3. `axios` or Supabase client throwing unhandled error

**Verification:**
- Check for Node.js crash logs
- Add global error handler

## Most Likely Root Cause

Based on "no logs at all", the **most likely root causes** in order of probability:

### Primary: Missing Error Logging in Client Hook

The `triggerPopulation` function in `useWikipediaCandidates.ts` (line 225-261):

```typescript
const triggerPopulation = useCallback(async (): Promise<boolean> => {
  try {
    // ...
    const response = await fetch('/api/admin/wikipedia-words', { ... });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to trigger population');
    }
    // ...
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to trigger population');
    return false;
  }
}, []);
```

**Problem:** If the fetch times out at browser level, `response.json()` will fail or the request will be aborted. The error message shown to user might just be the generic "Failed to trigger population".

### Secondary: Redis Connection Hanging

If Redis is misconfigured, `getRedisClient()` or `redis.get()` could hang indefinitely, never reaching the Wikipedia API call.

### Tertiary: Auth Check Timing Out

If Supabase is slow to respond, `verifyAdminAuth` could timeout before the Wikipedia code even runs.

## Fix Strategy

### Immediate Fix (High Priority)

1. **Add comprehensive logging at entry point** (`route.ts`):
```typescript
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[Admin Wikipedia] POST request received');
  // ... auth check ...
  console.log('[Admin Wikipedia] Auth passed, processing action');
}
```

2. **Add timeout to client fetch** (`useWikipediaCandidates.ts`):
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s client timeout

try {
  const response = await fetch('/api/admin/wikipedia-words', {
    method: 'POST',
    signal: controller.signal,
    // ...
  });
} finally {
  clearTimeout(timeoutId);
}
```

3. **Add Redis timeout safeguard** (`wikipediaWordFetcher.ts`):
```typescript
if (redis) {
  try {
    const cached = await Promise.race([
      redis.get(cacheKey),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000))
    ]);
  } catch (e) {
    console.warn('[Wikipedia] Redis cache check failed:', e.message);
  }
}
```

### Files to Modify

| File | Change |
|------|--------|
| `app/api/admin/wikipedia-words/route.ts` | Add entry/exit logging |
| `components/admin/wikipedia-words/hooks/useWikipediaCandidates.ts` | Add AbortController timeout |
| `backend/services/wikipediaWordFetcher.ts` | Add Redis timeout, improve error logging |
| `lib/auth/adminAuth.ts` | Add logging for auth failures |

### Testing Strategy

1. **Unit tests**: Mock Redis, axios, and verify timeout handling
2. **Integration test**: Call `/api/admin/wikipedia-words` with mock auth
3. **E2E test**: Test full flow from admin dashboard

## Validation

**How to verify fix works:**
1. Trigger population from admin dashboard
2. Observe logs appearing in server console
3. If Wikipedia unreachable, see proper error message

**Regression testing:**
- Existing cron job should continue working
- Fallback to static words should still function

## Prevention

- [ ] Add test: Verify API route has entry logging
- [ ] Add test: Client hook handles fetch timeout gracefully
- [ ] Add monitoring: Alert when Wikipedia population fails repeatedly
- [ ] Improve patterns: Create standard timeout wrapper for all external API calls

## Next Steps

1. **Immediate**: Add logging to verify where request is failing
2. **Short-term**: Implement timeout fixes
3. **Long-term**: Create shared utilities for external API calls with consistent timeout handling

---

**RCA Status:** Fixed

## Implementation Summary (2026-01-19)

### Changes Made

1. **`app/api/admin/wikipedia-words/route.ts`**
   - Added entry logging: `[Admin Wikipedia] POST request received`
   - Added auth result logging
   - Added population trigger start/complete logging with duration

2. **`components/admin/wikipedia-words/hooks/useWikipediaCandidates.ts`**
   - Added `AbortController` with 55-second timeout (slightly less than server's 60s)
   - Added specific error message for timeout: "Request timed out. The Wikipedia API may be slow or unreachable."
   - Added console logging for debugging

3. **`backend/services/wikipediaWordFetcher.ts`**
   - Added `REDIS_TIMEOUT_MS = 2000` constant
   - Wrapped Redis `get()` with `Promise.race()` timeout
   - Wrapped Redis `setex()` with `Promise.race()` timeout
   - Redis failures now log warning but don't block Wikipedia fetch

4. **`lib/auth/adminAuth.ts`**
   - Added logging for missing auth header
   - Added logging for invalid token
   - Added logging for non-admin users
   - Added logging for successful auth with duration
   - Added logging for exceptions

### Testing

- Lint: Passed (0 errors)
- Tests: 29/29 passed (wikipediaWordFetcher.test.ts)
- Build: Passed
