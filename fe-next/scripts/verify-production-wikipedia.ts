/**
 * Production Environment Verification for Wikipedia Flow
 * Tests the specific issues that might prevent Wikipedia from working on the server
 */

import ky, { HTTPError } from 'ky';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface VerificationResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

const results: VerificationResult[] = [];

/**
 * Test 1: DNS Resolution
 * Verify that the Wikipedia API domain can be resolved
 */
async function testDnsResolution(): Promise<void> {
  log('\n[Test 1/6] DNS Resolution...', 'blue');

  try {
    const dns = await import('dns').then(m => m.promises);
    const addresses = await dns.resolve4('api.wikimedia.org');

    if (addresses && addresses.length > 0) {
      results.push({
        test: 'DNS Resolution',
        status: 'pass',
        message: 'Successfully resolved api.wikimedia.org',
        details: `IP addresses: ${addresses.join(', ')}`
      });
      log('✓ DNS resolution works', 'green');
    } else {
      results.push({
        test: 'DNS Resolution',
        status: 'fail',
        message: 'No IP addresses found',
        details: 'DNS lookup returned empty result'
      });
      log('✗ DNS resolution failed', 'red');
    }
  } catch (error) {
    results.push({
      test: 'DNS Resolution',
      status: 'fail',
      message: 'DNS lookup failed',
      details: error instanceof Error ? error.message : String(error)
    });
    log(`✗ DNS error: ${error instanceof Error ? error.message : error}`, 'red');
  }
}

/**
 * Test 2: HTTPS Connectivity
 * Verify that we can make HTTPS requests to Wikipedia API
 */
async function testHttpsConnectivity(): Promise<void> {
  log('\n[Test 2/6] HTTPS Connectivity...', 'blue');

  try {
    const startTime = Date.now();
    const response = await ky.get('https://api.wikimedia.org/feed/v1/wikipedia/en/featured/2026/01/19', {
      headers: {
        'User-Agent': 'LexiClash/1.0 (https://lexiclash.com; contact@lexiclash.com)',
        'Accept': 'application/json'
      },
      timeout: 10000,
      retry: 0,
    });

    const duration = Date.now() - startTime;

    if (response.ok) {
      results.push({
        test: 'HTTPS Connectivity',
        status: 'pass',
        message: 'Successfully connected to Wikipedia API',
        details: `Response time: ${duration}ms`
      });
      log(`✓ HTTPS connectivity works (${duration}ms)`, 'green');
    } else {
      results.push({
        test: 'HTTPS Connectivity',
        status: 'warning',
        message: `Unexpected status code: ${response.status}`,
        details: `Expected 200, got ${response.status}`
      });
      log(`⚠ Unexpected status: ${response.status}`, 'yellow');
    }
  } catch (error) {
    if (error instanceof HTTPError) {
      const details = error.message;

      results.push({
        test: 'HTTPS Connectivity',
        status: 'fail',
        message: 'Failed to connect to Wikipedia API',
        details
      });
      log(`✗ HTTPS error: ${details}`, 'red');
    } else {
      results.push({
        test: 'HTTPS Connectivity',
        status: 'fail',
        message: 'Unexpected error',
        details: error instanceof Error ? error.message : String(error)
      });
      log(`✗ Error: ${error}`, 'red');
    }
  }
}

/**
 * Test 3: TLS/SSL Certificate Validation
 * Verify that SSL certificates are trusted
 */
async function testTlsCertificate(): Promise<void> {
  log('\n[Test 3/6] TLS/SSL Certificate...', 'blue');

  try {
    const https = await import('https');

    // Try with strict SSL validation using native https
    const status = await new Promise<number>((resolve, reject) => {
      const req = https.get('https://api.wikimedia.org/', {
        rejectUnauthorized: true,
        timeout: 5000,
      }, (res) => resolve(res.statusCode ?? 0));
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('TLS request timed out')); });
    });

    results.push({
      test: 'TLS/SSL Certificate',
      status: 'pass',
      message: 'SSL certificate is valid and trusted',
      details: `Status: ${status}`
    });
    log('✓ SSL certificate verification passed', 'green');
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes('certificate')) {
      results.push({
        test: 'TLS/SSL Certificate',
        status: 'fail',
        message: 'SSL certificate validation failed',
        details: errMsg
      });
      log('✗ SSL certificate error', 'red');
    } else {
      results.push({
        test: 'TLS/SSL Certificate',
        status: 'warning',
        message: 'Could not verify SSL certificate',
        details: errMsg
      });
      log('⚠ Could not verify SSL certificate', 'yellow');
    }
  }
}

/**
 * Test 4: Redis Connection
 * Verify Redis is available and responsive
 */
async function testRedisConnection(): Promise<void> {
  log('\n[Test 4/6] Redis Connection...', 'blue');

  try {
    const { getRedisClient } = await import('../backend/redisClient');
    const redis = getRedisClient();

    if (!redis) {
      results.push({
        test: 'Redis Connection',
        status: 'warning',
        message: 'Redis client not available',
        details: 'Redis is optional - Wikipedia will work without it (no caching)'
      });
      log('⚠ Redis not available (Wikipedia will work without caching)', 'yellow');
      return;
    }

    // Test with timeout
    const startTime = Date.now();
    const testKey = 'test:wikipedia:health';

    try {
      await Promise.race([
        redis.setex(testKey, 10, 'health-check'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000))
      ]);

      const value = await Promise.race([
        redis.get(testKey),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000))
      ]);

      const duration = Date.now() - startTime;

      if (value === 'health-check') {
        results.push({
          test: 'Redis Connection',
          status: 'pass',
          message: 'Redis is available and responsive',
          details: `Response time: ${duration}ms`
        });
        log(`✓ Redis working (${duration}ms)`, 'green');
      } else {
        results.push({
          test: 'Redis Connection',
          status: 'fail',
          message: 'Redis data mismatch',
          details: 'SET succeeded but GET returned wrong value'
        });
        log('✗ Redis data integrity issue', 'red');
      }

      // Cleanup
      await redis.del(testKey).catch(() => {});
    } catch (error) {
      results.push({
        test: 'Redis Connection',
        status: 'fail',
        message: 'Redis operation timed out or failed',
        details: error instanceof Error ? error.message : String(error)
      });
      log(`✗ Redis error: ${error instanceof Error ? error.message : error}`, 'red');
    }
  } catch (error) {
    results.push({
      test: 'Redis Connection',
      status: 'warning',
      message: 'Could not test Redis',
      details: error instanceof Error ? error.message : String(error)
    });
    log(`⚠ Redis test error: ${error}`, 'yellow');
  }
}

/**
 * Test 5: Environment Variables
 * Verify required environment variables are set
 */
async function testEnvironmentVariables(): Promise<void> {
  log('\n[Test 5/6] Environment Variables...', 'blue');

  const requiredVars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', required: false, purpose: 'Database storage (optional for API testing)' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', required: false, purpose: 'Database writes (optional for API testing)' }
  ];

  const issues: string[] = [];
  const warnings: string[] = [];

  for (const { name, required, purpose } of requiredVars) {
    const value = process.env[name];

    if (!value) {
      if (required) {
        issues.push(`${name} - ${purpose}`);
      } else {
        warnings.push(`${name} - ${purpose}`);
      }
    }
  }

  if (issues.length > 0) {
    results.push({
      test: 'Environment Variables',
      status: 'fail',
      message: 'Required environment variables missing',
      details: issues.join('\n')
    });
    log(`✗ Missing required env vars:\n${issues.map(i => `  - ${i}`).join('\n')}`, 'red');
  } else if (warnings.length > 0) {
    results.push({
      test: 'Environment Variables',
      status: 'warning',
      message: 'Optional environment variables missing',
      details: warnings.join('\n')
    });
    log(`⚠ Missing optional env vars (Wikipedia API will work, but DB features won't):\n${warnings.map(w => `  - ${w}`).join('\n')}`, 'yellow');
  } else {
    results.push({
      test: 'Environment Variables',
      status: 'pass',
      message: 'All environment variables configured',
      details: 'Ready for full functionality'
    });
    log('✓ All environment variables present', 'green');
  }
}

/**
 * Test 6: Full Wikipedia Flow (End-to-End)
 * Test the actual word fetching and extraction
 */
async function testWikipediaFlow(): Promise<void> {
  log('\n[Test 6/6] Full Wikipedia Flow...', 'blue');

  try {
    const { fetchFeaturedContent, extractWordsFromFeaturedContent } = await import('../backend/services/wikipediaWordFetcher');
    const { rankWordsByInterest } = await import('../utils/dailyChallenge/wikipediaWordProcessor');

    const startTime = Date.now();
    const featuredContent = await fetchFeaturedContent('en', new Date());
    const fetchTime = Date.now() - startTime;

    if (!featuredContent) {
      results.push({
        test: 'Wikipedia Flow',
        status: 'fail',
        message: 'Failed to fetch featured content',
        details: 'API returned null or empty response'
      });
      log('✗ Failed to fetch featured content', 'red');
      return;
    }

    const rawCandidates = extractWordsFromFeaturedContent(featuredContent, 'en');
    const rankedWords = rankWordsByInterest(rawCandidates, 'en');

    const totalTime = Date.now() - startTime;

    if (rankedWords.length >= 10) {
      results.push({
        test: 'Wikipedia Flow',
        status: 'pass',
        message: `Successfully extracted ${rankedWords.length} valid words`,
        details: `Fetch time: ${fetchTime}ms, Total time: ${totalTime}ms\nTop words: ${rankedWords.slice(0, 5).map(w => w.word).join(', ')}`
      });
      log(`✓ Wikipedia flow working! (${rankedWords.length} words in ${totalTime}ms)`, 'green');
    } else {
      results.push({
        test: 'Wikipedia Flow',
        status: 'warning',
        message: `Only ${rankedWords.length} words extracted (expected 10+)`,
        details: `This might indicate word extraction issues. Words: ${rankedWords.map(w => w.word).join(', ')}`
      });
      log(`⚠ Low word count: ${rankedWords.length} (expected 10+)`, 'yellow');
    }
  } catch (error) {
    results.push({
      test: 'Wikipedia Flow',
      status: 'fail',
      message: 'Wikipedia flow failed',
      details: error instanceof Error ? error.message : String(error)
    });
    log(`✗ Flow error: ${error}`, 'red');
  }
}

/**
 * Print summary report
 */
function printSummary(): void {
  log('\n' + '='.repeat(60), 'cyan');
  log('PRODUCTION VERIFICATION SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;

  log(`\nResults: ${passed} passed, ${failed} failed, ${warnings} warnings\n`, 'cyan');

  for (const result of results) {
    const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
    const color = result.status === 'pass' ? 'green' : result.status === 'fail' ? 'red' : 'yellow';

    log(`${icon} ${result.test}: ${result.message}`, color);
    if (result.details) {
      log(`  ${result.details}`, 'reset');
    }
  }

  log('\n' + '='.repeat(60), 'cyan');

  if (failed > 0) {
    log('\n⚠ PRODUCTION ISSUES DETECTED', 'red');
    log('Wikipedia flow will NOT work in production until these issues are resolved.', 'red');
    process.exit(1);
  } else if (warnings > 0) {
    log('\n⚠ WARNINGS DETECTED', 'yellow');
    log('Wikipedia flow should work, but with limited functionality.', 'yellow');
    process.exit(0);
  } else {
    log('\n✓ ALL CHECKS PASSED', 'green');
    log('Wikipedia flow is ready for production!', 'green');
    process.exit(0);
  }
}

/**
 * Main test runner
 */
async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║    Wikipedia Production Environment Verification Tool    ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  log('\nTesting production environment compatibility...', 'blue');

  // Run all tests
  await testDnsResolution();
  await testHttpsConnectivity();
  await testTlsCertificate();
  await testRedisConnection();
  await testEnvironmentVariables();
  await testWikipediaFlow();

  // Print summary
  printSummary();
}

// Run the verification
main().catch(error => {
  log('\n❌ Fatal error during verification:', 'red');
  console.error(error);
  process.exit(1);
});
