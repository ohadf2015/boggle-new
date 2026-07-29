# Fix Plan: Wikipedia Word Extraction

## Root Cause
The word extraction only processes article **titles** (which are URL-formatted proper nouns like `Jarrett_Stidham`) instead of the rich **extract** field containing article summaries with many usable common words.

## Fix Strategy
Multi-source word extraction: Extract words from titles, extracts, and descriptions with stopword filtering.

## Files to Modify

1. **`backend/services/wikipediaWordFetcher.ts`**
   - Update `WikipediaFeaturedArticle` interface to include `extract`, `description`, `titles`, `normalizedtitle`
   - Add `extractWordsFromText()` helper function
   - Add stopwords lists per language
   - Update `extractWordsFromFeaturedContent()` to extract from extracts/descriptions
   - Update `extractWordsFromTitle()` to use normalized titles

2. **`backend/services/__tests__/wikipediaWordFetcher.test.ts`**
   - Add tests for extract-based word extraction
   - Add tests for stopword filtering
   - Add tests for normalized title handling

## Implementation Steps

1. **Step 1:** Update interface to include new Wikipedia API fields
2. **Step 2:** Add stopwords lists for all supported languages
3. **Step 3:** Add `extractWordsFromText()` helper that handles text parsing
4. **Step 4:** Add `isStopword()` function for filtering
5. **Step 5:** Update `extractWordsFromFeaturedContent()` to use extracts
6. **Step 6:** Update `extractWordsFromTitle()` to use normalized titles
7. **Step 7:** Write unit tests for new functionality
8. **Step 8:** Run tests and validate

## Testing Strategy

**Unit tests:**
- Test extracting words from extracts
- Test stopword filtering for each language
- Test normalized title handling
- Test edge cases (empty extract, HTML entities)

**Validation:**
- Run full test suite
- Manual test: Verify > 10 words extracted from real API response

## Acceptance Criteria
- [ ] Words extracted from `extract` field (article summaries)
- [ ] Words extracted from `description` field
- [ ] Normalized titles used instead of URL-formatted titles
- [ ] Stopwords filtered out for each language
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] > 10 candidate words per language from real Wikipedia data
