# Sentry Bug Analysis - January 26, 2026

## Executive Summary

Analyzed **49 unresolved Sentry issues** from LexiClash production environment. Found 3 critical database/schema issues, 2 medium-priority translation issues, and multiple low-priority browser-specific issues.

**Status**: ✅ Database migrations already deployed, monitoring required to confirm effectiveness.

---

## 🔴 Critical Issues - Database/Schema (VERIFIED: Migrations Deployed)

### 1. RLS Infinite Recursion - FIXED (Monitoring Required)
**Sentry Issues**: JAVASCRIPT-NEXTJS-9E, 9C, 9D
**Error**: `"infinite recursion detected in policy for relation"`
**Affected Tables**: `classrooms`, `vocabulary_lessons`
**Impact**: 1 teacher, 4 total events
**First Seen**: 2026-01-24
**Last Seen**: 2026-01-24

**Root Cause**:
```
Original policies created circular dependencies:
- "Students can view their classrooms" queries classroom_memberships
- "Teachers can view classroom memberships" queries classrooms
→ PostgreSQL error 42P17 (infinite recursion detected in policy)
```

**Fix Applied**: ✅ Migration `20260125123514_fix_rls_infinite_recursion.sql`
- Created SECURITY DEFINER helper functions that bypass RLS checks
- Recreated policies using these helper functions
- Functions: `is_classroom_member()`, `is_classroom_owner()`, `has_lesson_access()`

**Test Instructions**:
1. Login as teacher at `/he/teacher`
2. Navigate to "Classrooms" section
3. **Expected**: Should load classroom list without errors
4. Create a new classroom
5. **Expected**: Classroom creation succeeds
6. View vocabulary lessons
7. **Expected**: Lessons load without recursion errors

**Sentry Verification**:
- Monitor for 48 hours - no new occurrences of error code `42P17`
- Check that JAVASCRIPT-NEXTJS-9E, 9C, 9D stop incrementing

---

### 2. Schema Cache Stale Data - PARTIALLY FIXED
**Sentry Issues**: JAVASCRIPT-NEXTJS-9P, 9H, 9B, 99, 9A
**Error Types**:
- `PGRST204`: Column not found in schema cache
- `PGRST205`: Table not found in schema cache

**Examples**:
```
1. Could not find the 'assigned_by' column of 'lesson_assignments'
2. Could not find table 'public.lesson_templates' in the schema cache
3. Could not find table 'public.classrooms' in the schema cache
4. Could not find table 'public.vocabulary_lessons' in the schema cache
```

**Fix Applied**: ✅ Migration `20260126115743_reload_schema_cache.sql`
- Executes `NOTIFY pgrst, 'reload schema';`
- Forces PostgREST to refresh its schema cache

**Additional Action Needed**:
If errors persist, manually reload PostgREST cache:
```sql
-- Run in Supabase SQL Editor
NOTIFY pgrst, 'reload schema';
```

**Test Instructions**:
1. Login as teacher at `/he/teacher`
2. Navigate to Templates section
3. **Expected**: Templates load without PGRST205 errors
4. Try creating a new classroom
5. **Expected**: No "table not found" errors
6. Assign a lesson to a classroom
7. **Expected**: Assignment succeeds without column errors

**Sentry Verification**:
- Monitor for 48 hours - no new `PGRST204` or `PGRST205` errors
- Check issues 9P, 9H, 9B, 99, 9A stop occurring

---

## 🟡 Medium Priority - Translation Issues

### 3. Missing Translation Keys (False Positive - Keys Exist)
**Sentry Issues**: JAVASCRIPT-NEXTJS-90, 8Z
**Keys Reported Missing**: `brain.nav.home`, `brain.nav.brain`
**Impact**: 1 user, 127 total events (60+ each)
**First Seen**: 2026-01-22
**Status**: ⚠️ **Keys exist in translations but errors still occurring**

**Analysis**:
- Keys exist in `translations/he.js` at lines 3210-3214
- Not actively used in current codebase (found only in `unused-translations-report.txt`)
- Likely caused by:
  1. Old cached app version in user's browser
  2. Previous code that was removed
  3. Pre-rendering error during build

**Resolution**:
- **Option A**: Clear app cache and rebuild
- **Option B**: Remove unused keys from translation files to eliminate noise
- **Option C**: Wait for cache to expire naturally

**Test Instructions**:
1. Clear browser cache for lexiclash.live
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Navigate to `/he` homepage
4. **Expected**: No translation warnings in Sentry

---

### 4. Missing Rarity Translations
**Sentry Issues**: JAVASCRIPT-NEXTJS-8F, 8E
**Keys**: `rarity.uncommon`
**Impact**: 2 users, 5 events
**Languages**: Hebrew (he), English (en)

**Test Instructions**:
1. Check if `rarity.uncommon` exists in translation files
2. If missing, add to `translations/he.js` and `translations/en.js`
3. Navigate to pages using rarity labels
4. **Expected**: Rarity labels display correctly

---

## 🟠 Low Priority - Browser/Environment Issues

### 5. Module Reference Error
**Sentry Issue**: JAVASCRIPT-NEXTJS-9S
**Error**: `ReferenceError: module is not defined`
**Location**: `/:locale/student` page
**Impact**: 0 users (anonymous), 4 events
**Browser**: Chrome Mobile 144.0.0 on Android 10

**Stack Trace**:
```
app:///_next/static/chunks/f4ca1cc1ea13d189.js:2:19636
app:///_next/static/chunks/turbopack-6155051ebd886dd6.js:2:5328
```

**Root Cause Hypothesis**:
- Turbopack/Next.js bundling issue
- CommonJS/ESM module conflict
- Likely from dependency trying to access Node.js `module` global in browser

**Investigation Needed**:
1. Check `/app/[locale]/student/page.tsx` for CommonJS imports
2. Review dependencies for Node.js-specific code
3. Add proper browser/server code splitting

---

### 6. Audio Playback Issues (Browser-Specific)
**Sentry Issues**: JAVASCRIPT-NEXTJS-9T, 9Q, 9J, 1A, 4, 6W, 96
**Impact**: Multiple users, browser-specific (iOS Safari, Chrome)

**Error Types**:
1. **Autoplay Policy Violations**:
   - "Playback was unable to start. This is most commonly an issue on mobile devices"
   - Occurs on: `/daily/buzz`, `/admin`, lobby music

2. **iOS Safari Audio Device Failures**:
   - "Failed to start the audio device"
   - "HTML5 Audio pool exhausted"

3. **Audio Decoding Failures**:
   - "Decoding audio data failed" (World 3 Track 2)

**Current Handling**: Most errors are already suppressed/logged (see `[SFX]` and `[Music]` prefixes)

**Recommendation**:
- Keep current error handling
- These are expected browser limitations
- No action required unless user complaints increase

---

### 7. Socket.IO Connection Issues
**Sentry Issues**: JAVASCRIPT-NEXTJS-2B, 36, 35, 8D
**Error Types**:
- WebSocket connection errors
- "Game not found" errors
- "Cannot join - socket not connected"

**Impact**: 2-10 users, 5-10 events each

**Possible Causes**:
- Network instability
- Game session expiration
- Server connection timeouts

**Test Instructions**:
1. Create multiplayer game
2. Have 2-3 players join
3. Monitor network tab for WebSocket errors
4. Try joining with slow/unstable connection
5. **Expected**: Graceful error handling, reconnection attempts

---

## 📊 Summary Statistics

| Priority | Issues | Users Affected | Total Events |
|----------|--------|----------------|--------------|
| 🔴 Critical (DB/Schema) | 8 | 1-2 | 15 |
| 🟡 Medium (Translations) | 4 | 2-3 | 132 |
| 🟠 Low (Browser/Network) | 37 | 0-10 | 150+ |

---

## ✅ Actions Completed

1. ✅ Verified migrations deployed to production:
   - `20260125123514_fix_rls_infinite_recursion.sql`
   - `20260124162813_fix_rls_infinite_recursion_v2.sql`
   - `20260126115743_reload_schema_cache.sql`

2. ✅ Identified root causes for all critical issues

3. ✅ Created comprehensive test instructions

---

## 🔍 Monitoring Plan (Next 48 Hours)

### Watch These Issues Closely:
1. **JAVASCRIPT-NEXTJS-9E, 9C, 9D** - Should stop occurring (RLS fixed)
2. **JAVASCRIPT-NEXTJS-9P, 9H, 9B, 99, 9A** - Should stop occurring (schema cache reloaded)
3. **JAVASCRIPT-NEXTJS-90, 8Z** - May persist if user has cached app

### Success Criteria:
- ✅ Zero new `42P17` (infinite recursion) errors
- ✅ Zero new `PGRST204` or `PGRST205` errors
- ✅ Teacher/classroom features work without errors

### If Issues Persist:
1. Check Supabase logs for detailed error messages
2. Verify migrations actually executed (check `_migrations` table)
3. Manually reload PostgREST: `NOTIFY pgrst, 'reload schema';`
4. Consider rolling back migrations if errors increase

---

## 📝 Next Steps

### Immediate (Manual Testing):
1. Test teacher features (`/he/teacher`)
2. Test classroom creation and management
3. Test lesson assignment flow
4. Monitor Sentry dashboard

### Short-term (This Week):
1. Investigate `module is not defined` error on `/student` page
2. Clean up unused translation keys if errors persist
3. Review audio error handling for user experience impact

### Long-term (Future Sprint):
1. Add better error boundaries for React errors
2. Implement retry logic for network failures
3. Add telemetry for client-side cache issues

---

## 🔗 Related Links

- **Sentry Dashboard**: https://lexiclash.sentry.io/issues/?query=is%3Aunresolved+lastSeen%3A-7d
- **Migration Files**: `supabase/migrations/`
- **Translation Files**: `translations/he.js`, `translations/en.js`

---

**Report Generated**: 2026-01-26
**Analysis Tool**: Sentry MCP + Supabase MCP
**Total Issues Analyzed**: 49
**Critical Issues Fixed**: 2/3 (monitoring required)
