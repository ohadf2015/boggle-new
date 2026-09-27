# Wikipedia Words - Local JSON Fallback

This directory contains pre-validated Wikipedia word lists for reliable fallback when the Wikipedia API is unavailable in production.

## Overview

The Wikipedia word system uses a multi-tier strategy:

### Production Environment
1. **Local JSON files** (this directory) - Primary source, fast and reliable
2. **Wikipedia API** - Secondary source, live data
3. **Fallback lists** - Ultimate fallback, hardcoded in `wikipediaWordPopulator.ts`

### Development Environment
1. **Wikipedia API** - Primary source, gets fresh data
2. **Local JSON files** - Fallback when API fails
3. **Fallback lists** - Ultimate fallback

## File Structure

```
data/wikipedia-words/
├── README.md          # This file
├── en.json            # English words
├── he.json            # Hebrew words
├── sv.json            # Swedish words
├── ja.json            # Japanese words
├── es.json            # Spanish words
├── fr.json            # French words (optional)
└── de.json            # German words (optional)
```

## JSON File Format

Each JSON file follows this structure:

```json
{
  "language": "en",
  "lastUpdated": "2026-01-20",
  "words": [
    {
      "word": "AURORA",
      "source": "tfa_title",
      "url": "https://en.wikipedia.org/wiki/Aurora",
      "score": 85
    },
    ...
  ]
}
```

### Field Descriptions

- **language**: Two-letter language code (en, he, sv, ja, es, fr, de)
- **lastUpdated**: ISO date when the file was last updated
- **words**: Array of word objects:
  - **word**: The word in uppercase (or native script for he/ja)
  - **source**: Source identifier (tfa_title, mostread_title, onthisday_title, random)
  - **url**: Wikipedia article URL (optional but recommended)
  - **score**: Interestingness score (0-100, higher is more interesting)

## Updating Word Lists

### Manual Update

1. Edit the JSON file for your target language
2. Add/remove/modify word entries
3. Update the `lastUpdated` field to current date
4. Ensure all words follow the format above
5. Validate JSON syntax before committing

### Automated Update (Future)

A script to fetch fresh words from Wikipedia and update these files:

```bash
npm run update-wikipedia-words -- --language en
```

## Word Selection Criteria

Words are selected based on:

1. **Interestingness Score** (50-100):
   - Source quality: TFA (Today's Featured Article) > On This Day > Most Read > Random
   - Character variety: More unique characters = higher score
   - Length: Slightly longer words score higher
   - Novelty: Avoid overused/common words

2. **Validation**:
   - Minimum length: 4 characters (2 for Japanese)
   - Maximum length: 8 characters (4 for Japanese)
   - Character set: Valid for target language
   - No spaces, hyphens, or numbers
   - Not in stopword list

3. **Quality**:
   - Comes from Wikipedia featured content
   - Has valid Wikipedia article URL
   - Not recently used (30-day window)

## Language-Specific Notes

### English (`en.json`)
- Uppercase format
- 4-8 character range
- Astronomy, nature, and mythology themes

### Hebrew (`he.json`)
- Native Hebrew script
- 4-8 character range
- Space, nature, and cultural themes
- Final letter normalization handled by processor

### Swedish (`sv.json`)
- Uppercase format with diacritics (Å, Ä, Ö)
- Nordic mythology and nature themes

### Japanese (`ja.json`)
- Native script (Kanji, Hiragana, Katakana)
- 2-4 character range (kanji compounds)
- Traditional culture and nature themes

### Spanish (`es.json`)
- Uppercase with diacritics (Á, É, Í, Ó, Ú, Ü, Ñ)
- Astronomy, nature, and adventure themes

## Best Practices

1. **Diversity**: Include words from various themes (astronomy, nature, history, mythology)
2. **Quality**: Prefer words with interesting meanings and valid Wikipedia articles
3. **Scoring**: Use scores 70-92 range, reserve 90+ for truly exceptional words
4. **URLs**: Always include Wikipedia article URLs for context
5. **Sources**: Mix tfa_title (highest quality), mostread_title, and onthisday_title
6. **Quantity**: Aim for 40-50 words per language minimum
7. **Update Regularly**: Refresh every 3-6 months with new featured content

## Testing

After updating JSON files, test locally:

```bash
# Start server in production mode
NODE_ENV=production npm run dev

# Check logs for JSON file loading
# Should see: "[WikiPopulator] Loaded X words from local JSON for {lang}"
```

## Troubleshooting

### JSON not loading in production
- Check file path: `fe-next/data/wikipedia-words/{lang}.json`
- Verify JSON syntax with a validator
- Check file permissions (should be readable)
- Look for errors in server logs

### Words not appearing
- Verify word format matches language requirements
- Check recently used words (30-day cache)
- Ensure validation_status is set correctly in database
- Review interestingness scores (too low scores may be filtered)

### Score calculation issues
- Base score: 50
- Source bonus: TFA +20, On This Day +15, Most Read +10, Random +5
- Character variety: Up to +15
- Length bonus: +5 for 6+ chars, +10 for 7+ chars
- Overused penalty: -25
- Double letter penalty: -5

## Related Files

- `/backend/services/wikipediaWordPopulator.ts` - Main populator logic
- `/backend/services/wikipediaWordFetcher.ts` - Wikipedia API fetcher
- `/utils/dailyChallenge/wikipediaWordProcessor.ts` - Word validation and ranking

## Deployment

These files are committed to the repository and deployed with the application. They are read at runtime when Wikipedia words are needed.

**Important**: Always commit updated JSON files so they are available in production.

## Future Enhancements

- [ ] Automated update script from Wikipedia API
- [ ] Admin UI for managing word lists
- [ ] A/B testing different word sets
- [ ] Analytics on word performance (completion rates, player engagement)
- [ ] Seasonal/themed word rotations
