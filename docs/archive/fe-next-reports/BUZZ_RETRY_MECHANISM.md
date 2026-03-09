# Buzz Challenge Generation Retry Mechanism

## Problem
When AI generates Daily Buzz challenges, some may get rejected by validation rules (e.g., word too short, answer spoiled in prompt). Previously, if too many challenges were rejected (< 5 valid out of 6 generated), the system would immediately fail with:
```
Insufficient validated challenges: got 4, need 5
```

This caused cron job failures and required manual intervention.

## Solution: Bounded Retry with Feedback Loop

### How It Works

1. **Initial Generation**: AI generates 6-8 challenges
2. **Validation**: Challenges are validated (length, spoiler detection, etc.)
3. **Retry on Failure**: If validation fails, retry up to 3 times total
4. **Feedback Loop**: Each retry includes:
   - Rejection reasons from previous attempt
   - Request for more challenges (escalating: 7 → 9 → 11)
   - Specific guidance to avoid previous issues

### Implementation Details

**File**: `backend/services/buzz/buzzGenerator.ts`
**Function**: `generateChallengesWithAI()`

**Key Parameters**:
- `MAX_GENERATION_RETRIES = 3` - Maximum attempts before failing
- Escalating challenge count: 6 (base) → 7 (retry 1) → 9 (retry 2) → 11 (retry 3)

**Retry Conditions**:
- Only retries on validation errors (`Insufficient validated challenges`)
- Does NOT retry on:
  - AI API failures
  - Parsing errors
  - Network issues

**Feedback Mechanism**:
Each retry includes a feedback section with:
- Number of rejected challenges
- Generic rejection reasons:
  - Invalid word length
  - Answer spoiled in prompt/hint
  - Missing required wordle_guess type
  - Too many sports riddles
- Attempt number (e.g., "ATTEMPT 2/3")
- Request for more challenges

### Example Scenario

**Attempt 1**: AI generates 6 challenges for Hebrew
- 2 rejected (too short, spoiled answer)
- 4 valid → INSUFFICIENT

**Attempt 2**: System retries with feedback:
```
IMPORTANT FEEDBACK FROM PREVIOUS ATTEMPT (ATTEMPT 2/3)

The previous generation had 2 rejected challenges:
1. Invalid word length (too short or too long for he)
2. Answer spoiled in prompt or hint

Please generate 7 challenges this time to ensure at least 5 pass validation.
Focus on avoiding the issues listed above.
```

**Attempt 2**: AI generates 8 challenges
- 1 rejected
- 7 valid → SUCCESS ✅

### Benefits

1. **No Infinite Loops**: Bounded to 3 attempts max
2. **Better AI Output**: Feedback helps AI learn from mistakes
3. **Higher Success Rate**: More challenges per retry increases odds
4. **Clear Logging**: Track attempts and reasons for debugging
5. **Graceful Degradation**: Still fails after 3 attempts if issues persist

### Testing

**Test File**: `backend/services/buzz/__tests__/buzzGenerator.insufficientChallenges.test.ts`

**Test Cases**:
1. ✅ Retries 3 times when validation fails
2. ✅ Succeeds when retry generates enough valid challenges
3. ✅ Fails after max retries to prevent infinite loop
4. ✅ Includes feedback in retry prompts

Run tests:
```bash
npm run test:backend -- buzzGenerator.insufficientChallenges
```

### Monitoring

**Console Logs**:
- `[BUZZ] Generation attempt X/3...` - Tracks retry attempts
- `[BUZZ] ✅ Retry succeeded on attempt X` - Retry success
- `[BUZZ] Attempt X failed: <reason>` - Retry reason
- `[BUZZ] All 3 generation attempts failed` - Final failure

**Error Messages**:
- `Insufficient validated challenges: got X, need 5` - Validation failure
- `Failed to generate challenges with AI: <reason>` - Non-validation error

### Performance Impact

**Time Cost**:
- Success on attempt 1: ~20-30s (no change)
- Success on attempt 2: ~40-60s (+20-30s per retry)
- Failure after 3 attempts: ~60-90s (3 × 20-30s)

**Cost Impact**:
- Gemini API: ~$0.05 per retry (additional generation)
- Total worst case: 3 retries = ~$0.15 extra vs immediate failure

### Configuration

No configuration needed. Constants are hard-coded in `buzzGenerator.ts`:
```typescript
const MAX_GENERATION_RETRIES = 3;
```

To adjust, modify the constant and update tests accordingly.

### Future Improvements

1. **Smarter Feedback**: Extract actual rejection reasons from validator logs
2. **Adaptive Challenge Count**: Base on historical rejection rates per language
3. **Partial Regeneration**: Only regenerate rejected challenge types
4. **Metrics Tracking**: Log retry rates by language for analysis
