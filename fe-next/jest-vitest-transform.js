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
  if (!src.includes("from 'vitest'") && !src.includes('from "vitest"')) {
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

  // vi.hoisted(factory) → factory() — convert to IIFE
  // Find each vi.hoisted( and the matching closing ), replace with (factory)()
  code = replaceViHoisted(code);

  // vi.stubGlobal / vi.dynamicImportSettled
  code = code.replace(/\bvi\.stubGlobal\(\s*([^,]+),\s*([^)]+)\)/g, 'globalThis[$1] = $2');
  code = code.replace(/\bvi\.dynamicImportSettled\(\)/g, 'Promise.resolve()');

  // Top-level `await import(...)` → `require(...)` (Jest runs CJS, no top-level await)
  code = code.replace(/\bawait\s+import\s*\(/g, 'require(');

  return code;
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
