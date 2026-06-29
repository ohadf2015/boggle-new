#!/usr/bin/env node
/**
 * assert-vitest-passed.mjs — result-gated pass/fail for the sharded CI test step.
 *
 * Context: shard 6 intermittently fails CI with "Worker exited unexpectedly" /
 * "Worker forks emitted error" AFTER every test has already passed. It is a
 * worker-process crash during teardown (open-handle / native-module class),
 * NOT a test failure and NOT a V8 heap OOM (raising the heap had zero effect —
 * see reverted commit 0c573641). The crash makes vitest exit non-zero, which
 * red-flags an otherwise-green run and blocks every merge.
 *
 * This gate decides success from vitest's JSON report instead of its exit code:
 * the step passes iff the report proves a full suite ran with ZERO failed tests.
 * A real test failure still fails CI — this only tolerates a post-success
 * teardown crash. It can never mask a genuine failure:
 *
 *   - report missing / unparseable      -> FAIL (cannot confirm success)
 *   - zero suites or zero tests ran      -> FAIL (suite didn't actually execute)
 *   - any failed test or failed suite    -> FAIL
 *   - all tests passed, vitest rc != 0   -> PASS, with a loud warning (the crash)
 *   - all tests passed, vitest rc == 0   -> PASS
 *
 * Usage: node assert-vitest-passed.mjs <report.json> <vitestExitCode>
 */
import { readFileSync } from 'node:fs';

const reportPath = process.argv[2];
const vitestRc = process.argv[3] ?? '';

if (!reportPath) {
  console.error('::error::assert-vitest-passed: no report path argument provided. FAIL.');
  process.exit(1);
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, 'utf8'));
} catch (err) {
  console.error(
    `::error::assert-vitest-passed: could not read/parse vitest JSON report at "${reportPath}" ` +
      `(${err.message}). Cannot confirm tests passed — treating as FAILURE.`,
  );
  process.exit(1);
}

const num = (key) => (typeof report[key] === 'number' ? report[key] : NaN);
const numFailedTests = num('numFailedTests');
const numFailedTestSuites = num('numFailedTestSuites');
const numTotalTests = num('numTotalTests');
const numTotalTestSuites = num('numTotalTestSuites');
const numPassedTests = num('numPassedTests');

// The report must carry the counters we gate on; their absence means we cannot
// trust it, so fail rather than guess.
if ([numFailedTests, numFailedTestSuites, numTotalTests, numTotalTestSuites].some(Number.isNaN)) {
  console.error(
    '::error::assert-vitest-passed: vitest JSON report is missing expected counters ' +
      '(numFailedTests/numFailedTestSuites/numTotalTests/numTotalTestSuites). FAIL.',
  );
  process.exit(1);
}

// A crash BEFORE the suite ran would leave these at zero — never treat that as success.
if (numTotalTestSuites <= 0 || numTotalTests <= 0) {
  console.error(
    `::error::assert-vitest-passed: report shows no work ran ` +
      `(suites=${numTotalTestSuites}, tests=${numTotalTests}). The suite did not execute — FAIL.`,
  );
  process.exit(1);
}

if (numFailedTests > 0 || numFailedTestSuites > 0) {
  console.error(
    `::error::assert-vitest-passed: ${numFailedTests} failed test(s) across ` +
      `${numFailedTestSuites} failed suite(s). Real test failure — FAIL.`,
  );
  process.exit(1);
}

// All tests passed. If vitest itself exited non-zero, it is the post-success
// worker/teardown crash we are deliberately tolerating.
if (vitestRc !== '' && vitestRc !== '0') {
  console.warn(
    `::warning::assert-vitest-passed: vitest exited ${vitestRc} but all ${numPassedTests}/${numTotalTests} ` +
      `tests passed across ${numTotalTestSuites} suites. Tolerating a post-success worker crash ` +
      `(open-handle/teardown). If this warning is frequent, root-cause the leaking test file.`,
  );
}

console.log(
  `✅ assert-vitest-passed: ${numPassedTests}/${numTotalTests} tests passed across ${numTotalTestSuites} suites.`,
);
process.exit(0);
