#!/usr/bin/env node
/**
 * AdMob unit provisioning helper.
 *
 * Two modes:
 *
 *   1. INTERACTIVE / PLAYWRITER — open AdMob console manually (or via
 *      the playwriter Chrome extension), copy each generated unit ID, and
 *      paste it into `scripts/admob-new-units.json`. The console UI rejects
 *      headless automation reliably (Google reCAPTCHA + 2FA), so this is
 *      the fastest path. The fallback chain in `lib/admob-config.ts` means
 *      the app keeps working with current IDs while units are warming up.
 *
 *   2. ENV EXPORT — once IDs are in the JSON, run this script to print
 *      Railway-ready `vercel env add` / `railway variables set` lines plus
 *      a `.env.local` block for local QA.
 *
 * Usage:
 *
 *   node scripts/admob-provision-units.mjs --print-instructions
 *   node scripts/admob-provision-units.mjs --emit-env
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.join(__dirname, 'admob-new-units.json');

const UNITS = [
  { key: 'REWARDED_HINT', name: 'Android - Rewarded - Hint', format: 'Rewarded' },
  { key: 'REWARDED_DOUBLE_GOLD', name: 'Android - Rewarded - DoubleGold', format: 'Rewarded' },
  { key: 'REWARDED_FREEZE', name: 'Android - Rewarded - Freeze', format: 'Rewarded' },
  { key: 'REWARDED_RETRY', name: 'Android - Rewarded - Retry', format: 'Rewarded' },
  { key: 'REWARDED_TIME_LOW', name: 'Android - Rewarded - TimeLow', format: 'Rewarded' },
  { key: 'BANNER_CONTENT', name: 'Android - Banner - Content', format: 'Banner' },
];

const ENV_VAR_NAMES = {
  REWARDED_HINT: 'NEXT_PUBLIC_ADMOB_REWARDED_HINT_ANDROID',
  REWARDED_DOUBLE_GOLD: 'NEXT_PUBLIC_ADMOB_REWARDED_DOUBLE_GOLD_ANDROID',
  REWARDED_FREEZE: 'NEXT_PUBLIC_ADMOB_REWARDED_FREEZE_ANDROID',
  REWARDED_RETRY: 'NEXT_PUBLIC_ADMOB_REWARDED_RETRY_ANDROID',
  REWARDED_TIME_LOW: 'NEXT_PUBLIC_ADMOB_REWARDED_TIME_LOW_ANDROID',
  BANNER_CONTENT: 'NEXT_PUBLIC_ADMOB_BANNER_CONTENT_ANDROID',
};

function loadJson() {
  if (!fs.existsSync(JSON_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')); }
  catch { return {}; }
}

function saveJson(obj) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(obj, null, 2) + '\n');
}

function printInstructions() {
  const existing = loadJson();
  console.log(`
=== AdMob Unit Provisioning ===

Open: https://apps.admob.com/v2/apps/<your-android-app>/adunits

For each unit below, click "ADD AD UNIT", choose the listed Format,
paste the exact display name, click CREATE, then copy the
"ca-app-pub-..." unit ID into ${path.relative(process.cwd(), JSON_PATH)}.
`);

  for (const u of UNITS) {
    const have = existing[u.key];
    const status = have ? `✓ ${have}` : `✗ (paste into JSON)`;
    console.log(`  - [${u.format.padEnd(8)}] "${u.name}"  ${status}`);
  }
  console.log(`
Schema for ${path.relative(process.cwd(), JSON_PATH)}:
${JSON.stringify(Object.fromEntries(UNITS.map(u => [u.key, 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'])), null, 2)}

After every ID is filled in, run:
  node scripts/admob-provision-units.mjs --emit-env

Tip: if you use the playwriter Chrome extension, log into AdMob in your
profile, then paste this snippet into a playwriter sandbox to navigate:

  await page.goto('https://apps.admob.com/v2/home');
  // then click your way to the Android app -> Ad units -> Add ad unit.
`);

  // Seed the JSON with empty placeholders if missing
  if (Object.keys(existing).length === 0) {
    saveJson(Object.fromEntries(UNITS.map(u => [u.key, ''])));
    console.log(`Seeded empty template at ${path.relative(process.cwd(), JSON_PATH)}\n`);
  }
}

function emitEnv() {
  const data = loadJson();
  const missing = UNITS.filter(u => !data[u.key]);
  if (missing.length) {
    console.error(`Missing IDs in ${JSON_PATH}:`);
    missing.forEach(u => console.error(`  - ${u.key} (${u.name})`));
    process.exit(1);
  }

  const lines = UNITS.map(u => `${ENV_VAR_NAMES[u.key]}=${data[u.key]}`);

  console.log('# .env.local block (paste into fe-next/.env.local for local QA):');
  console.log(lines.join('\n'));
  console.log('\n# Railway:');
  for (const u of UNITS) {
    console.log(`railway variables set ${ENV_VAR_NAMES[u.key]}=${data[u.key]}`);
  }
}

const arg = process.argv[2] || '--print-instructions';
if (arg === '--emit-env') emitEnv();
else printInstructions();
