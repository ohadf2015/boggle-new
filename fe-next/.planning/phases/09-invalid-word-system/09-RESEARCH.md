# Phase 9: Invalid Word System - Research

**Researched:** 2026-01-23
**Domain:** Admin word moderation, database tracking, UI management
**Confidence:** HIGH

## Summary

Phase 9 implements an invalid word tracking and approval system that complements Phase 8's Wikipedia integration. While Phase 8 is **admin-initiated** (admins pull words from Wikipedia), Phase 9 is **player-initiated** (system tracks words players try but get rejected).

**Current State:** Infrastructure is ~85% complete:
- ✅ Database table exists (`invalid_word_submissions`)
- ✅ RPC function exists (`record_invalid_word_submission`)
- ✅ `recordPlayerWrongWord()` calls the RPC correctly
- ✅ Admin routes exist (GET `/api/admin/invalid-words`, POST `/approve`, POST `/dismiss`)
- ✅ Admin page exists (`/admin/invalid-words`)
- ✅ InvalidWordsManager component exists
- ❌ **MISSING:** BulkApproveButton component (established pattern from Phase 8)
- ❌ **MISSING:** Tests for bulk approval flow

**Primary recommendation:** Add bulk approval capability following Phase 8's BulkApproveButton pattern. Individual approval works, but bulk approval improves admin efficiency.

## Standard Stack

### Core Components (Already Implemented)

| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| Database Table | `supabase/migrations/053_invalid_word_submissions.sql` | Track invalid word submissions | ✅ Complete |
| RPC Function | Same migration | Atomic counter increment | ✅ Complete |
| Admin Routes | `backend/routes/admin/wordModerationRoutes.ts` | GET, approve, dismiss endpoints | ✅ Complete |
| Admin Page | `app/[locale]/admin/invalid-words/page.tsx` | Admin UI wrapper | ✅ Complete |
| Manager Component | `components/admin/InvalidWordsManager.tsx` | Word list & filters | ✅ Complete |
| Tests | `components/admin/__tests__/InvalidWordsManager.test.tsx` | Component tests | ✅ Complete |

### Missing Component (Pattern from Phase 8)

| Component | Reference | Purpose | Status |
|-----------|-----------|---------|--------|
| BulkApproveButton | `components/admin/wikipedia-words/components/BulkApproveButton.tsx` | Batch approve selected words | ❌ Missing |

**Installation:**
No new packages needed. All dependencies already installed.

## Architecture Patterns

### Data Flow (Complete)

```
Player submits invalid word
   ↓ (wordHandler.ts line 297 or 629)
recordPlayerWrongWord(word, language, reason)
   ↓ (supabaseServer.ts line 1174)
RPC: record_invalid_word_submission
   ↓ (upsert with counter increment)
invalid_word_submissions table
   ↓ (submission_count >= 3 visible to admin)
Admin dashboard: /admin/invalid-words
   ↓ (InvalidWordsManager fetches GET /api/admin/invalid-words)
Admin clicks "Approve" → POST /api/admin/invalid-words/approve
   ↓
Word added to word_scores with positive votes
   ↓
Word now validates in gameplay
```

### Database Schema (Migration 053)

**Table: `invalid_word_submissions`**

```sql
CREATE TABLE invalid_word_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    submission_count INTEGER DEFAULT 1,
    reason TEXT CHECK (reason IN ('not_on_board', 'not_in_dictionary', 'peer_rejected')),
    first_submitted_at TIMESTAMPTZ DEFAULT NOW(),
    last_submitted_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,  -- NULL = pending, timestamp = approved/dismissed
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_invalid_word_language UNIQUE (word, language)
);
```

**Key Indexes:**
1. `idx_invalid_words_language_count` - For filtering & sorting by submission count
2. `idx_invalid_words_pending` - WHERE approved_at IS NULL AND submission_count >= 3 (admin view)
3. `idx_invalid_words_word` - Fast word lookup

**RPC Function Pattern:**

```sql
CREATE OR REPLACE FUNCTION record_invalid_word_submission(
    p_word TEXT,
    p_language TEXT,
    p_reason TEXT DEFAULT 'not_in_dictionary'
)
RETURNS void AS $$
BEGIN
    INSERT INTO invalid_word_submissions (word, language, reason, submission_count)
    VALUES (LOWER(TRIM(p_word)), LOWER(TRIM(p_language)), p_reason, 1)
    ON CONFLICT (word, language) DO UPDATE SET
        submission_count = invalid_word_submissions.submission_count + 1,
        last_submitted_at = NOW(),
        reason = COALESCE(EXCLUDED.reason, invalid_word_submissions.reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Pattern:** Atomic upsert with counter increment (same pattern as `player_words` table from migration 012).

### Admin Approval Pattern (from wordModerationRoutes.ts)

**Single Word Approval:**

```typescript
// POST /api/admin/invalid-words/approve
// Lines 755-846 in wordModerationRoutes.ts

1. Verify word exists in invalid_word_submissions
2. Calculate votesNeeded = max(10, min(submission_count * 2, 20))
   - More submissions = more votes (shows player demand)
   - Capped at 20 votes max
3. Upsert to word_scores with votesNeeded likes
4. Mark approved_at & approved_by in invalid_word_submissions
5. Remove from bot_word_blacklist if present
6. Optionally add to dictionary file
7. Audit log
```

**Key Decision:** Approval adds word to `word_scores`, not directly to dictionary. This means:
- Word becomes community-validated (same as Phase 8 Wikipedia words)
- Word immediately validates in gameplay (via `isDictionaryWord` → `checkWordScores`)
- Consistent with existing word validation architecture

### Bulk Approve Pattern (from Phase 8)

**Reference:** `components/admin/wikipedia-words/components/BulkApproveButton.tsx`

```typescript
// Pattern to follow:
1. Selection state: Set<string> of selected word IDs
2. Progress tracking: { completed, total, errors }
3. Sequential approval with rate limiting (5-10 words/sec)
4. Progress bar with pause/resume capability
5. Error handling: Continue on error, collect failures
6. Final summary: X approved, Y failed
```

**Why this pattern?**
- Prevents API timeout (Next.js 90s limit for serverless functions)
- Shows progress to admin (long-running operation UX)
- Graceful degradation (some approvals fail, others succeed)
- Admin can pause if needed

### Component Structure (InvalidWordsManager)

```typescript
// components/admin/InvalidWordsManager.tsx
// Current structure (lines 1-100):

1. State management
   - words: InvalidWord[]
   - loading, processing
   - filters: search, language, minCount
   - pagination: limit, offset

2. Fetch pattern
   - useCallback hook for fetchWords
   - Query params: search, language, minCount, limit, offset
   - Auth header: Bearer token

3. Filters UI
   - Search input (word text search)
   - Language dropdown (all, en, he, sv, ja, es)
   - Minimum count input (default: 3)

4. Table display
   - Columns: word, language, count, reason, dates
   - Action buttons per row: Approve, Dismiss
   - Loading states, empty states

5. Pagination
   - Prev/Next buttons
   - Show current range (X-Y of Z)
```

**Missing:** Checkbox selection for bulk approval (need to add this).

### Anti-Patterns to Avoid

1. **Don't approve without checking duplicates**
   - Word might already be in word_scores (admin approves twice)
   - Backend handles this with upsert, but causes confusion
   - **Solution:** Check if word exists before approval (or accept idempotent behavior)

2. **Don't batch approve in single API call**
   - Would cause timeout for 100+ words
   - **Solution:** Use sequential approval with progress tracking (Phase 8 pattern)

3. **Don't auto-approve based on count alone**
   - High count doesn't guarantee word is valid (could be common typo)
   - **Solution:** Admin review required (established in Phase 8 decision)

## Don't Hand-Roll

Problems that have existing solutions in this codebase:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bulk approval UI | Custom batch processor | BulkApproveButton pattern from Phase 8 | Handles progress, errors, pause/resume, tested |
| Word normalization | Custom trim/lowercase | `normalizeWord()` from `@/shared/utils/wordNormalization` | Language-aware (Hebrew, Spanish special handling) |
| Auth checks | Custom admin verification | Existing admin middleware in routes | Consistent security, audit logging |
| Dictionary insertion | Direct file writes | `dictionary.addApprovedWord()` | Thread-safe, cached, handles multiple languages |

**Key insight:** Phase 8 established patterns for Wikipedia word approval. Phase 9 should mirror those patterns for consistency.

## Common Pitfalls

### Pitfall 1: Forgetting to Check Dictionary Before Approval

**What goes wrong:**
Admin approves word that's already in static dictionary. Word gets added to `word_scores`, but dictionary check happens first (priority order), so word validates via dictionary, not word_scores. Admin thinks they added it, but it was already there.

**Why it happens:**
Dictionary validation has multiple layers:
1. Static dictionary files (highest priority)
2. Community words (word_scores with net_score >= 6)
3. AI validation (fallback)

**How to avoid:**
1. Check `isDictionaryWord()` before approval
2. Show warning: "Word already in dictionary"
3. Still allow approval (updates word_scores anyway for consistency)

**Warning signs:**
- Admin says "I approved this but it's not working"
- Word was already working before approval

### Pitfall 2: Threshold Too Low

**What goes wrong:**
Setting minCount=1 shows every invalid word attempt. Admin drowns in typos and spam.

**Why it happens:**
Single submissions are often:
- Typos (player meant different word)
- Spam/testing (player mashing keyboard)
- Language mistakes (player in wrong language mode)

**How to avoid:**
- Default minCount=3 (already implemented)
- Add UI hint: "Showing words submitted 3+ times"
- Allow admin to adjust threshold for edge cases

**Warning signs:**
- Admin sees thousands of words with count=1
- Most words in queue are obvious typos

### Pitfall 3: No Context for Admin Decision

**What goes wrong:**
Admin sees word "GURL" submitted 10 times. Is it valid slang or typo for "GIRL"? No context to decide.

**Why it happens:**
Tracking only counts, not context:
- Don't track which players submitted
- Don't track in which games
- Don't show example usage

**How to avoid (future enhancement):**
- Track example game_codes (sample 5 recent games)
- Show "Rejected in X different games"
- Add "Research" button to search word online

**Warning signs:**
- Admin approves slang that's not in dictionary
- Admin asks "Is this a real word?"

### Pitfall 4: Race Condition on Approval

**What goes wrong:**
Admin approves word twice quickly. Two API calls insert to word_scores, one fails with duplicate error.

**Why it happens:**
- Button click doesn't disable immediately
- Admin double-clicks "Approve"
- Two concurrent API requests

**How to avoid:**
```typescript
// Disable button during processing
<Button
  disabled={processing === word.id}
  onClick={() => handleApprove(word)}
>
  {processing === word.id ? <Spinner /> : 'Approve'}
</Button>
```

**Warning signs:**
- Console errors: "duplicate key violation"
- Admin reports "approval didn't work"

## Code Examples

Verified patterns from existing codebase:

### Recording Invalid Word (Backend)

```typescript
// backend/handlers/wordHandler.ts (line 297)
// When word not on board:
recordPlayerWrongWord(submittedWord, language, 'not_on_board');

// backend/modules/supabaseServer.ts (lines 1159-1190)
export async function recordPlayerWrongWord(
  word: string,
  language: string,
  reason: InvalidWordReason = 'not_in_dictionary'
): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  const normalizedWord = word.toLowerCase().trim();
  if (normalizedWord.length < 3) return; // Skip short words (likely typos)

  try {
    const { error } = await client.rpc('record_invalid_word_submission', {
      p_word: normalizedWord,
      p_language: language,
      p_reason: reason
    });

    if (error) {
      logger.debug('SUPABASE', `Failed to record invalid word "${normalizedWord}": ${error.message}`);
    } else {
      logger.debug('SUPABASE', `Recorded invalid word "${normalizedWord}" (${reason}) for ${language}`);
    }
  } catch (err) {
    logger.debug('SUPABASE', `Error recording invalid word: ${err}`);
  }
}
```

**Pattern:** Non-blocking, silent failure. Invalid word tracking is non-critical - game continues even if tracking fails.

### Admin Approval (Backend)

```typescript
// backend/routes/admin/wordModerationRoutes.ts (lines 755-846)
router.post('/invalid-words/approve', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const { word, language, addToDictionary } = req.body;

  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  try {
    // 1. Verify word exists
    const { data: invalidWord, error: lookupError } = await supabase
      .from('invalid_word_submissions')
      .select('id, submission_count')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    if (lookupError || !invalidWord) {
      res.status(404).json({ error: 'Word not found' });
      return;
    }

    // 2. Calculate votes based on demand
    const votesNeeded = Math.max(10, Math.min(invalidWord.submission_count * 2, 20));

    // 3. Add to word_scores (makes it community-valid)
    const { error: scoreError } = await supabase
      .from('word_scores')
      .upsert({
        word: normalizedWord,
        language,
        likes_count: votesNeeded,
        dislikes_count: 0,
        first_submitter: 'admin_approved',
        last_voted_at: new Date().toISOString(),
      }, { onConflict: 'word,language' });

    if (scoreError) throw scoreError;

    // 4. Mark approved
    await supabase
      .from('invalid_word_submissions')
      .update({
        approved_at: new Date().toISOString(),
        approved_by: req.adminUser!.id,
      })
      .eq('id', invalidWord.id);

    // 5. Cleanup blacklist
    await supabase
      .from('bot_word_blacklist')
      .delete()
      .eq('word', normalizedWord)
      .eq('language', language);

    // 6. Optional: Add to dictionary file
    if (addToDictionary) {
      const dictionary = require('../../../backend/dictionary');
      await dictionary.addApprovedWord(normalizedWord, language);
    }

    auditLog(req.adminUser, 'INVALID_WORD_APPROVE', {
      word: normalizedWord,
      language,
      votesAdded: votesNeeded,
      addToDictionary,
      submissionCount: invalidWord.submission_count,
    });

    res.json({ success: true, votesAdded: votesNeeded });
  } catch (error) {
    logger.error('ADMIN_API', `Invalid word approve error: ${error.message}`);
    res.status(500).json({ error: 'Failed to approve word' });
  }
});
```

**Pattern:** Same as community-words approval (consistent architecture).

### Fetching Words (Frontend)

```typescript
// components/admin/InvalidWordsManager.tsx (lines 74-99)
const fetchWords = useCallback(async () => {
  try {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (langFilter && langFilter !== 'all') params.append('language', langFilter);
    params.append('minCount', minCount.toString());
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response = await fetch(`/api/admin/invalid-words?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Failed to fetch invalid words');

    const data = await response.json();
    setWords(data.words);
    setTotal(data.total);
    setStats(data.stats);
  } catch (error) {
    console.error('Error fetching invalid words:', error);
    toast.error('Failed to load invalid words');
  } finally {
    setLoading(false);
  }
}, [authToken, searchQuery, langFilter, minCount, limit, offset]);
```

**Pattern:** Standard admin fetch pattern with auth token, error handling, loading states.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No tracking of invalid words | Track with counter in database | Phase 9 (2026-01-22) | Admins can see player demand for words |
| Manual dictionary additions | Admin review queue → word_scores | Phase 8-9 (2026-01-23) | Faster word approval, community validation |
| Single word approval only | Bulk approval capability (Phase 8) | Phase 8 (2026-01-23) | Admin efficiency for batch operations |

**Deprecated/outdated:**
- Dead code: `recordPlayerWrongWord` originally called non-existent `record_player_wrong_word` RPC (fixed in migration 053)

## Open Questions

Things that couldn't be fully resolved:

1. **Should bulk approval have a confirmation dialog?**
   - What we know: Phase 8 BulkApproveButton has no confirmation (starts immediately)
   - What's unclear: Is this intentional or oversight?
   - Recommendation: Add confirmation for bulk approval (safer UX, harder to accidentally approve 100 words)

2. **Should dismissed words show in the queue again?**
   - What we know: Dismiss sets `approved_at` (same as approval)
   - What's unclear: If word gets submitted 100 more times after dismissal, should it reappear?
   - Recommendation: Leave dismissed (admin already reviewed). If demand grows, admin can manually search for it.

3. **Should approval show word in different contexts?**
   - What we know: Only shows submission count & reason
   - What's unclear: Would showing "used in 5 different game sessions" help admin decide?
   - Recommendation: Future enhancement - not critical for Phase 9

## Sources

### Primary (HIGH confidence)

- **Codebase files (read directly):**
  - `supabase/migrations/053_invalid_word_submissions.sql` - Database schema
  - `backend/modules/supabaseServer.ts` - recordPlayerWrongWord function
  - `backend/routes/admin/wordModerationRoutes.ts` - Admin routes
  - `backend/handlers/wordHandler.ts` - Invalid word recording points
  - `app/[locale]/admin/invalid-words/page.tsx` - Admin page
  - `components/admin/InvalidWordsManager.tsx` - Manager component
  - `components/admin/wikipedia-words/components/BulkApproveButton.tsx` - Pattern reference

- **Phase 8 Research:**
  - `.planning/phases/08-wikipedia-integration/08-RESEARCH.md` - Approval patterns
  - Established: Admin queue over auto-approve, dictionary check priority

- **Feature plan:**
  - `.claude/agents/plans/invalid-words-approval-system.md` - Original design doc

### Secondary (MEDIUM confidence)

- **Package.json dependencies:**
  - Verified: All UI components (Radix UI, Framer Motion) already installed
  - No new packages needed

### Tertiary (LOW confidence)

- None (all findings verified via direct codebase inspection)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components verified in codebase
- Architecture: HIGH - Patterns match Phase 8 (Wikipedia approval)
- Pitfalls: MEDIUM - Based on common admin workflow issues, not project-specific bugs

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable domain, mature patterns)

---

**Research complete. Next step:** Create `09-PLAN.md` with implementation tasks.
