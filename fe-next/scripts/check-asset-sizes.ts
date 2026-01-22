#!/usr/bin/env tsx
/**
 * Asset size validation script for CI
 * Fails if any image asset exceeds the size limit
 *
 * Usage:
 *   npx tsx scripts/check-asset-sizes.ts
 *   npx tsx scripts/check-asset-sizes.ts --limit-kb=150
 *   npx tsx scripts/check-asset-sizes.ts --dir=public/images/
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const DEFAULT_LIMIT_KB = 200;
const DEFAULT_DIR = 'public/assets';
const IMAGE_EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg'];

interface ValidationResult {
  path: string;
  sizeKb: number;
  status: 'ok' | 'warning' | 'error';
}

async function findImageFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const nested = await findImageFiles(fullPath);
        results.push(...nested);
      } else if (IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist, return empty
  }

  return results;
}

async function checkAssetSizes(
  dir: string,
  limitKb: number
): Promise<{ results: ValidationResult[]; passed: boolean }> {
  const files = await findImageFiles(dir);
  const results: ValidationResult[] = [];
  let hasError = false;

  for (const file of files) {
    const stats = await fs.stat(file);
    const sizeKb = stats.size / 1024;
    const relativePath = path.relative(process.cwd(), file);

    let status: ValidationResult['status'] = 'ok';

    if (sizeKb > limitKb) {
      status = 'error';
      hasError = true;
    } else if (sizeKb > limitKb * 0.9) {
      status = 'warning'; // Within 10% of limit
    }

    results.push({ path: relativePath, sizeKb, status });
  }

  // Sort by size descending
  results.sort((a, b) => b.sizeKb - a.sizeKb);

  return { results, passed: !hasError };
}

function formatResult(result: ValidationResult, limitKb: number): string {
  const icon = result.status === 'ok' ? '✓' : result.status === 'warning' ? '⚠' : '✗';
  const percentage = ((result.sizeKb / limitKb) * 100).toFixed(0);
  return `${icon} ${result.path}: ${result.sizeKb.toFixed(1)}KB (${percentage}% of limit)`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(`
Asset Size Validation Script

Usage:
  npx tsx scripts/check-asset-sizes.ts [options]

Options:
  --limit-kb=<number>  Size limit in KB (default: 200)
  --dir=<path>        Directory to check (default: public/assets)
  --verbose           Show all files, not just errors/warnings
  --json              Output as JSON

Example:
  npx tsx scripts/check-asset-sizes.ts --limit-kb=150 --dir=public/images/
    `);
    process.exit(0);
  }

  const limitKb = parseInt(
    args.find((a) => a.startsWith('--limit-kb='))?.split('=')[1] || String(DEFAULT_LIMIT_KB)
  );
  const dir = args.find((a) => a.startsWith('--dir='))?.split('=')[1] || DEFAULT_DIR;
  const verbose = args.includes('--verbose');
  const json = args.includes('--json');

  console.log(`Checking assets in ${dir} (limit: ${limitKb}KB)\n`);

  const { results, passed } = await checkAssetSizes(dir, limitKb);

  if (results.length === 0) {
    console.log('No image assets found.');
    process.exit(0);
  }

  if (json) {
    console.log(JSON.stringify({ limitKb, results, passed }, null, 2));
  } else {
    const filtered = verbose
      ? results
      : results.filter((r) => r.status !== 'ok');

    if (filtered.length > 0) {
      filtered.forEach((r) => console.log(formatResult(r, limitKb)));
    }

    const errors = results.filter((r) => r.status === 'error').length;
    const warnings = results.filter((r) => r.status === 'warning').length;
    const ok = results.filter((r) => r.status === 'ok').length;

    console.log(`\nSummary: ${ok} ok, ${warnings} warnings, ${errors} errors`);

    if (!passed) {
      console.log(`\n✗ FAILED: ${errors} asset(s) exceed ${limitKb}KB limit`);
    } else {
      console.log(`\n✓ PASSED: All assets under ${limitKb}KB`);
    }
  }

  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
