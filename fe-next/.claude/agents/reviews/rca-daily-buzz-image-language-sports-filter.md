# Root Cause Analysis: Daily Buzz Image Language & Sports Filter Issues

**Date:** 2026-01-18
**Issue:** Daily Buzz displaying wrong language text in images + all sports topics
**Severity:** High
**Status:** In Progress

## Issue Summary

**Description:**
The Daily Buzz challenge has two related issues:
1. **Image Language Bug**: Generated images contain text in the wrong language (English text shown for Hebrew buzz)
2. **Sports Dominance Bug**: All trending topics selected for today's buzz were sports-related, lacking variety

**Expected Behavior:**
1. Images should not contain ANY text (per design spec), but if visual elements include text-like elements, they should match the target language/region
2. Trending topics should be diverse, with sports limited to max 1 out of 5 trends per existing code logic

**Actual Behavior:**
1. Image generation ignores the language parameter completely
2. Sports filtering may not be effective for non-English trend categorization

**Impact:**
- Affected users: Hebrew players (and potentially Swedish, Japanese, Spanish)
- Affected features: Daily Buzz challenge visual presentation and topic variety
- Severity: High - Affects core user experience in non-English locales

## Reproduction

**Can Reproduce:** Yes - By analyzing code flow

**Reproduction Steps:**
1. Navigate to Daily Buzz for Hebrew locale
2. Observe generated challenge image
3. Image contains English-centric visual elements
4. All 5 trending topics are sports-related

**Environment:**
- Mode: PRODUCTION
- Language: Hebrew (he)
- Region: IL

## Analysis

### Related Files:

**Bug 1 - Image Language:**
- `backend/services/imagenClient.ts:126-207` - `buildImagePrompt()` function
  - Line 129: `_language: string` - **Parameter is intentionally ignored** (underscore prefix)
  - Lines 136-207: Prompt is hardcoded in English

**Bug 2 - Sports Filtering:**
- `backend/services/buzzGenerator.ts:582-616` - Category constants and checks
  - Lines 582-583: `LOW_PRIORITY_CATEGORIES` is English-only
  - Lines 586-591: `SPORTS_KEYWORDS` is English-only
- `backend/services/buzzGenerator.ts:623-725` - `selectTrendsForChallenge()` function
  - Lines 639-644: Sports limit check uses English categories only

**Code Flow:**

```
generateDailyBuzz()
  → fetchGoogleTrends(region, language)
    → Returns trends with categories (from SERP API)
  → filterTrends(trends, language)
    → Filters by script, NSFW, dedup
  → selectTrendsForChallenge(trends)
    → Should limit sports to 1, but uses English-only category names
  → generateChallengesWithAI(filteredTrends, language, region)
  → generateChallengeImage(trend.query, category, language)
    → buildImagePrompt(topic, category, _language)  ← LANGUAGE IGNORED!
```

## Root Cause

### Root Cause 1: Language Parameter Completely Ignored

**Location:** `imagenClient.ts:126-130`

```typescript
function buildImagePrompt(
  topic: string,
  category: string,
  _language: string  // ← PREFIXED WITH UNDERSCORE = IGNORED
): string {
```

**Why it Happened:**
- The underscore prefix (`_language`) is TypeScript convention to mark unused parameters
- The developer designed the prompt in English and never implemented language-specific adaptations
- The image generation spec says "NO text" but the prompt contains many English phrases that could influence visual style

### Root Cause 2: Sports Filtering Uses English-Only Keywords

**Location:** `buzzGenerator.ts:582-591`

```typescript
const LOW_PRIORITY_CATEGORIES = ['Sports', 'Soccer', 'Football', 'Basketball', 'Tennis', 'Baseball'];

const SPORTS_KEYWORDS = [
  'sport', 'soccer', 'football', 'basketball', 'tennis', 'baseball', 'hockey',
  'golf', 'cricket', 'rugby', 'volleyball', 'boxing', 'wrestling', 'marathon',
  'olympics', 'athlete', 'championship', 'league', 'nba', 'nfl', 'mlb', 'fifa',
  'game', 'match', 'score', 'team', 'player', 'coach', 'stadium', 'ball',
];
```

**Why it Happened:**
- SERP API returns category names in English even for non-English regions
- The keyword list doesn't include Hebrew equivalents like כדורגל (soccer), ספורט (sport), etc.
- When category matching fails, the fallback logic doesn't have sports-aware filtering

## Fix Strategy

### Fix 1: Update Image Prompt to Avoid Text Entirely

**Recommended Fix:**
The image prompt already says "NO text, NO words, NO letters" but we should:
1. Remove the `_language` prefix so the parameter is available for future use
2. Add explicit "ENGLISH-FREE" constraint in the prompt to prevent English-looking elements
3. Consider region-specific visual style (e.g., different color palettes for different regions)

**Implementation Steps:**
1. In `imagenClient.ts:126-130`, change `_language` to `language`
2. Add explicit constraint: "DO NOT include any text, letters, words, or alphanumeric characters in ANY language"
3. Consider adding region-specific visual mood guidance (optional enhancement)

**Files to Modify:**
- `backend/services/imagenClient.ts:126-207` - Update `buildImagePrompt()`

### Fix 2: Add Multi-Language Sports Keywords Before Trend Selection

**Recommended Fix:**
Filter out sports topics BEFORE they reach `selectTrendsForChallenge()` by adding multi-language sports keywords to `filterTrends()`.

**Implementation Steps:**
1. Create multi-language sports keyword list in `buzzGenerator.ts`
2. Add sports filtering to `filterTrends()` function (lines 285-360)
3. Filter should remove sports trends entirely or limit to MAX_SPORTS (1)
4. Add Hebrew, Swedish, Japanese, Spanish sports terms

**Files to Modify:**
- `backend/services/buzzGenerator.ts:285-360` - Update `filterTrends()`
- Add new constant: `SPORTS_KEYWORDS_BY_LANGUAGE` with translations

### Multi-Language Sports Keywords to Add:

```typescript
const SPORTS_KEYWORDS_BY_LANGUAGE: Record<string, string[]> = {
  en: ['sport', 'soccer', 'football', 'basketball', 'tennis', 'baseball', 'hockey',
       'golf', 'cricket', 'rugby', 'volleyball', 'boxing', 'wrestling', 'marathon',
       'olympics', 'athlete', 'championship', 'league', 'nba', 'nfl', 'mlb', 'fifa',
       'match', 'score', 'team', 'player', 'coach', 'stadium', 'ball', 'cup', 'goal'],
  he: ['ספורט', 'כדורגל', 'כדורסל', 'טניס', 'בייסבול', 'הוקי', 'גולף', 'קריקט',
       'רוגבי', 'כדורעף', 'איגרוף', 'היאבקות', 'מרתון', 'אולימפיאדה', 'אתלט',
       'אליפות', 'ליגה', 'משחק', 'תוצאה', 'קבוצה', 'שחקן', 'מאמן', 'אצטדיון',
       'כדור', 'גביע', 'שער', 'גול', 'מכבי', 'הפועל', 'בית"ר'],
  sv: ['sport', 'fotboll', 'basket', 'tennis', 'baseball', 'hockey', 'golf',
       'cricket', 'rugby', 'volleyboll', 'boxning', 'brottning', 'maraton',
       'olympiska', 'atlet', 'mästerskap', 'liga', 'match', 'poäng', 'lag',
       'spelare', 'tränare', 'stadion', 'boll', 'pokal', 'mål'],
  ja: ['スポーツ', 'サッカー', 'バスケ', 'テニス', '野球', 'ホッケー', 'ゴルフ',
       'クリケット', 'ラグビー', 'バレー', 'ボクシング', 'レスリング', 'マラソン',
       'オリンピック', 'アスリート', '選手権', 'リーグ', '試合', 'スコア', 'チーム',
       '選手', 'コーチ', 'スタジアム', 'ボール', 'カップ', 'ゴール'],
  es: ['deporte', 'fútbol', 'baloncesto', 'tenis', 'béisbol', 'hockey', 'golf',
       'críquet', 'rugby', 'voleibol', 'boxeo', 'lucha', 'maratón',
       'olímpicos', 'atleta', 'campeonato', 'liga', 'partido', 'puntuación', 'equipo',
       'jugador', 'entrenador', 'estadio', 'balón', 'copa', 'gol'],
};
```

### Testing Strategy:

**Unit tests needed:**
- Test `filterTrends()` removes sports trends when max is reached (all languages)
- Test `buildImagePrompt()` doesn't contain text references

**Integration tests needed:**
- Generate Hebrew buzz and verify no English elements in prompt
- Generate buzz with 10 sports trends, verify only 1 passes filter

**Edge cases to test:**
- All input trends are sports → should still get 1 sports + fallback to any available
- Mixed sports/non-sports trends → verify diversity
- Hebrew trends with English sports keywords (e.g., "NBA הלילה")

**Validation:**
- Manual verification: Generate Hebrew buzz and review image
- Check trend selection logs for category distribution

## Impact

### Current Impact:
- Users affected: All Hebrew users of Daily Buzz
- Features affected: Daily Buzz challenge images and topic variety
- Data impact: No data corruption, display-only issue

### Potential Side Effects:
- Stricter sports filtering may reduce available trends (mitigated by fallback logic)
- Image prompt changes require regeneration to see effect

## Prevention

**How to Prevent:**

- [ ] Add test: Multi-language sports filtering unit test
- [ ] Add test: Image prompt language parameter usage test
- [ ] Update code review checklist: Check for ignored parameters (underscore prefix)
- [ ] Add monitoring: Log sports trend count before/after filtering per language
- [ ] Improve patterns: Create centralized multi-language keyword utilities

## Next Steps

1. Implement fix using: `/bug_fix:implement-fix rca-daily-buzz-image-language-sports-filter.md`
2. Validate fix with Hebrew buzz generation
3. Add unit tests for sports filtering and image prompt
4. Update prevention measures
5. Regenerate affected Daily Buzz challenges

---

**RCA Status:** ✅ Implemented (2026-01-18)

## Implementation Summary

**Files Modified:**
1. `backend/services/imagenClient.ts` - Updated `buildImagePrompt()` function
2. `backend/services/buzzGenerator.ts` - Added multi-language sports filtering

**Changes Made:**

### Fix 1: Image Prompt (imagenClient.ts:130-227)
- Changed `_language` parameter to `language` (removed underscore prefix)
- Added explicit "ZERO TEXT POLICY" section at the top of the prompt
- Added clear instructions for NO text in ANY language (English, Hebrew, Japanese, Swedish, Spanish)
- Removed visible hex color codes from the prompt description
- Added logging for debugging language usage

### Fix 2: Sports Filtering (buzzGenerator.ts:597-670, 290-385)
- Added `SPORTS_KEYWORDS_BY_LANGUAGE` constant with keywords for all 5 languages (en, he, sv, ja, es)
- Created `isSportsRelatedTrend()` function for multi-language sports detection
- Updated `filterTrends()` to limit sports trends to MAX_SPORTS_IN_FILTER (1)
- Sports detection now combines language-specific AND English keywords

**Verification:**
- ✅ Lint passed
- ✅ All buzz-related tests passed (16 tests)
- ✅ Build succeeded
