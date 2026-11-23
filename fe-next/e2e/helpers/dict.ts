import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

// The server never serves public/dicts (the pre-Next gate drops /dicts), so specs read the build artifact from disk.
export function readEnglishDictionary(): string[] {
  const file = path.resolve(process.cwd(), 'public/dicts/en.dict.gz');
  if (!fs.existsSync(file)) throw new Error(`${file} missing: run \`npm run build:dicts\` first`);
  return gunzipSync(fs.readFileSync(file)).toString('utf8').split('\n');
}
