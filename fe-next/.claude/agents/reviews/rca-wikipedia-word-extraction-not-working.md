# Root Cause Analysis: Wikipedia Word Extraction Not Working

**Date:** 2026-01-19
**Issue:** Wikipedia get words is not working / yields insufficient usable words
**Severity:** Medium
**Status:** Analysis Complete

## Issue Summary

**Description:**
The Wikipedia word fetching system is not producing enough usable game words. The system appears to be functional (API calls succeed) but the word extraction yields very few or zero valid words from the fetched content.

**Expected Behavior:**
- Fetch trending/featured Wikipedia articles daily
- Extract interesting, valid game words (4-8 letters, single words)
- Provide 10+ candidate words per language per day

**Actual Behavior:**
- Wikipedia API calls succeed (TFA, Most Read, On This Day all return data)
- Word extraction from titles yields 0 valid words in most cases
- The `extract` field (article summaries) containing many usable words is NOT being utilized
- Falls back to static word lists frequently

**Impact:**
- Affected users: All Daily Challenge players
- Affected features: Daily Challenge word selection, Wikipedia Word Admin Panel
- Severity: Medium - game still works via fallback lists, but loses "trending topic" appeal

## Reproduction

**Can Reproduce:** Yes - 100% reproducible

**Reproduction Steps:**
1. Call `populateWikipediaWords()` for any language
2. Observe that `tryWikipediaSource()` fetches content successfully
3. `extractWordsFromFeaturedContent()` yields 0 valid words for most articles
4. System falls back to static word lists

**Environment:**
- Mode: Production
- Data: Wikipedia Featured Content API responses

**Evidence from Testing:**
```
Testing en: Most Read Articles (top 10)
1. Jarrett_Stidham -> (no valid words)
2. The_Rip_(film) -> (no valid words)
3. Bo_Nix -> (no valid words)
4. Drake_Maye -> (no valid words)
5. Greenland -> (no valid words)  [8 letters - should work!]
...
Total valid words from Most Read: 0
```

## Analysis

**Related Files:**
- `backend/services/wikipediaWordFetcher.ts` - Fetches data from Wikipedia API
- `backend/services/wikipediaWordPopulator.ts` - Orchestrates word population
- `utils/dailyChallenge/wikipediaWordProcessor.ts` - Validates and ranks words

**Code Flow:**
```
1. populateWikipediaWords() calls tryWikipediaSource()
2. tryWikipediaSource() calls fetchFeaturedContent()
3. fetchFeaturedContent() fetches from Wikimedia REST API (works correctly)
4. extractWordsFromFeaturedContent() processes article TITLES only
5. extractWordsFromTitle() fails to extract valid words because:
   - Titles have underscores (Jarrett_Stidham)
   - Titles are proper nouns (names, places)
   - Titles contain parentheses (The_Rip_(film))
   - Most words are filtered out by length/character rules
```

## Root Cause

**Primary Root Cause: Extracting words from article TITLES instead of EXTRACTS**

The current implementation in `extractWordsFromFeaturedContent()` only looks at:
- `content.tfa?.title` - Today's Featured Article title
- `content.mostread?.articles[].title` - Most Read article titles
- `content.onthisday?.pages[].title` - On This Day page titles

**These titles are problematic because:**
1. They use underscore format (`Jarrett_Stidham`) instead of spaces
2. They are mostly proper nouns (person names, place names, movie titles)
3. They often contain numbers, parentheticals, or special characters
4. Single-word titles that would make good game words are rare

**Missed Opportunity:**
The Wikipedia API returns an `extract` field containing article summaries with many usable common nouns, adjectives, and verbs that would make excellent game words. Example from "Jarrett Stidham" article:

> "...professional football quarterback for the Denver Broncos of the National Football League..."

This contains valid words: FOOTBALL, DENVER, BRONCOS, NATIONAL, LEAGUE, COLLEGE, TIGERS, PATRIOTS, BACKUP, SEASON, RAIDERS, JOINED

**Secondary Issues:**
1. The `titles.normalized` field (with proper spacing) is not being used
2. Word validation is too strict (underscores not being replaced with spaces)
3. No extraction from article descriptions or extracts

**Why it Happened:**
- Original implementation focused on extracting "topical" words from trending titles
- The assumption was that article titles would contain interesting single words
- Reality: Wikipedia article titles are overwhelmingly multi-word proper nouns
- The API structure evolved - `extract` field availability wasn't fully utilized

## Fix Strategy

### Recommended Fix: Multi-Source Word Extraction

**Approach:** Extract words from multiple sources within the API response, prioritizing common nouns and descriptive words over proper nouns.

### Implementation Steps

**Step 1: Use normalized titles (Quick Win)**
- Use `article.titles?.normalized || article.normalizedtitle || article.title`
- Replace underscores with spaces before processing
- Continue filtering for valid single words

**Step 2: Extract from article extracts (Main Fix)**
- Parse `article.extract` field for interesting words
- Apply NLP-style filtering: prefer nouns, adjectives, verbs
- Exclude common stopwords and very frequent words
- Weight words by position (earlier = more relevant) and frequency

**Step 3: Extract from descriptions**
- Parse `article.description` for additional context words
- e.g., "American football player" -> FOOTBALL, PLAYER

**Step 4: Alternative Sources (Future Enhancement)**
Consider adding alternative word sources:
- **Wiktionary "Word of the Day"** - curated interesting words
- **Wikipedia "Good Articles"** - quality articles with interesting topics
- **Google Trends** - trending search terms
- **News Headlines** - current event keywords

### Files to Modify

1. **`backend/services/wikipediaWordFetcher.ts`**
   - Update `extractWordsFromFeaturedContent()` to also parse extracts
   - Add new function `extractWordsFromExtract(extract: string, language: Language)`
   - Use `titles.normalized` instead of `title`

2. **`utils/dailyChallenge/wikipediaWordProcessor.ts`**
   - Add stopword filtering
   - Improve word scoring based on source (title vs extract vs description)
   - Add common noun preference

### Testing Strategy

**Unit tests needed:**
- Test extracting words from extracts
- Test normalized title handling
- Test stopword filtering
- Test word scoring updates

**Integration tests needed:**
- Test full population pipeline yields > 10 words
- Test words extracted from real API responses

**Edge cases to test:**
- Articles with no extract
- Non-English language handling
- Very short/long extracts
- HTML entities in extracts

**Validation:**
- Run population for all 7 languages
- Verify > 10 candidate words per language
- Verify words are interesting (not stopwords)
- Manual review of word quality

## Alternative Approaches Considered

### Option A: Web Crawler (Not Recommended)
- **Approach:** Crawl Wikipedia pages directly for full text
- **Pros:** Access to full article content
- **Cons:** More complex, rate limiting issues, may violate ToS
- **Risk:** High - maintenance burden, legal concerns

### Option B: Wiktionary API (Complementary)
- **Approach:** Use Wiktionary for "word of the day" or random words
- **Pros:** Words are already validated, multiple languages supported
- **Cons:** Less "topical" connection to current events
- **Risk:** Low - could complement existing approach
- **URL:** `https://en.wiktionary.org/wiki/Wiktionary:Word_of_the_day`

### Option C: NLP Keyword Extraction API (Future Enhancement)
- **Approach:** Use TextRazor, AWS Comprehend, or similar
- **Pros:** Better word quality, semantic understanding
- **Cons:** Cost per API call, dependency on external service
- **Risk:** Medium - adds complexity and cost

### Option D: Google Trends API (Future Enhancement)
- **Approach:** Fetch trending search terms
- **Pros:** Highly topical, engaging words
- **Cons:** Requires API key, may not produce game-suitable words
- **Risk:** Medium - additional integration needed

### Recommended Approach: Option B + Enhanced Current System
1. **Immediate:** Fix current extraction to use extracts (Step 2 above)
2. **Short-term:** Add Wiktionary as supplementary source
3. **Long-term:** Consider NLP API for better word quality scoring

## Impact

**Current Impact:**
- Users affected: All Daily Challenge players
- Features affected: Daily word variety
- Data impact: None (falls back to static lists)

**Potential Side Effects:**
- Extracting from extracts may yield common words (need stopword filter)
- Score calibration needed (extract words vs title words)
- May need to increase AI validation capacity

## Prevention

**How to Prevent:**
- [ ] Add integration test: Verify > 10 words extracted from real API response
- [ ] Add monitoring: Alert when falling back to static lists
- [ ] Add logging: Track word extraction success rate by source
- [ ] Update documentation: Document expected API response structure

## Code Examples

### Current (Broken) Extraction
```typescript
// Only extracts from title - yields few words
function extractWordsFromTitle(title: string, language: Language): string[] {
  const cleanedTitle = title.replace(/\s*\([^)]*\)\s*/g, '').trim();
  // "Jarrett_Stidham" -> no valid words (underscores, proper noun)
}
```

### Proposed Fix
```typescript
function extractWordsFromArticle(
  article: WikipediaFeaturedArticle,
  language: Language
): Array<{ word: string; source: string }> {
  const candidates: Array<{ word: string; source: string }> = [];

  // Use normalized title
  const title = article.titles?.normalized ||
                article.normalizedtitle ||
                article.title?.replace(/_/g, ' ');

  // Extract from title
  const titleWords = extractWordsFromText(title, language);
  titleWords.forEach(word => candidates.push({ word, source: 'title' }));

  // Extract from extract (summary)
  if (article.extract) {
    const extractWords = extractWordsFromText(article.extract, language);
    // Filter out stopwords and very common words
    const interestingWords = extractWords.filter(w => !isStopword(w, language));
    interestingWords.slice(0, 5).forEach(word =>
      candidates.push({ word, source: 'extract' })
    );
  }

  // Extract from description
  if (article.description) {
    const descWords = extractWordsFromText(article.description, language);
    descWords.forEach(word => candidates.push({ word, source: 'description' }));
  }

  return candidates;
}
```

## Next Steps

1. **Implement fix** using: `/bug_fix:implement-fix rca-wikipedia-word-extraction-not-working.md`
2. **Validate fix** - Run population and verify > 10 words per language
3. **Update tests** - Add integration test for word yield
4. **Monitor** - Track fallback rate after deployment
5. **Consider Wiktionary** - Add as supplementary source in future iteration

---

**RCA Status:** Analysis Complete - Ready for Implementation

## Research References

- [Wikipedia REST API](https://www.mediawiki.org/wiki/API:REST_API)
- [Wikimedia Feed API](https://api.wikimedia.org/wiki/Getting_started_with_Wikimedia_APIs)
- [TextExtracts Extension](https://www.mediawiki.org/wiki/Extension:TextExtracts)
- [Best Keyword Extraction APIs 2025](https://www.edenai.co/post/best-keyword-extraction-apis)
- [NLP Keyword Extraction](https://www.geeksforgeeks.org/nlp/keyword-extraction-methods-in-nlp/)
