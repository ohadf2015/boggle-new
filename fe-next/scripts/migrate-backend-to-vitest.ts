#!/usr/bin/env tsx
/**
 * Migrates backend test files from Jest to Vitest.
 * Handles: jest.* → vi.*, type refs, imports, default export wrapping.
 * Run: npx tsx scripts/migrate-backend-to-vitest.ts
 */
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const ROOT = path.resolve(__dirname, '..');

// Modules whose source uses `export default` — mocks need { default: ... } wrapping
const DEFAULT_EXPORT_MODULES = [
  'logger',
  'rateLimiter',
  'timerManager',
  'gameStartCoordinator',
  'gracePeriodLock',
  'pushNotificationService',
  'gameCleanup',
];

/**
 * Find the matching closing paren for the opening paren at `start`.
 * Handles nested parens, braces, brackets, and string literals.
 */
function findMatchingParen(src: string, start: number): number {
  let depth = 0;
  let i = start;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '(' || ch === '{' || ch === '[') {
      depth++;
    } else if (ch === ')' || ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return i;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      // Skip string literal
      const quote = ch;
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\') i++; // skip escaped char
        i++;
      }
    }
    i++;
  }
  return -1;
}

/**
 * Wrap mock factory body with { default: ... } for default-export modules.
 * Uses balanced paren matching to find the exact extent of the factory.
 */
function wrapDefaultExports(content: string): string {
  for (const mod of DEFAULT_EXPORT_MODULES) {
    // Find all vi.mock calls whose path ends with this module name
    const pattern = new RegExp(
      `vi\\.mock\\(\\s*(['"])([^'"]*\\/${mod})\\1\\s*,\\s*\\(\\)\\s*=>\\s*\\(`,
      'g'
    );

    let match: RegExpExecArray | null;
    const replacements: Array<{ start: number; end: number; replacement: string }> = [];

    while ((match = pattern.exec(content)) !== null) {
      // `match.index` is start of `vi.mock(`
      // Find the opening `(` of the factory return: `=> (`
      const arrowReturnStart = match.index + match[0].length - 1; // points to `(`
      const closingParen = findMatchingParen(content, arrowReturnStart);
      if (closingParen === -1) continue;

      // Extract the body between `({` and `})`
      const innerContent = content.slice(arrowReturnStart + 1, closingParen);

      // Skip if already wrapped with default
      if (innerContent.trimStart().startsWith('{') && /\bdefault\s*:/.test(innerContent)) {
        continue;
      }

      // The inner content should be `{ ... }` — wrap it as `{ default: { ... } }`
      // Check it starts with `{`
      const trimmed = innerContent.trim();
      if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) continue;

      const innerBody = trimmed.slice(1, -1); // strip outer { }
      const newInner = `{ default: {${innerBody}} }`;
      replacements.push({
        start: arrowReturnStart + 1,
        end: closingParen,
        replacement: newInner,
      });
    }

    // Apply replacements in reverse order to preserve indices
    for (let i = replacements.length - 1; i >= 0; i--) {
      const r = replacements[i];
      content = content.slice(0, r.start) + r.replacement + content.slice(r.end);
    }
  }

  return content;
}

/**
 * Wraps top-level `const mockX = vi.fn(...)` declarations with vi.hoisted()
 * so they're accessible inside vi.mock() factory functions (which get hoisted above all declarations).
 *
 * Uses SEQUENTIAL declarations inside the callback (not an object literal) so that
 * mock variables can reference each other: e.g. `const mockSupabase = { from: mockFrom }`.
 */
function hoistMockVariables(content: string): string {
  // Skip if no vi.mock with factory
  if (!content.includes('vi.mock(')) return content;
  // Skip if already has vi.hoisted
  if (content.includes('vi.hoisted(')) return content;

  const lines = content.split('\n');

  // Collect ALL mock variable declarations (const mockX = ...) that appear before the first vi.mock()
  const firstMockIdx = lines.findIndex(l => l.trim().startsWith('vi.mock('));
  if (firstMockIdx < 0) return content;

  interface MockVar {
    name: string;
    originalLines: string[];
    startLine: number;
    endLine: number;
  }

  const mockVars: MockVar[] = [];

  for (let i = 0; i < firstMockIdx; i++) {
    const line = lines[i].trim();

    // Match single-line: const mockX = vi.fn(...); OR const mockX = { ... };
    const singleMatch = line.match(/^const\s+(mock\w+)\s*=\s*.+$/);
    if (singleMatch) {
      // Check if it ends on this line (has balanced braces/parens and ends with ;)
      if (isBalanced(line)) {
        mockVars.push({
          name: singleMatch[1],
          originalLines: [lines[i]],
          startLine: i,
          endLine: i,
        });
        continue;
      }

      // Multi-line declaration — find the end
      let depth = 0;
      let j = i;
      let found = false;
      while (j < firstMockIdx) {
        for (const ch of lines[j]) {
          if (ch === '{' || ch === '(' || ch === '[') depth++;
          if (ch === '}' || ch === ')' || ch === ']') depth--;
        }
        if (depth <= 0 && j > i) {
          mockVars.push({
            name: singleMatch[1],
            originalLines: lines.slice(i, j + 1),
            startLine: i,
            endLine: j,
          });
          i = j;
          found = true;
          break;
        }
        j++;
      }
      if (!found && depth <= 0) {
        mockVars.push({
          name: singleMatch[1],
          originalLines: lines.slice(i, j + 1),
          startLine: i,
          endLine: j,
        });
        i = j;
      }
    }
  }

  if (mockVars.length === 0) return content;

  // Extract all vi.mock() factory bodies to check which vars are directly referenced
  const mockFactorySection = content.slice(content.indexOf('vi.mock('));
  const directlyUsed = new Set(
    mockVars
      .filter(v => new RegExp(`\\b${v.name}\\b`).test(mockFactorySection))
      .map(v => v.name)
  );

  if (directlyUsed.size === 0) return content;

  // Build dependency graph: which mock vars reference which other mock vars
  const mockVarNames = new Set(mockVars.map(v => v.name));
  const deps = new Map<string, Set<string>>();
  for (const v of mockVars) {
    const body = v.originalLines.join('\n');
    const myDeps = new Set<string>();
    for (const other of mockVarNames) {
      if (other !== v.name && new RegExp(`\\b${other}\\b`).test(body)) {
        myDeps.add(other);
      }
    }
    deps.set(v.name, myDeps);
  }

  // Transitively expand: any var referenced by a directly-used var must also be hoisted
  const toHoist = new Set(directlyUsed);
  let changed = true;
  while (changed) {
    changed = false;
    for (const name of toHoist) {
      const myDeps = deps.get(name);
      if (myDeps) {
        for (const dep of myDeps) {
          if (!toHoist.has(dep)) {
            toHoist.add(dep);
            changed = true;
          }
        }
      }
    }
  }

  // Also expand upward: any var that is depended on by a hoisted var must be hoisted
  // (already handled by the transitive expansion above)

  const usedVars = mockVars.filter(v => toHoist.has(v.name));
  if (usedVars.length === 0) return content;

  // Build vi.hoisted() block with SEQUENTIAL declarations (not object literal)
  // This allows cross-references: const mockFrom = vi.fn(); const mockSupabase = { from: mockFrom };
  const innerDecls = usedVars.map(v => {
    const joined = v.originalLines.join('\n');
    // Indent each line by 2 spaces
    return v.originalLines.map(l => '  ' + l).join('\n');
  }).join('\n');

  const names = usedVars.map(v => v.name).join(', ');
  const hoistedBlock = `const { ${names} } = vi.hoisted(() => {\n${innerDecls}\n  return { ${names} };\n});`;

  // Remove original declaration lines and insert the hoisted block
  const linesToRemove = new Set<number>();
  for (const v of usedVars) {
    for (let i = v.startLine; i <= v.endLine; i++) {
      linesToRemove.add(i);
    }
  }

  const newLines: string[] = [];
  let inserted = false;
  for (let i = 0; i < lines.length; i++) {
    if (linesToRemove.has(i)) {
      if (!inserted) {
        newLines.push(hoistedBlock);
        inserted = true;
      }
      continue;
    }
    newLines.push(lines[i]);
  }

  return newLines.join('\n');
}

function isBalanced(line: string): boolean {
  let depth = 0;
  for (const ch of line) {
    if (ch === '{' || ch === '(' || ch === '[') depth++;
    if (ch === '}' || ch === ')' || ch === ']') depth--;
  }
  return depth === 0;
}

async function main() {
  const files = await glob('backend/**/*.test.{ts,js}', { cwd: ROOT });
  let totalChanges = 0;

  for (const rel of files) {
    const filePath = path.join(ROOT, rel);
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    const isJS = rel.endsWith('.js');

    // 0. Replace jest.unstable_mockModule → vi.mock
    content = content.replace(/\bjest\.unstable_mockModule\(/g, 'vi.mock(');

    // 0b. Remove `import { jest } from '@jest/globals'`
    content = content.replace(/^import\s+\{?\s*jest\s*\}?\s+from\s+['"]@jest\/globals['"];?\s*\n/gm, '');

    // 1. Replace jest.* runtime calls → vi.*
    const replacements: [RegExp, string][] = [
      [/\bjest\.mock\(/g, 'vi.mock('],
      [/\bjest\.unmock\(/g, 'vi.unmock('],
      [/\bjest\.fn\(\)/g, 'vi.fn()'],
      [/\bjest\.fn\(/g, 'vi.fn('],
      [/\bjest\.fn\b(?!\()/g, 'vi.fn'],
      [/\bjest\.spyOn\(/g, 'vi.spyOn('],
      [/\bjest\.mocked\(/g, 'vi.mocked('],
      [/\bjest\.useFakeTimers\b/g, 'vi.useFakeTimers'],
      [/\bjest\.useRealTimers\(\)/g, 'vi.useRealTimers()'],
      [/\bjest\.advanceTimersByTime\(/g, 'vi.advanceTimersByTime('],
      [/\bjest\.advanceTimersByTimeAsync\(/g, 'vi.advanceTimersByTimeAsync('],
      [/\bjest\.runAllTimers\(\)/g, 'vi.runAllTimers()'],
      [/\bjest\.runAllTimersAsync\(\)/g, 'vi.runAllTimersAsync()'],
      [/\bjest\.runOnlyPendingTimers\(\)/g, 'vi.runOnlyPendingTimers()'],
      [/\bjest\.clearAllMocks\(\)/g, 'vi.clearAllMocks()'],
      [/\bjest\.resetAllMocks\(\)/g, 'vi.resetAllMocks()'],
      [/\bjest\.restoreAllMocks\(\)/g, 'vi.restoreAllMocks()'],
      [/\bjest\.resetModules\(\)/g, 'vi.resetModules()'],
      [/\bjest\.setSystemTime\(/g, 'vi.setSystemTime('],
      [/\bjest\.doMock\(/g, 'vi.doMock('],
      [/\bjest\.requireActual\(/g, 'vi.importActual('],
      [/\bjest\.requireMock\(/g, 'vi.importMock('],
      [/\bjest\.getTimerCount\(\)/g, 'vi.getTimerCount()'],
      [/\bjest\.clearAllTimers\(\)/g, 'vi.clearAllTimers()'],
      [/\bjest\.setTimeout\((\d+)\)/g, 'vi.setConfig({ testTimeout: $1 })'],
    ];

    for (const [pattern, replacement] of replacements) {
      content = content.replace(pattern, replacement);
    }

    // 2. Replace type references
    content = content.replace(/\bjest\.Mock\b/g, 'Mock');
    content = content.replace(/\bjest\.MockedFunction\b/g, 'MockedFunction');
    content = content.replace(/\bjest\.Mocked\b/g, 'Mocked');
    content = content.replace(/\bjest\.SpyInstance\b/g, 'MockInstance');

    // 3. Convert top-level `const { ... } = require('...')` to `import { ... } from '...'`
    // This is critical because vi.mock() only intercepts ESM imports, not CJS require()
    content = content.replace(
      /^const\s+\{([^}]+)\}\s*=\s*require\((['"][^'"]+['"])\);?\s*$/gm,
      (match, bindings, modPath) => {
        const cleaned = bindings.trim();
        return `import { ${cleaned} } from ${modPath};`;
      }
    );

    // Also convert: const foo = require('...')
    content = content.replace(
      /^const\s+(\w+)\s*=\s*require\((['"][^'"]+['"])\);?\s*$/gm,
      (match, name, modPath) => {
        return `import ${name} from ${modPath};`;
      }
    );

    // 4. Wrap mock variable declarations with vi.hoisted() to fix TDZ issues
    content = hoistMockVariables(content);

    // 4b. Wrap default-export mocks with { default: ... }
    content = wrapDefaultExports(content);

    // 5. For factory-less vi.mock() of known default-export modules,
    // convert to factory that wraps named exports with vi.fn()
    // This is needed because Vitest's auto-mock doesn't always handle default + named exports
    const DEFAULT_EXPORT_AUTO_MOCKS: Record<string, string> = {
      rateLimiter: `{ default: { checkRateLimit: vi.fn().mockReturnValue(true), checkRateLimitDetailed: vi.fn().mockReturnValue({ allowed: true }), initRateLimit: vi.fn(), getIpFromSocket: vi.fn().mockReturnValue('127.0.0.1') }, checkRateLimit: vi.fn().mockReturnValue(true), checkRateLimitDetailed: vi.fn().mockReturnValue({ allowed: true }), initRateLimit: vi.fn(), getIpFromSocket: vi.fn().mockReturnValue('127.0.0.1') }`,
      timerManager: `{ default: { startTimer: vi.fn(), clearGameTimer: vi.fn(), clearAllTimers: vi.fn(), getActiveTimers: vi.fn().mockReturnValue(new Map()) }, startTimer: vi.fn(), clearGameTimer: vi.fn(), clearAllTimers: vi.fn(), getActiveTimers: vi.fn().mockReturnValue(new Map()) }`,
    };

    for (const [mod, factory] of Object.entries(DEFAULT_EXPORT_AUTO_MOCKS)) {
      const autoMockRegex = new RegExp(
        `vi\\.mock\\(\\s*(['"])([^'"]*\\/${mod}(?:\\.js|\\.ts)?)\\1\\s*\\);?`,
        'g'
      );
      content = content.replace(autoMockRegex, (_match, quote, modPath) => {
        return `vi.mock(${quote}${modPath}${quote}, () => (${factory}));`;
      });
    }

    // 6. Add vitest import if file uses vi.* but doesn't import from vitest
    if (
      content.includes('vi.') &&
      !content.includes("from 'vitest'") &&
      !content.includes('from "vitest"')
    ) {
      // For .js files, don't use `type` keyword
      const importLine = isJS
        ? "import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';\n"
        : "import { vi, type Mock, type MockInstance } from 'vitest';\n";

      const firstImportIdx = content.search(/^import /m);
      if (firstImportIdx > 0) {
        content = content.slice(0, firstImportIdx) + importLine + content.slice(firstImportIdx);
      } else {
        content = importLine + content;
      }
    }

    // 5. If file uses Mock or MockInstance type but doesn't import them and is .ts
    if (!isJS) {
      if (
        (content.includes(' as Mock') || content.includes('<Mock>')) &&
        !content.includes("type Mock")
      ) {
        // Already handled by step 4's import
      }
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      totalChanges++;
      console.log(`  ✓ ${rel}`);
    }
  }

  console.log(`\nMigrated ${totalChanges} files`);

  // Verify no remaining jest.* (excluding comments and strings)
  let remaining = 0;
  for (const rel of files) {
    const filePath = path.join(ROOT, rel);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue;
      if (/\bjest\./.test(line)) {
        console.log(`  ⚠ ${rel}:${i + 1}: ${line.slice(0, 100)}`);
        remaining++;
      }
    }
  }
  if (remaining === 0) {
    console.log('\n✅ No remaining jest.* references in backend tests!');
  } else {
    console.log(`\n⚠ ${remaining} remaining jest.* references need manual review`);
  }
}

main().catch(console.error);
