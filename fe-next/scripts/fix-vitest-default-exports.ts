#!/usr/bin/env tsx
/**
 * Fixes vi.mock() calls for modules with default exports.
 * Wraps factory returns with { default: ... } where needed.
 */
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const ROOT = path.resolve(__dirname, '..');

// Modules that use `export default` and need { default: ... } wrapping
const DEFAULT_EXPORT_MODULES = [
  'logger',
  'supabaseServer',
  'supabasePool',
  'redisClient',
];

async function main() {
  const files = await glob('backend/**/*.test.{ts,js}', { cwd: ROOT });
  let totalChanges = 0;

  for (const rel of files) {
    const filePath = path.join(ROOT, rel);
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;

    for (const mod of DEFAULT_EXPORT_MODULES) {
      // Match: vi.mock('.../<mod>', () => ({  ...  }));
      // But NOT already wrapped with { default: ... }
      const regex = new RegExp(
        `(vi\\.mock\\([^)]*\\/${mod}['"][^)]*,\\s*\\(\\)\\s*=>\\s*)\\(\\{([^}]+)\\}\\)`,
        'g'
      );

      content = content.replace(regex, (match, prefix, body) => {
        // Check if already has default wrapper
        if (body.includes('default:')) return match;
        return `${prefix}({ default: {${body}} })`;
      });
    }

    // Also fix multiline logger mocks with forGame
    // Pattern: vi.mock('...logger...', () => ({ ... forGame: ... }))
    // These span multiple lines, need a different approach
    const loggerMockRegex = /vi\.mock\((['"][^'"]*logger[^'"]*['"])\s*,\s*\(\)\s*=>\s*\(\{([\s\S]*?)\}\)\)/g;
    content = content.replace(loggerMockRegex, (match, modPath, body) => {
      if (body.includes('default:')) return match;
      return `vi.mock(${modPath}, () => ({ default: {${body}} }))`;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      totalChanges++;
      console.log(`  ✓ ${rel}`);
    }
  }

  console.log(`\nFixed default exports in ${totalChanges} files`);
}

main().catch(console.error);
