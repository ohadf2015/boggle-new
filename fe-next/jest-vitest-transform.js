/**
 * Jest transformer that preprocesses vitest syntax (vi.mock → jest.mock)
 * before delegating to Next.js SWC transformer.
 *
 * This enables jest.mock() hoisting for test files written with vitest API.
 */
const nextSwcTransformerPath = require.resolve('next/dist/build/swc/jest-transformer');
const nextSwcModule = require(nextSwcTransformerPath);

/**
 * Replace vi.hoisted(factory) with (factory)() using balanced paren matching.
 */
function replaceViHoisted(code) {
  const marker = 'vi.hoisted(';
  let result = '';
  let i = 0;
  while (i < code.length) {
    const idx = code.indexOf(marker, i);
    if (idx === -1) {
      result += code.slice(i);
      break;
    }
    result += code.slice(i, idx);
    // Find matching closing paren for vi.hoisted(
    let depth = 1;
    let j = idx + marker.length;
    while (j < code.length && depth > 0) {
      if (code[j] === '(') depth++;
      else if (code[j] === ')') depth--;
      j++;
    }
    // code[idx+marker.length .. j-1] is the factory content, j-1 is the closing )
    const factoryContent = code.slice(idx + marker.length, j - 1);
    result += '(' + factoryContent + ')()';
    i = j;
  }
  return result;
}

function preprocessVitest(src) {
  // Check for vitest import OR bare vi.mock/vi.fn usage (some files skip the import)
  const hasVitestImport = src.includes("from 'vitest'") || src.includes('from "vitest"');
  const hasViUsage = /\bvi\.(mock|fn|spyOn|mocked|unmock|hoisted|useFakeTimers|useRealTimers|advanceTimersByTime|runAllTimers|runAllTimersAsync|runOnlyPendingTimers|runOnlyPendingTimersAsync|clearAllTimers|getTimerCount|resetAllMocks|clearAllMocks|restoreAllMocks|resetModules|setSystemTime|stubGlobal|unstubAllGlobals|stubEnv|unstubAllEnvs|dynamicImportSettled|waitFor)\b/.test(src);

  if (!hasVitestImport && !hasViUsage) {
    return src;
  }

  let code = src;

  // Remove vitest imports — jest globals handle everything
  code = code.replace(/import\s*\{[^}]*\}\s*from\s*['"]vitest['"];?\n?/g, '');

  // Mock hoisting (critical — must be jest.mock for SWC hoisting to work)
  code = code.replace(/\bvi\.mock\(/g, 'jest.mock(');
  code = code.replace(/\bvi\.unmock\(/g, 'jest.unmock(');

  // Factory functions
  code = code.replace(/\bvi\.fn\(/g, 'jest.fn(');
  code = code.replace(/\bvi\.fn\b(?!\()/g, 'jest.fn');
  code = code.replace(/\bvi\.spyOn\(/g, 'jest.spyOn(');
  code = code.replace(/\bvi\.mocked\(/g, 'jest.mocked(');

  // Timer methods
  code = code.replace(/\bvi\.useFakeTimers\(/g, 'jest.useFakeTimers(');
  code = code.replace(/\bvi\.useRealTimers\(\)/g, 'jest.useRealTimers()');
  code = code.replace(/\bvi\.advanceTimersByTime\(/g, 'jest.advanceTimersByTime(');
  code = code.replace(/\bvi\.advanceTimersByTimeAsync\(/g, 'jest.advanceTimersByTime(');
  code = code.replace(/\bvi\.runAllTimers\(\)/g, 'jest.runAllTimers()');
  code = code.replace(/\bvi\.runOnlyPendingTimers\(\)/g, 'jest.runOnlyPendingTimers()');
  code = code.replace(/\bvi\.setSystemTime\(/g, 'jest.setSystemTime(');

  // Reset/clear methods
  code = code.replace(/\bvi\.resetAllMocks\(\)/g, 'jest.resetAllMocks()');
  code = code.replace(/\bvi\.clearAllMocks\(\)/g, 'jest.clearAllMocks()');
  code = code.replace(/\bvi\.restoreAllMocks\(\)/g, 'jest.restoreAllMocks()');
  code = code.replace(/\bvi\.resetModules\(\)/g, 'jest.resetModules()');
  code = code.replace(/\bvi\.clearAllTimers\(\)/g, 'jest.clearAllTimers()');
  code = code.replace(/\bvi\.getTimerCount\(\)/g, 'jest.getTimerCount()');
  code = code.replace(/\bvi\.runAllTimersAsync\(\)/g, 'jest.runAllTimers()');
  code = code.replace(/\bvi\.runOnlyPendingTimersAsync\(\)/g, 'jest.runOnlyPendingTimers()');

  // vi.hoisted(factory) → factory() — convert to IIFE
  // Find each vi.hoisted( and the matching closing ), replace with (factory)()
  code = replaceViHoisted(code);

  // vi.stubGlobal / vi.dynamicImportSettled
  code = code.replace(/\bvi\.stubGlobal\(\s*([^,]+),\s*([^)]+)\)/g, 'globalThis[$1] = $2');
  code = code.replace(/\bvi\.dynamicImportSettled\(\)/g, 'Promise.resolve()');

  // Top-level `await import(...)` → `require(...)` (Jest runs CJS, no top-level await)
  code = code.replace(/\bawait\s+import\s*\(/g, 'require(');

  // Auto-inject `__esModule: true` into jest.mock factories that expose a
  // `default:` export. Under Vitest the namespace is treated as ESM, so
  // `import X from 'mod'` resolves to `.default` automatically. Jest's CJS
  // interop only does that lookup when the module advertises `__esModule`.
  // Without this, `import Default from 'mocked'` yields the whole exports
  // object (e.g. `{ default: Component }`) and React renders "Element type
  // is invalid: ... got: object". Many test files forget the flag — fix it
  // once here instead of touching every file. Can't be done at runtime
  // because Jest hoists jest.mock to module scope where the `jest` ref is
  // not the same as globalThis.jest.
  code = injectEsModuleFlag(code);

  // Vitest's `expect(value, message)` (2-arg form) → strip the message.
  // Jest 29+ throws "Expect takes at most one argument" on the second arg.
  // We can't carry the message through, so we drop it; the assertion still
  // reports the line + matcher when it fails.
  code = stripExpectSecondArg(code);

  return code;
}

// Walks every jest.mock(...) factory and injects `__esModule: true` into any
// object literal that has a `default:` property — whether returned directly
// from an arrow expression (`() => ({ default: X })`) or via a return
// statement inside a function body (`() => { ... return { default: X } }`).
function injectEsModuleFlag(code) {
  const out = [];
  let i = 0;
  while (i < code.length) {
    const next = code.indexOf('jest.mock(', i);
    if (next === -1) { out.push(code.slice(i)); break; }
    const before = next > 0 ? code[next - 1] : '';
    if (/[A-Za-z0-9_$.]/.test(before)) { out.push(code.slice(i, next + 10)); i = next + 10; continue; }
    out.push(code.slice(i, next));
    // Scan the jest.mock(...) call to find its end and the factory range.
    const callStart = next + 10;
    let j = callStart;
    let depth = 1;
    let inStr = null;
    while (j < code.length && depth > 0) {
      const ch = code[j];
      if (inStr) {
        if (ch === '\\') { j += 2; continue; }
        if (ch === inStr) inStr = null;
      } else if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
      else if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      j++;
    }
    const callEnd = j; // exclusive
    const callSrc = code.slice(callStart, callEnd);
    const patched = patchMockFactory(callSrc);
    out.push('jest.mock(', patched);
    i = callEnd;
  }
  return out.join('');
}

// Inject `__esModule: true` into the relevant `{ default: ... }` literal(s)
// inside a single jest.mock(...) call's argument list.
function patchMockFactory(src) {
  // Find the factory argument (first comma at depth 0, then everything until
  // the matching close paren). Use balanced scan so commas inside string
  // literals or sub-expressions don't break it.
  let depth = 0;
  let inStr = null;
  let firstCommaAt = -1;
  for (let k = 0; k < src.length; k++) {
    const ch = src[k];
    if (inStr) {
      if (ch === '\\') { k++; continue; }
      if (ch === inStr) inStr = null;
    } else if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
    else if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) { firstCommaAt = k; break; }
  }
  if (firstCommaAt < 0) return src; // No factory arg (e.g. jest.mock('x'))
  // Factory text runs from after the comma to before the final `)` of
  // jest.mock(...). The `src` we got is *contents* of the jest.mock(...),
  // not including the outer parens, so the factory ends at src.length.
  const head = src.slice(0, firstCommaAt + 1);
  let factory = src.slice(firstCommaAt + 1);
  // Trim trailing close-paren if jest.mock has options or trailing ).
  factory = injectIntoFactoryBody(factory);
  return head + factory;
}

// Inject `__esModule: true` into every top-level object literal that
// follows `=> ` or `return ` within a factory body and contains `default:`
// but not already `__esModule:`.
function injectIntoFactoryBody(factory) {
  let out = '';
  let i = 0;
  while (i < factory.length) {
    // Match `=> ({` (arrow expression returning object literal)
    // or `return {` inside a function body.
    const arrow = factory.indexOf('=> (', i);
    const ret = factory.indexOf('return ', i);
    let openParen = -1;
    let kind = null;
    if (arrow !== -1 && (ret === -1 || arrow < ret)) {
      // Position right before `{` after `=> (`
      const lit = factory.indexOf('{', arrow);
      if (lit !== -1) { openParen = lit; kind = 'arrow'; }
    } else if (ret !== -1) {
      const lit = factory.indexOf('{', ret + 6);
      if (lit !== -1) {
        // Heuristic: ensure between `return` and `{` only whitespace
        const between = factory.slice(ret + 6, lit).trim();
        if (between === '') { openParen = lit; kind = 'return'; }
      }
    }
    if (openParen === -1) { out += factory.slice(i); break; }

    out += factory.slice(i, openParen + 1);
    // Now we're inside the object literal. Find the matching `}`.
    const litStart = openParen + 1;
    let depth = 1;
    let inStr = null;
    let k = litStart;
    while (k < factory.length && depth > 0) {
      const ch = factory[k];
      if (inStr) {
        if (ch === '\\') { k += 2; continue; }
        if (ch === inStr) inStr = null;
      } else if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
      else if (ch === '{') depth++;
      else if (ch === '}') depth--;
      k++;
    }
    const litEnd = k; // exclusive (k is past the closing `}`)
    const inner = factory.slice(litStart, litEnd - 1);
    if (/\bdefault\s*:/.test(inner) && !/\b__esModule\s*:/.test(inner)) {
      out += '__esModule:true,' + inner + '}';
    } else {
      out += inner + '}';
    }
    i = litEnd;
  }
  return out;
}

// expect(value, 'message') has a string second arg we need to remove.
// Use balanced-paren matching because `value` may itself contain commas
// (e.g. expect(obj.foo(a, b), 'msg')) which a flat regex would mis-split.
function stripExpectSecondArg(code) {
  const out = [];
  let i = 0;
  while (i < code.length) {
    const next = code.indexOf('expect(', i);
    if (next === -1) { out.push(code.slice(i)); break; }
    // Ensure word boundary — skip false positives like `notExpect(`.
    const before = next > 0 ? code[next - 1] : '';
    if (/[A-Za-z0-9_$]/.test(before)) { out.push(code.slice(i, next + 7)); i = next + 7; continue; }
    out.push(code.slice(i, next));
    const argStart = next + 7;
    let depth = 1;
    let inStr = null;
    let topCommas = [];
    let j = argStart;
    while (j < code.length && depth > 0) {
      const ch = code[j];
      if (inStr) {
        if (ch === '\\') { j += 2; continue; }
        if (ch === inStr) inStr = null;
      } else if (ch === '"' || ch === "'" || ch === '`') {
        inStr = ch;
      } else if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      else if (ch === ',' && depth === 1) topCommas.push(j);
      j++;
    }
    // j-1 is the closing `)` of expect(...).
    out.push('expect(');
    if (depth === 0 && topCommas.length >= 1) {
      const firstComma = topCommas[0];
      out.push(code.slice(argStart, firstComma));
      out.push(code.slice(j - 1, j));
      i = j;
    } else {
      out.push(code.slice(argStart, j));
      i = j;
    }
  }
  return out.join('');
}

module.exports = {
  createTransformer(options) {
    // Create the underlying Next.js SWC transformer
    const swcTransformer = nextSwcModule.createTransformer
      ? nextSwcModule.createTransformer(options)
      : nextSwcModule;

    return {
      process(src, filename, config, transformOptions) {
        const preprocessed = preprocessVitest(src);
        return swcTransformer.process(preprocessed, filename, config, transformOptions);
      },
      // Pass through other transformer methods
      ...(swcTransformer.getCacheKey && { getCacheKey: swcTransformer.getCacheKey.bind(swcTransformer) }),
    };
  },
};
