# Dictionary and Word Check Improvements

## Current Implementation Analysis

### Architecture Overview

The word validation system has multiple layers:

1. **Static Dictionary** (`backend/dictionary.ts`)
   - English: `an-array-of-english-words` package (~275k words)
   - Hebrew: `hebrew_words.txt` file
   - Swedish: `@arvidbt/swedish-words` package
   - Spanish: `an-array-of-spanish-words` package
   - Japanese: `kanji_compounds.txt` file
   - Community-approved words loaded from `*_words_approved.txt` files

2. **Community Validation** (`backend/modules/communityWordManager.ts`)
   - Words with 6+ net votes are "prominently valid"
   - Words with positive ratio (> 0) are valid for scoring
   - AI votes count as 4 points
   - Player votes count as 1 point

3. **AI Validation** (`backend/modules/gameAIService.ts`, `lib/ai-service.ts`)
   - Validates unknown words using Vertex AI
   - Caches results in-memory
   - Saves valid words to `community_words` table

4. **Edge Route** (`app/api/validate-word/route.ts`)
   - **LIMITATION**: Only supports English
   - **LIMITATION**: Doesn't check community validation
   - **LIMITATION**: No AI validation support

### Issues Identified

#### 1. Edge Route Limitations
**File**: `app/api/validate-word/route.ts`

**Problems**:
- Only supports English language
- Doesn't check community-validated words
- Doesn't check word scores
- No AI validation (though this may be intentional for Edge runtime)
- Inconsistent with backend validation logic

**Impact**: Single-player mode has inferior word validation compared to multiplayer

#### 2. Dictionary Source Quality
**Current Sources**:
- English: `an-array-of-english-words` (good coverage)
- Spanish: `an-array-of-spanish-words` (unknown quality)
- Swedish: Custom package (good)
- Hebrew: Custom file (unknown coverage)
- Japanese: Custom file (limited to Kanji compounds)

**Potential Issues**:
- Missing modern words, slang, proper nouns
- No validation of dictionary quality
- Community-approved words only added via file (not dynamic)

#### 3. Performance Optimizations

**Current Optimizations**:
- ✅ In-memory Sets for O(1) lookup
- ✅ Trie caching for Boggle solver (30min TTL)
- ✅ Validation result caching
- ✅ Community words cached in memory

**Potential Improvements**:
- Could use Bloom filters for negative lookups
- Could pre-compute common word prefixes
- Could optimize normalization functions

#### 4. Normalization Consistency

**Current Normalization**:
- English: `toLowerCase()`
- Hebrew: Final letter normalization (ך→כ, etc.)
- Spanish: Accent removal (á→a, etc.)
- Swedish: `toLowerCase()`
- Japanese: No normalization

**Potential Issues**:
- Spanish accent removal might cause false positives
- Hebrew normalization might miss some edge cases
- No handling of special characters or punctuation

## Recommended Improvements

### Priority 1: Fix Edge Route Validation

**Goal**: Make single-player validation consistent with multiplayer

**Changes Needed**:

1. **Add Community Validation Check**
   - Query Supabase `word_scores` table
   - Check `is_potentially_valid` flag
   - Check `net_score > 0` for scoring validity

2. **Support Multiple Languages**
   - Load dictionaries for all languages (or use backend API)
   - Apply proper normalization per language

3. **Options**:
   - **Option A**: Call backend API from Edge route (adds latency)
   - **Option B**: Replicate validation logic in Edge (maintenance overhead)
   - **Option C**: Use Supabase Edge Functions (best for consistency)

**Recommended**: Option C - Create Supabase Edge Function for word validation

### Priority 2: Improve Dictionary Coverage

**Actions**:

1. **Add More Dictionary Sources**
   ```typescript
   // Consider adding:
   - Wiktionary word lists
   - Scrabble dictionaries
   - Domain-specific word lists (sports, tech, etc.)
   ```

2. **Dynamic Community Word Addition**
   - Currently: Words added to `*_words_approved.txt` files
   - Better: Auto-promote words with high community scores to approved list
   - Background job to sync `word_scores` → `*_words_approved.txt`

3. **Dictionary Quality Metrics**
   - Track validation success rate per dictionary
   - Monitor words frequently rejected by community
   - Identify gaps in coverage

### Priority 3: Performance Optimizations

**Actions**:

1. **Bloom Filter for Negative Lookups**
   ```typescript
   // For words NOT in dictionary, use Bloom filter
   // Reduces false positives before expensive checks
   ```

2. **Prefix Caching**
   ```typescript
   // Cache common prefixes (e.g., "un-", "re-", "pre-")
   // Speeds up validation of prefixed words
   ```

3. **Batch Validation**
   ```typescript
   // Validate multiple words in single request
   // Reduces network overhead
   ```

### Priority 4: Enhanced Normalization

**Actions**:

1. **Improve Spanish Normalization**
   ```typescript
   // Current: Removes all accents
   // Better: Handle ñ separately, preserve when needed
   ```

2. **Add Unicode Normalization**
   ```typescript
   // Normalize Unicode variants (e.g., é vs é)
   // Use String.prototype.normalize('NFD')
   ```

3. **Handle Special Cases**
   - Hyphenated words
   - Apostrophes (e.g., "don't")
   - Numbers in words (e.g., "2nd")

### Priority 5: Validation Feedback Loop

**Actions**:

1. **Track Validation Accuracy**
   - Log when AI validation disagrees with community
   - Identify patterns in false positives/negatives

2. **Self-Healing Dictionary**
   - Auto-add words with consistent community approval
   - Remove words with consistent rejection
   - Learn from validation patterns

3. **Validation Confidence Scores**
   - Return confidence level with validation results
   - Use confidence to prioritize manual review

## Implementation Plan

### Phase 1: Quick Wins (1-2 days)
1. ✅ Fix Edge route to support all languages
2. ✅ Add community validation check to Edge route
3. ✅ Improve error messages and logging

### Phase 2: Dictionary Improvements (3-5 days)
1. ✅ Add additional dictionary sources
2. ✅ Implement dynamic word promotion
3. ✅ Add dictionary quality metrics

### Phase 3: Performance (2-3 days)
1. ✅ Implement Bloom filter for negative lookups
2. ✅ Add prefix caching
3. ✅ Optimize normalization functions

### Phase 4: Advanced Features (5-7 days)
1. ✅ Enhanced normalization
2. ✅ Validation feedback loop
3. ✅ Self-healing dictionary

## Code Examples

### Improved Edge Route Validation

```typescript
// app/api/validate-word/route.ts (improved)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { word, language = 'en' } = await request.json();
  const normalizedWord = normalizeWord(word, language);

  // 1. Check static dictionary
  if (isInDictionary(normalizedWord, language)) {
    return Response.json({ isValid: true, source: 'dictionary' });
  }

  // 2. Check community validation
  const { data: scoreData } = await supabase
    .from('word_scores')
    .select('net_score, is_potentially_valid')
    .eq('word', normalizedWord)
    .eq('language', language)
    .single();

  if (scoreData?.is_potentially_valid) {
    return Response.json({ isValid: true, source: 'community' });
  }

  if (scoreData && scoreData.net_score > 0) {
    return Response.json({ isValid: true, source: 'community_pending' });
  }

  // 3. Return pending for AI validation
  return Response.json({ isValid: false, source: 'pending' });
}
```

### Enhanced Normalization

```typescript
// backend/dictionary.ts (improved)
function normalizeSpanishWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/ñ/g, 'n') // Handle ñ separately if needed
    .replace(/[^a-zñ]/g, ''); // Remove non-letters
}
```

## Metrics to Track

1. **Validation Performance**
   - Average validation time
   - Cache hit rate
   - API call volume

2. **Dictionary Coverage**
   - Words validated per language
   - Community validation rate
   - AI validation rate

3. **Accuracy**
   - False positive rate
   - False negative rate
   - Community vs AI agreement rate

## Testing Recommendations

1. **Unit Tests**
   - Test normalization for all languages
   - Test edge cases (special characters, unicode)
   - Test community validation logic

2. **Integration Tests**
   - Test validation flow end-to-end
   - Test caching behavior
   - Test error handling

3. **Performance Tests**
   - Load test dictionary lookups
   - Measure cache effectiveness
   - Benchmark normalization functions

