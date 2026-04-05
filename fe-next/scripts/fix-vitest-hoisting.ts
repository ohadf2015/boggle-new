#!/usr/bin/env tsx
/**
 * Fixes vi.mock() hoisting issues in backend tests.
 *
 * Problem: Vitest hoists vi.mock() to the top of the file, above all variable declarations.
 * When vi.mock() factories reference top-level `const mockX = vi.fn()`, those variables
 * haven't been initialized yet → ReferenceError.
 *
 * Solution: Wrap mock variable declarations that are referenced in vi.mock() factories
 * with vi.hoisted(), which ensures they're initialized before vi.mock() runs.
 *
 * Run: npx tsx scripts/fix-vitest-hoisting.ts
 */
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const ROOT = path.resolve(__dirname, '..');

/**
 * Extract all variable names referenced inside vi.mock() factory functions.
 */
function getVarsUsedInMockFactories(content: string): Set<string> {
  const vars = new Set<string>();
  // Find all vi.mock('...', () => ...) calls and extract referenced identifiers
  const mockRegex = /vi\.mock\([^,]+,\s*\(\)\s*=>\s*(?:\(?\s*\{[\s\S]*?\}\)?\s*)\)/g;
  let match;
  while ((match = mockRegex.exec(content)) !== null) {
    const factory = match[0];
    // Find all identifiers that look like mock variables
    const varRefs = factory.matchAll(/\b(mock\w+)\b/g);
    for (const ref of varRefs) {
      vars.add(ref[1]);
    }
  }
  return vars;
}

async function main() {
  const files = await glob('backend/**/*.test.{ts,js}', { cwd: ROOT });
  let totalChanges = 0;

  for (const rel of files) {
    const filePath = path.join(ROOT, rel);
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;

    // Skip if no vi.mock with factory
    if (!content.includes('vi.mock(')) continue;

    // Get all mock variable names used in vi.mock() factories
    const usedVars = getVarsUsedInMockFactories(content);
    if (usedVars.size === 0) continue;

    // Find and wrap individual mock variable declarations
    // Pattern: const mockX = vi.fn(...); OR const mockX = vi.fn().mockReturnValue(...);
    content = content.replace(
      /^(const\s+(mock\w+)\s*=\s*)(vi\.fn\b.*);?\s*$/gm,
      (_match, prefix, varName, value) => {
        if (!usedVars.has(varName)) return _match;
        // Already wrapped
        if (_match.includes('vi.hoisted')) return _match;
        // Clean trailing semicolon from value
        const cleanValue = value.replace(/;?\s*$/, '');
        return `${prefix}vi.hoisted(() => ${cleanValue});`;
      }
    );

    // Also handle: const mockX = { key: vi.fn(), ... }; (single line, simple objects)
    // But ONLY if the object doesn't reference other mock variables (to avoid ordering issues)
    content = content.replace(
      /^(const\s+(mock\w+)\s*=\s*)(\{[^}]+\});?\s*$/gm,
      (_match, prefix, varName, value) => {
        if (!usedVars.has(varName)) return _match;
        if (_match.includes('vi.hoisted')) return _match;
        // Check if this object references other mock variables
        const otherMockRefs = [...value.matchAll(/\b(mock\w+)\b/g)]
          .map(m => m[1])
          .filter(name => name !== varName);
        // If it references other mock vars, skip — ordering is too complex
        if (otherMockRefs.some(ref => usedVars.has(ref))) return _match;
        const cleanValue = value.replace(/;?\s*$/, '');
        return `${prefix}vi.hoisted(() => (${cleanValue}));`;
      }
    );

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      totalChanges++;
      console.log(`  ✓ ${rel}`);
    }
  }

  console.log(`\nFixed hoisting in ${totalChanges} files`);
}

main().catch(console.error);
