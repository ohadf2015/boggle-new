#!/usr/bin/env npx ts-node

/**
 * Wikipedia E2E Verification Script
 *
 * Manual verification script to test the Wikipedia word pipeline
 * in a live environment (staging or production).
 *
 * Usage:
 *   npm run verify:wikipedia
 *   npm run verify:wikipedia -- --language=en
 *   npm run verify:wikipedia -- --language=all
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL set
 *   - SUPABASE_SERVICE_ROLE_KEY set
 *   - (Optional) GOOGLE_APPLICATION_CREDENTIALS for AI validation
 */

import { createClient } from '@supabase/supabase-js';

const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;

interface VerificationResult {
  step: string;
  status: 'pass' | 'fail' | 'skip';
  details: string;
  duration?: number;
}

async function verifyWikipediaPipeline(language?: string): Promise<void> {
  console.log('='.repeat(60));
  console.log('Wikipedia E2E Verification');
  console.log('='.repeat(60));
  console.log();

  const results: VerificationResult[] = [];
  const targetLanguages = language === 'all' ? LANGUAGES : [language || 'en'];

  // Step 1: Verify environment
  results.push(verifyEnvironment());

  // Step 2: Verify database connection
  results.push(await verifyDatabaseConnection());

  // Step 3: Verify Wikipedia word candidates exist
  for (const lang of targetLanguages) {
    results.push(await verifyCandidatesExist(lang));
  }

  // Step 4: Verify community_words contains promoted words
  for (const lang of targetLanguages) {
    results.push(await verifyCommunityWords(lang));
  }

  // Step 5: Verify word validation works
  results.push(await verifyWordValidation());

  // Print results
  console.log();
  console.log('='.repeat(60));
  console.log('Results Summary');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
    console.log(`${icon} ${result.step}: ${result.details}`);

    if (result.status === 'pass') passed++;
    else if (result.status === 'fail') failed++;
    else skipped++;
  }

  console.log();
  console.log(`Total: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log();

  if (failed > 0) {
    console.log('❌ Verification FAILED - see errors above');
    process.exit(1);
  } else {
    console.log('✅ Verification PASSED');
    process.exit(0);
  }
}

function verifyEnvironment(): VerificationResult {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    return {
      step: 'Environment Variables',
      status: 'fail',
      details: `Missing: ${missing.join(', ')}`
    };
  }

  return {
    step: 'Environment Variables',
    status: 'pass',
    details: 'All required variables present'
  };
}

async function verifyDatabaseConnection(): Promise<VerificationResult> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('wikipedia_word_candidates')
      .select('id')
      .limit(1);

    if (error) throw error;

    return {
      step: 'Database Connection',
      status: 'pass',
      details: 'Connected to Supabase'
    };
  } catch (error) {
    return {
      step: 'Database Connection',
      status: 'fail',
      details: `Connection failed: ${error instanceof Error ? error.message : 'Unknown'}`
    };
  }
}

async function verifyCandidatesExist(language: string): Promise<VerificationResult> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error, count } = await supabase
      .from('wikipedia_word_candidates')
      .select('*', { count: 'exact' })
      .eq('language', language)
      .gte('fetch_date', thirtyDaysAgo.toISOString().split('T')[0])
      .limit(5);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        step: `Candidates (${language})`,
        status: 'fail',
        details: 'No candidates found in last 30 days'
      };
    }

    const validCount = data.filter(c => c.validation_status === 'valid').length;

    return {
      step: `Candidates (${language})`,
      status: 'pass',
      details: `${count} total, ${validCount}/${data.length} sample are valid`
    };
  } catch (error) {
    return {
      step: `Candidates (${language})`,
      status: 'fail',
      details: `Query failed: ${error instanceof Error ? error.message : 'Unknown'}`
    };
  }
}

async function verifyCommunityWords(language: string): Promise<VerificationResult> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error, count } = await supabase
      .from('community_words')
      .select('*', { count: 'exact' })
      .eq('language', language)
      .limit(5);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        step: `Dictionary (${language})`,
        status: 'fail',
        details: 'No community_words found - words not syncing to dictionary'
      };
    }

    return {
      step: `Dictionary (${language})`,
      status: 'pass',
      details: `${count} words in dictionary`
    };
  } catch (error) {
    return {
      step: `Dictionary (${language})`,
      status: 'fail',
      details: `Query failed: ${error instanceof Error ? error.message : 'Unknown'}`
    };
  }
}

async function verifyWordValidation(): Promise<VerificationResult> {
  try {
    // Test format validation (doesn't require AI)
    const { validateGameWord } = await import('../utils/dailyChallenge/wikipediaWordProcessor');

    const testCases = [
      { word: 'HELLO', language: 'en', shouldPass: true },
      { word: 'HI', language: 'en', shouldPass: false },  // Too short
      { word: 'COVID-19', language: 'en', shouldPass: false },  // Has hyphen/number
    ];

    for (const test of testCases) {
      const result = validateGameWord(test.word, test.language as 'en');
      if (result.valid !== test.shouldPass) {
        return {
          step: 'Word Validation',
          status: 'fail',
          details: `${test.word} expected ${test.shouldPass}, got ${result.valid}`
        };
      }
    }

    return {
      step: 'Word Validation',
      status: 'pass',
      details: 'Format validation working correctly'
    };
  } catch (error) {
    return {
      step: 'Word Validation',
      status: 'fail',
      details: `Validation error: ${error instanceof Error ? error.message : 'Unknown'}`
    };
  }
}

// Parse arguments and run
const args = process.argv.slice(2);
const languageArg = args.find(a => a.startsWith('--language='));
const language = languageArg ? languageArg.split('=')[1] : 'en';

verifyWikipediaPipeline(language);
