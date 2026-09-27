# Feature: Invalid Words Approval System

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Track invalid word submissions with submission counters. When players submit words that don't validate (not on board, not in dictionary, not community-approved), record them with a count of how many times they've been submitted. Admins can view words that have been submitted 3+ times and approve them to add to the dictionary/community validated words.

## User Story

As an admin
I want to see invalid words that have been submitted multiple times (≥3)
So that I can identify potentially valid words that players commonly try and approve them for the dictionary

## Problem Statement

Currently, when players submit invalid words:
1. The `recordPlayerWrongWord` function attempts to call an RPC `record_player_wrong_word` that **doesn't exist**
2. This is dead code that silently fails
3. There's no tracking of how often players attempt certain invalid words
4. Admins have no visibility into commonly-attempted-but-invalid words

## Solution Statement

1. **Create a new table** `invalid_word_submissions` to track words with submission counters
2. **Create RPC function** `record_invalid_word_submission` to upsert word counts (increment on conflict)
3. **Update `recordPlayerWrongWord`** to call the new RPC instead of the non-existent one
4. **Add admin API endpoint** to list invalid words with count ≥ threshold (default 3)
5. **Add admin approval endpoint** to approve words (moves to community validation with positive votes)
6. **Add UI component** for admin dashboard to view and approve frequent invalid words

## Feature Metadata

**Feature Type:** New Capability
**Estimated Complexity:** Medium
**Primary Systems Affected:**
- Database (new table + RPC)
- Backend (supabaseServer.ts, admin routes)
- Frontend (admin dashboard component)
**Dependencies:** Existing word voting system, admin authentication

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `.claude/agents/context/prime-context.md` - COMPLETE codebase overview
  - **WHY:** Contains all project patterns, configurations, and architecture
  - **ACTION:** Read this file first to understand the codebase

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `backend/modules/supabaseServer.ts` (lines 1148-1180)
  - **WHY:** Contains `recordPlayerWrongWord` function that needs updating
  - **PATTERN:** RPC call pattern, error handling pattern

- `backend/routes/admin.ts` (lines 1489-1778)
  - **WHY:** Contains community-words approval API endpoints to mirror
  - **PATTERN:** Admin route structure, validation, response format

- `supabase/migrations/005_word_voting.sql`
  - **WHY:** Word scoring table structure for reference
  - **PATTERN:** Table structure, indexes, RLS policies

- `supabase/migrations/012_player_words.sql`
  - **WHY:** Example of word tracking table with upsert RPC
  - **PATTERN:** RPC function for incrementing counters

- `app/[locale]/admin/page.tsx` (lines 120-194)
  - **WHY:** Admin navigation grid pattern
  - **PATTERN:** Card-based navigation, routing

- `components/admin/DailyWordManager.tsx` (if exists)
  - **WHY:** Admin component pattern for word management

### New Files to Create

1. `supabase/migrations/053_invalid_word_submissions.sql` - Database migration
2. `components/admin/InvalidWordsManager.tsx` - Admin UI component
3. `app/[locale]/admin/invalid-words/page.tsx` - Admin page route

### Patterns to Follow

**Migration Pattern:**

```sql
-- From 012_player_words.sql
CREATE TABLE IF NOT EXISTS player_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    times_submitted INTEGER DEFAULT 1,
    -- ... other fields
    CONSTRAINT unique_player_word_language UNIQUE (word, language)
);

-- RPC upsert pattern
CREATE OR REPLACE FUNCTION increment_bot_word_usage(p_word TEXT, p_language TEXT)
RETURNS void AS $$
BEGIN
    UPDATE player_words
    SET times_found_by_bots = times_found_by_bots + 1
    WHERE word = p_word AND language = p_language;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Admin API Pattern:**

```typescript
// From admin.ts - community-words endpoint
router.get('/community-words', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const language = (req.query.language as string) || null;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

  let query = supabase
    .from('table_name')
    .select('columns', { count: 'exact' });

  if (language) {
    query = query.eq('language', language);
  }

  const { data, error, count } = await query;
  res.json({ data, total: count });
});
```

**Admin Approve Pattern:**

```typescript
// From admin.ts - community-words/approve
router.post('/community-words/approve', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const { word, language, addToDictionary } = req.body;

  // Validation
  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  // Update word_scores to add positive votes
  // Remove from blacklist if present
  // Optionally add to dictionary

  auditLog(req.adminUser, 'ACTION_NAME', { word, language });
  res.json({ success: true });
});
```

---

## IMPLEMENTATION PLAN

### Phase 1: Database Foundation

Create the database table and RPC function for tracking invalid word submissions.

**Key Decisions:**
- Use upsert pattern (INSERT ON CONFLICT UPDATE) for atomic increment
- Track first/last submission timestamps for admin context
- Store `reason` field to understand WHY word was invalid
- Threshold of 3 submissions before showing to admin

### Phase 2: Backend Integration

Update `recordPlayerWrongWord` function and add admin API endpoints.

**Key Decisions:**
- Add `reason` parameter to `recordPlayerWrongWord` to track invalidity type
- Create GET endpoint for listing with filters (language, min_count)
- Create POST endpoint for approving (adds to word_scores with positive votes)

### Phase 3: Frontend Admin UI

Create admin component and page for viewing/approving invalid words.

**Key Decisions:**
- Mirror existing admin pattern with Card layout
- Add to admin navigation grid
- Support filtering by language and minimum count
- Batch approval capability

### Phase 4: Testing & Validation

Write tests and validate the complete flow.

---

## STEP-BY-STEP TASKS

### Task 1: CREATE `supabase/migrations/053_invalid_word_submissions.sql`

- **IMPLEMENT:** Create table for tracking invalid word submissions with:
  - `id` UUID PRIMARY KEY
  - `word` TEXT NOT NULL
  - `language` TEXT NOT NULL DEFAULT 'en'
  - `submission_count` INTEGER DEFAULT 1
  - `reason` TEXT (stores: 'not_on_board', 'not_in_dictionary', 'peer_rejected')
  - `first_submitted_at` TIMESTAMPTZ DEFAULT NOW()
  - `last_submitted_at` TIMESTAMPTZ DEFAULT NOW()
  - `approved_at` TIMESTAMPTZ (NULL until approved)
  - `approved_by` UUID REFERENCES profiles(id)
  - Unique constraint on (word, language)

- **ADD INDEXES:**
  - `idx_invalid_words_language_count` ON (language, submission_count DESC)
  - `idx_invalid_words_pending` WHERE approved_at IS NULL AND submission_count >= 3

- **CREATE RPC:** `record_invalid_word_submission(p_word TEXT, p_language TEXT, p_reason TEXT)`
  - INSERT with ON CONFLICT update: increment count, update last_submitted_at

- **RLS POLICIES:**
  - Admins can SELECT, UPDATE (for approving)
  - Service role can INSERT/UPDATE (from backend)

- **PATTERN:** `supabase/migrations/012_player_words.sql` (lines 1-106)
- **VALIDATE:** `npx supabase db push --dry-run` then `npm run db:migrate`

### Task 2: UPDATE `backend/modules/supabaseServer.ts`

- **IMPLEMENT:** Modify `recordPlayerWrongWord` function:
  - Add `reason` parameter (default: 'not_on_board')
  - Call new RPC `record_invalid_word_submission`
  - Keep same error handling (non-blocking, log debug)

- **PATTERN:** Lines 1154-1180 (current implementation)
- **IMPORTS:** No new imports needed
- **GOTCHA:** Function is exported in CommonJS - update export if signature changes
- **VALIDATE:** `npm run build` should pass

### Task 3: UPDATE `backend/handlers/wordHandler.ts`

- **IMPLEMENT:** Pass reason to `recordPlayerWrongWord` calls:
  - Line 297: Add reason 'not_on_board'
  - Line 629: Add reason 'peer_rejected'

- **PATTERN:** Lines 292-299, 624-630 (current usage)
- **GOTCHA:** Don't change import, function signature is backwards compatible
- **VALIDATE:** `npm run test:backend -- --testPathPattern=wordHandler`

### Task 4: ADD admin routes in `backend/routes/admin.ts`

- **IMPLEMENT:** Add two new endpoints:

```typescript
/**
 * GET /api/admin/invalid-words
 * Get invalid words with count >= threshold for review
 */
router.get('/invalid-words', async (req: AdminRequest, res: Response): Promise<void> => {
  // Query params: language, minCount (default 3), limit, offset
  // Filter: approved_at IS NULL (only pending)
  // Order by: submission_count DESC
});

/**
 * POST /api/admin/invalid-words/approve
 * Approve an invalid word - adds to word_scores with positive votes
 */
router.post('/invalid-words/approve', async (req: AdminRequest, res: Response): Promise<void> => {
  // Body: { word, language, addToDictionary? }
  // 1. Add to word_scores with initial positive votes (like community-words/approve)
  // 2. Mark approved_at and approved_by in invalid_word_submissions
  // 3. Optionally add to dictionary file
  // 4. Audit log
});
```

- **PATTERN:** Lines 1489-1700 (community-words endpoints)
- **IMPORTS:** Already imported: getSupabase, auditLog
- **GOTCHA:** Use same auth middleware (already applied to router)
- **VALIDATE:** `npm run build` then test with curl

### Task 5: CREATE `components/admin/InvalidWordsManager.tsx`

- **IMPLEMENT:** Admin component for invalid words management:
  - Fetch from `/api/admin/invalid-words`
  - Display table with: word, language, submission_count, reason, first/last submitted
  - Filter dropdowns: language, minimum count
  - Approve button per row
  - Optional: Add to dictionary checkbox

- **PATTERN:** Mirror `components/admin/LiveMonitor.tsx` structure
- **IMPORTS:**
  - `{ Card, CardContent, CardHeader, CardTitle }` from '@/components/ui/card'
  - `{ Button }` from '@/components/ui/button'
  - `{ Select }` from '@/components/ui/select'
  - `{ cn }` from '@/lib/utils'

- **GOTCHA:** Use neo-brutalist dark theme styling
- **VALIDATE:** `npm run lint` and visual inspection

### Task 6: CREATE `app/[locale]/admin/invalid-words/page.tsx`

- **IMPLEMENT:** Admin page wrapper:
  - Header with back button
  - Page title: "Invalid Words Review"
  - Embed InvalidWordsManager component

- **PATTERN:** `app/[locale]/admin/words/page.tsx` (exact same structure)
- **VALIDATE:** Navigate to `/en/admin/invalid-words` in browser

### Task 7: UPDATE `app/[locale]/admin/page.tsx`

- **IMPLEMENT:** Add navigation card to admin grid:
  - Icon: `AlertTriangle` from lucide-react
  - Label: "Invalid Words" (use translation key)
  - Route: `/${language}/admin/invalid-words`

- **PATTERN:** Lines 121-193 (existing navigation cards)
- **GOTCHA:** Insert in logical position (after Dictionary card)
- **VALIDATE:** Visual inspection of admin dashboard

### Task 8: ADD translations

- **IMPLEMENT:** Add translation keys to all 5 language files:
  ```javascript
  admin: {
    nav: {
      invalidWords: 'Invalid Words' // English
    },
    invalidWords: {
      title: 'Invalid Words Review',
      subtitle: 'Words submitted 3+ times but not validated',
      word: 'Word',
      language: 'Language',
      count: 'Times Submitted',
      reason: 'Reason',
      firstSubmitted: 'First Submitted',
      lastSubmitted: 'Last Submitted',
      approve: 'Approve',
      approved: 'Approved',
      addToDictionary: 'Add to dictionary',
      noResults: 'No invalid words meeting threshold',
      reasons: {
        not_on_board: 'Not on board',
        not_in_dictionary: 'Not in dictionary',
        peer_rejected: 'Peer rejected'
      }
    }
  }
  ```

- **FILES:**
  - `translations/en.js`
  - `translations/he.js`
  - `translations/sv.js`
  - `translations/ja.js`
  - `translations/es.js`

- **VALIDATE:** `npm run lint`

### Task 9: WRITE backend tests

- **IMPLEMENT:** Tests for new admin endpoints:
  - GET /invalid-words returns filtered data
  - POST /invalid-words/approve updates word_scores
  - Unauthorized requests rejected

- **PATTERN:** `backend/routes/__tests__/admin.test.ts` (if exists)
- **VALIDATE:** `npm run test:backend`

### Task 10: WRITE frontend tests

- **IMPLEMENT:** Tests for InvalidWordsManager component:
  - Renders table with mock data
  - Filter changes trigger refetch
  - Approve button calls API

- **PATTERN:** `components/admin/__tests__/` directory
- **VALIDATE:** `npm run test:frontend`

---

## TESTING STRATEGY

### Unit Tests

**Backend Tests:**

```typescript
describe('GET /api/admin/invalid-words', () => {
  it('should return words with count >= 3 for admin', async () => {
    // Mock supabase response
    // Call endpoint
    // Assert response structure
  });

  it('should filter by language', async () => {
    // Test language query param
  });

  it('should reject non-admin users', async () => {
    // Test 403 response
  });
});

describe('POST /api/admin/invalid-words/approve', () => {
  it('should add word to word_scores with positive votes', async () => {
    // Mock supabase
    // Call approve
    // Verify word_scores updated
    // Verify invalid_word_submissions marked approved
  });
});
```

**Frontend Tests:**

```typescript
describe('InvalidWordsManager', () => {
  it('renders table with invalid words', () => {
    // Mock API response
    // Render component
    // Assert table rows
  });

  it('calls approve endpoint on button click', async () => {
    // Mock API
    // Click approve
    // Verify API called
  });
});
```

### Integration Tests

- Test complete flow: submit invalid word → check counter increments → admin sees it → approve → word validates

### Edge Cases

- Empty results (no words meeting threshold)
- Language filter with no matches
- Approving already-approved word (idempotent)
- Very long words
- Words with special characters (already normalized)
- Concurrent submissions of same word

---

## VALIDATION COMMANDS

### Level 1: Database Migration

```bash
cd fe-next && npx supabase db push --dry-run
# Expected: Shows migration would be applied

cd fe-next && npm run db:migrate
# Expected: Migration applied successfully
```

### Level 2: TypeScript Compilation

```bash
cd fe-next && npm run build
# Expected: Build succeeds with no errors
```

### Level 3: Linting

```bash
cd fe-next && npm run lint
# Expected: No linting errors
```

### Level 4: Backend Tests

```bash
cd fe-next && npm run test:backend
# Expected: All tests pass
```

### Level 5: Frontend Tests

```bash
cd fe-next && npm run test:frontend
# Expected: All tests pass
```

### Level 6: Manual Validation

```bash
# Start dev server
cd fe-next && npm run dev

# Test API endpoint (requires admin auth token)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/invalid-words?language=en&minCount=3"

# Navigate to admin dashboard
# Visit: http://localhost:3000/en/admin
# Click "Invalid Words" card
# Verify table loads and filters work
# Test approve functionality
```

---

## ACCEPTANCE CRITERIA

- [ ] Invalid word submissions are tracked in database with counter
- [ ] Counter increments on each submission (not duplicates)
- [ ] Reason for invalidity is stored
- [ ] Admin can view words with submission_count >= 3
- [ ] Admin can filter by language
- [ ] Admin can approve words (adds to word_scores with positive votes)
- [ ] Approved words become community-validated
- [ ] Optional: Add approved word to dictionary file
- [ ] UI follows neo-brutalist design system
- [ ] All translations added for 5 languages
- [ ] All tests pass
- [ ] Build passes
- [ ] Lint passes

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

**Design Rationale:**

- **Why separate table instead of reusing word_scores?** Word_scores is for community-voted words. Invalid submissions are a different concept - they track attempted submissions before any validation. This keeps concerns separated.

- **Why threshold of 3?** Balances noise reduction with capturing genuine attempts. Single submissions could be typos. 3+ suggests players genuinely believe the word is valid.

- **Why track reason?** Helps admin understand why word failed. "Not on board" suggests possible board generation issue. "Not in dictionary" suggests dictionary gap. "Peer rejected" suggests controversial word.

**Future Considerations:**

- **Batch approval:** Could add "Approve All" for language
- **Auto-approval:** If count reaches high threshold (e.g., 10+), could auto-approve
- **Dashboard widget:** Could add count to admin dashboard overview
- **Analytics:** Track approval rate to measure dictionary completeness

**Known Limitations:**

- Doesn't track which players submitted (privacy consideration)
- Doesn't track which games (volume concern)
- Reason field is simplified (could be enum but TEXT is flexible)
