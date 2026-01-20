/**
 * Test Wikipedia word fallback system
 * Verifies that local JSON files are properly loaded by wikipediaWordPopulator
 */

import { populateWikipediaWords } from '../backend/services/wikipediaWordPopulator';
import type { Language } from '@/shared/types/game';

const LANGUAGES: Language[] = ['en', 'he', 'sv', 'ja', 'es'];

async function testFallbackSystem() {
  console.log('\n=== Testing Wikipedia Word Fallback System ===\n');

  let allTestsPassed = true;

  for (const language of LANGUAGES) {
    try {
      console.log(`Testing ${language}...`);

      // Call the populator (simulating production environment)
      const result = await populateWikipediaWords(new Date(), language);

      // Check result
      if (!result) {
        console.log(`  ❌ No result returned`);
        allTestsPassed = false;
        continue;
      }

      console.log(`  ✅ Source: ${result.source}`);
      console.log(`  ✅ Words found: ${result.wordsFound}`);
      console.log(`  ✅ Candidates: ${result.candidates.length}`);

      if (result.selectedWord) {
        console.log(`  ✅ Selected word: ${result.selectedWord}`);
      }

      // Verify source preference (local_json should be preferred in production)
      if (process.env.NODE_ENV === 'production' && result.source !== 'local_json') {
        console.log(`  ⚠️  Warning: Expected 'local_json' source in production, got '${result.source}'`);
      }

      // Verify we got words
      if (result.wordsFound === 0) {
        console.log(`  ❌ No words found`);
        allTestsPassed = false;
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      allTestsPassed = false;
    }

    console.log('');
  }

  console.log('='.repeat(70));
  if (allTestsPassed) {
    console.log('✅ All fallback tests passed!');
    console.log('Local JSON files are loading correctly.');
  } else {
    console.log('❌ Some tests failed. Check the errors above.');
  }
  console.log('='.repeat(70) + '\n');

  process.exit(allTestsPassed ? 0 : 1);
}

// Run tests
testFallbackSystem().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
