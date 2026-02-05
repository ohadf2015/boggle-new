#!/usr/bin/env npx ts-node

/**
 * Hebrew Dictionary Enrichment Script
 *
 * Background job that:
 * 1. Fetches Hebrew words pending verification from invalid_word_submissions
 * 2. Verifies each word against milog.co.il
 * 3. Promotes verified words to the Hebrew dictionary
 *
 * Usage:
 *   npx ts-node scripts/enrich-hebrew-dictionary.ts
 *   npx ts-node scripts/enrich-hebrew-dictionary.ts --verify-only
 *   npx ts-node scripts/enrich-hebrew-dictionary.ts --promote-only
 *   npx ts-node scripts/enrich-hebrew-dictionary.ts --batch-size=100
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   REDIS_URL (optional, for caching)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { runDictionaryEnrichment, promoteVerifiedWordsToDictionary } from '../backend/modules/dictionaryEnrichment';
import { processMilogVerificationQueue } from '../backend/services/milogWordVerifier';

interface Options {
  verifyOnly: boolean;
  promoteOnly: boolean;
  batchSize: number;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    verifyOnly: false,
    promoteOnly: false,
    batchSize: 50,
  };

  for (const arg of args) {
    if (arg === '--verify-only') {
      options.verifyOnly = true;
    } else if (arg === '--promote-only') {
      options.promoteOnly = true;
    } else if (arg.startsWith('--batch-size=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!isNaN(value) && value > 0) {
        options.batchSize = value;
      }
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Hebrew Dictionary Enrichment Script

Usage:
  npx ts-node scripts/enrich-hebrew-dictionary.ts [options]

Options:
  --verify-only    Only verify words against milog.co.il (don't promote)
  --promote-only   Only promote already-verified words to dictionary
  --batch-size=N   Process N words per batch (default: 50)
  --help, -h       Show this help message

Examples:
  npx ts-node scripts/enrich-hebrew-dictionary.ts
  npx ts-node scripts/enrich-hebrew-dictionary.ts --verify-only --batch-size=100
  npx ts-node scripts/enrich-hebrew-dictionary.ts --promote-only
`);
      process.exit(0);
    }
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs();

  console.log('='.repeat(60));
  console.log('Hebrew Dictionary Enrichment');
  console.log('='.repeat(60));
  console.log(`Mode: ${options.verifyOnly ? 'Verify Only' : options.promoteOnly ? 'Promote Only' : 'Full Pipeline'}`);
  console.log(`Batch Size: ${options.batchSize}`);
  console.log('='.repeat(60));

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('ERROR: Missing required environment variables');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  try {
    if (options.promoteOnly) {
      // Only promote already-verified words
      console.log('\n📚 Promoting verified words to dictionary...\n');
      const result = await promoteVerifiedWordsToDictionary(options.batchSize);
      console.log(`\n✅ Promotion complete: ${result.promoted} promoted, ${result.failed} failed`);
      if (result.words.length > 0) {
        console.log('Promoted words:', result.words.join(', '));
      }
    } else if (options.verifyOnly) {
      // Only verify words against milog
      console.log('\n🔍 Verifying words against milog.co.il...\n');
      const result = await processMilogVerificationQueue({ batchSize: options.batchSize });
      console.log(`\n✅ Verification complete:`);
      console.log(`   Processed: ${result.processed}`);
      console.log(`   Verified: ${result.verified}`);
      console.log(`   Not Found: ${result.notFound}`);
      console.log(`   Errors: ${result.errors}`);
    } else {
      // Full pipeline
      console.log('\n🚀 Running full enrichment pipeline...\n');
      const result = await runDictionaryEnrichment();
      console.log('\n' + '='.repeat(60));
      console.log('SUMMARY');
      console.log('='.repeat(60));
      console.log(`Verification: ${result.verification.verified} verified out of ${result.verification.processed} processed`);
      console.log(`Promotion: ${result.promotion.promoted} promoted, ${result.promotion.failed} failed`);
      if (result.promotion.words.length > 0) {
        console.log('New dictionary words:', result.promotion.words.join(', '));
      }
    }

    console.log('\n✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed with error:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
