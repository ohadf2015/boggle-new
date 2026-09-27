#!/usr/bin/env node

/**
 * Missing Translation Key Finder
 *
 * This script:
 * 1. Extracts all translation keys from fe-next/translations/index.js for each language
 * 2. Extracts all t() function calls from the codebase
 * 3. Compares them to find missing translations
 * 4. Generates a comprehensive report
 */

const fs = require('fs');
const path = require('path');
let ts = null;
try {
  ts = require('typescript');
} catch (e) {
  ts = null;
}

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const EXTENSIONS_TO_SCAN = ['.ts', '.tsx', '.js', '.jsx'];
const DIRS_TO_EXCLUDE = ['node_modules', '.next', 'dist', 'build', '.git', 'playwright-report', 'scripts', '.venv', 'venv', '.venv-rembg', '__pycache__', '__tests__', '__mocks__', 'e2e', 'playwright', 'coverage', '.turbo', 'out', 'vendor'];
const FILE_PATTERNS_TO_EXCLUDE = [/\.test\.[tj]sx?$/, /\.spec\.[tj]sx?$/, /\.stories\.[tj]sx?$/];

// Track dynamic/risky translation patterns that might fail at runtime
const dynamicPatterns = [];

// ============================================
// PART 1: Extract translation keys from translation file
// ============================================

function extractTranslationKeys(obj, prefix = '') {
  const keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively extract keys from nested objects
      keys.push(...extractTranslationKeys(value, fullKey));
    } else {
      // This is a leaf node (actual translation value)
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Detect keys that contain dots - these won't work with the t() function
 * which splits by '.' and traverses nested objects.
 *
 * Example: { daily: { "wordHunt.subtitle": "value" } }
 * - Script extracts as: "daily.wordHunt.subtitle" (looks correct)
 * - Runtime t("daily.wordHunt.subtitle") fails because it looks for:
 *   translations.daily.wordHunt.subtitle (nested objects)
 *   but finds: translations.daily["wordHunt.subtitle"] (flat key)
 */
function findProblematicFlatKeys(obj, prefix = '', problematic = []) {
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    // Check if this key contains a dot - this is problematic!
    if (key.includes('.')) {
      problematic.push({
        flatKey: key,
        parentPath: prefix,
        appearsAs: fullPath,
        value: typeof value === 'string' ? value.substring(0, 50) : '[object]'
      });
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      findProblematicFlatKeys(value, fullPath, problematic);
    }
  }

  return problematic;
}

function parseESMTranslationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Find the object literal after "const xx = "
  const constIdx = content.indexOf('const ');
  const objStart = content.indexOf('{', constIdx);
  let depth = 0;
  let objEnd = objStart;
  for (let i = objStart; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') { depth--; if (depth === 0) { objEnd = i; break; } }
  }
  const objStr = content.substring(objStart, objEnd + 1);
  // Evaluate the object literal in isolation (safe - only static translation data)
  const vm = require('vm');
  return vm.runInNewContext(`(${objStr})`);
}

function getTranslationKeysFromFile() {
  console.log('Reading translations files...');

  const translationsDir = path.join(PROJECT_ROOT, 'translations');
  // Each language is its own file (en.js, he.js, ...) — loaded lazily per-locale
  // by translations/loadTranslation.ts. There is no more combined barrel file.
  const langFiles = fs.readdirSync(translationsDir).filter((f) => /^[a-z]{2}\.js$/.test(f));
  const translations = {};
  for (const fileName of langFiles) {
    const langName = fileName.replace(/\.js$/, '');
    const langFile = path.join(translationsDir, fileName);
    try {
      translations[langName] = parseESMTranslationFile(langFile);
    } catch (e) {
      console.error(`Failed to parse ${langFile}: ${e.message}`);
      process.exit(1);
    }
  }

  if (Object.keys(translations).length === 0) {
    console.error('Failed to parse translations: no language files found');
    process.exit(1);
  }

  const result = {};
  const problematicByLanguage = {};
  for (const lang of Object.keys(translations)) {
    result[lang] = extractTranslationKeys(translations[lang]);
    problematicByLanguage[lang] = findProblematicFlatKeys(translations[lang]);
  }

  return { translations, keysByLanguage: result, problematicByLanguage };
}

// ============================================
// PART 2: Extract t() function calls from codebase
// ============================================

function getAllFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip build output (`.next`, `.next-verify`, `.next-verify2`, any `.next*`)
      // and the static exclude list. Scanning minified build chunks produced bogus
      // "missing keys" like "@", "\+", "=" and node-fetch vars, inflating the
      // advisory to noise everyone ignored (2026-06-05).
      if (!DIRS_TO_EXCLUDE.includes(entry.name) && !entry.name.startsWith('.next')) {
        getAllFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (EXTENSIONS_TO_SCAN.includes(ext) && !FILE_PATTERNS_TO_EXCLUDE.some(p => p.test(entry.name))) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function getScriptKind(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.tsx') return ts ? ts.ScriptKind.TSX : undefined;
  if (ext === '.ts') return ts ? ts.ScriptKind.TS : undefined;
  if (ext === '.jsx') return ts ? ts.ScriptKind.JSX : undefined;
  if (ext === '.js') return ts ? ts.ScriptKind.JS : undefined;
  return ts ? ts.ScriptKind.Unknown : undefined;
}

function extractTFunctionCallsWithTypeScript(filePath, content) {
  if (!ts) return null;
  if (!content.includes('t(') && !content.includes('`') && !content.includes('nameKey')) return null;

  const indirectPropertyNames = new Set([
    'nameKey',
    'description',
    'label',
    'title',
    'message',
    'text',
    'placeholder',
    'tooltip',
    'header',
    'buttonText',
    'errorMessage',
    'successMessage',
  ]);

  const benefitsArrayPattern = /const\s+benefits\s*=\s*\[\s*([\s\S]*?)\s*\]/m;
  const objectKeyPattern = /\{\s*[^}]*?\bkey\s*:\s*['"]([^'"]+)['"][^}]*?\}/g;
  let benefitsKeys = [];
  const benefitsMatch = content.match(benefitsArrayPattern);
  if (benefitsMatch) {
    let m;
    while ((m = objectKeyPattern.exec(benefitsMatch[1])) !== null) {
      benefitsKeys.push(m[1]);
    }
    benefitsKeys = [...new Set(benefitsKeys)];
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath)
  );

  const calls = [];

  // ========================================
  // Dynamic-key resolution (2026-07-28)
  // ========================================
  // Motivation: the "names cover letters" bug (t_bc55700c). Keys selected via a
  // runtime variable — `const translationKey = cond ? 'a.b' : 'a.c'; t(translationKey)`
  // — were invisible to the scanner and the keys were missing in all 6 locales.
  // We resolve the common static shapes so they become ordinary checked keys:
  //   1. const x = 'a.b' | cond ? 'a.b' : 'a.c' | ['a','b'] as const
  //   2. type T = 'a' | 'b'  +  function f(k: T) { t(`ns.${k}`) }
  //   3. (['a','b'] as const).map(k => t(`ns.${k}`)) / arr.map(...) / for..of
  // Anything we cannot resolve is recorded in dynamicPatterns (previously the
  // AST path silently dropped these — the regex fallback never ran for files
  // where the AST produced calls).

  const constStringSets = new Map(); // const name -> Set<string> | null (null = ambiguous)
  const unionTypeAliases = new Map(); // type alias -> Set<string>
  const scopeStack = []; // stack of Map<name, Set<string>> for params/loop vars

  function pushScope() { scopeStack.push(new Map()); }
  function popScope() { scopeStack.pop(); }
  function bindLocal(name, set) { if (scopeStack.length) scopeStack[scopeStack.length - 1].set(name, set); }
  function lookupIdentifier(name) {
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      const s = scopeStack[i].get(name);
      if (s) return s;
    }
    const s = constStringSets.get(name);
    return s || null;
  }

  function unwrapExpr(expr) {
    let e = expr;
    // Unwrap ('a' as const), ('a' satisfies T), ('a'), 'a'!, <const>'a'
    while (
      ts.isParenthesizedExpression(e) ||
      ts.isAsExpression(e) ||
      ts.isSatisfiesExpression(e) ||
      ts.isNonNullExpression(e) ||
      ts.isTypeAssertionExpression(e)
    ) e = e.expression;
    return e;
  }

  function resolveStaticStrings(expr, depth = 0) {
    if (!expr || depth > 6) return null;
    const e = unwrapExpr(expr);
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return new Set([e.text]);
    if (ts.isConditionalExpression(e)) {
      const a = resolveStaticStrings(e.whenTrue, depth + 1);
      const b = resolveStaticStrings(e.whenFalse, depth + 1);
      if (a && b) return new Set([...a, ...b]);
      return null;
    }
    if (ts.isArrayLiteralExpression(e)) {
      const out = new Set();
      for (const el of e.elements) {
        const s = resolveStaticStrings(el, depth + 1);
        if (!s || s.size !== 1) return null;
        out.add([...s][0]);
      }
      return out.size ? out : null;
    }
    if (ts.isIdentifier(e)) return lookupIdentifier(e.text);
    return null;
  }

  function resolveTypeNode(tn) {
    if (!tn) return null;
    if (ts.isTypeReferenceNode(tn) && ts.isIdentifier(tn.typeName)) {
      return unionTypeAliases.get(tn.typeName.text) || null;
    }
    if (ts.isUnionTypeNode(tn)) {
      const out = new Set();
      for (const t of tn.types) {
        if (ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)) out.add(t.literal.text);
        else return null;
      }
      return out.size ? out : null;
    }
    if (ts.isLiteralTypeNode(tn) && ts.isStringLiteral(tn.literal)) return new Set([tn.literal.text]);
    return null;
  }

  // Pre-pass 1: union string type aliases (type T = 'a' | 'b')
  (function collectAliases(node) {
    if (ts.isTypeAliasDeclaration(node) && ts.isIdentifier(node.name)) {
      const members = new Set();
      let ok = true;
      (function walkType(tn) {
        if (ts.isUnionTypeNode(tn)) { tn.types.forEach(walkType); return; }
        if (ts.isLiteralTypeNode(tn) && ts.isStringLiteral(tn.literal)) { members.add(tn.literal.text); return; }
        ok = false;
      })(node.type);
      if (ok && members.size) unionTypeAliases.set(node.name.text, members);
    }
    ts.forEachChild(node, collectAliases);
  })(sourceFile);

  // Pre-pass 2: const bindings resolvable to a set of strings. A name bound
  // twice with different values (e.g. same local name in two functions) is
  // poisoned to null = ambiguous = treated as unresolvable, never guessed.
  (function collectConsts(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const list = node.parent;
      const isConst = list && ts.isVariableDeclarationList(list) && (list.flags & ts.NodeFlags.Const);
      if (isConst) {
        const name = node.name.text;
        const s = resolveStaticStrings(node.initializer);
        if (s) {
          const prev = constStringSets.get(name);
          if (prev === undefined) {
            constStringSets.set(name, s);
          } else if (prev === null || prev.size !== s.size || [...prev].some(v => !s.has(v))) {
            constStringSets.set(name, null); // conflicting redeclaration — ambiguous
          }
        }
      }
    }
    ts.forEachChild(node, collectConsts);
  })(sourceFile);

  const MAX_TEMPLATE_COMBOS = 200;
  function resolveTemplateKeys(templateExpr) {
    const literals = [templateExpr.head.text];
    const exprSets = [];
    for (const span of templateExpr.templateSpans) {
      const s = resolveStaticStrings(span.expression);
      if (!s) return null;
      exprSets.push([...s]);
      literals.push(span.literal.text);
    }
    const comboCount = exprSets.reduce((acc, arr) => acc * arr.length, 1);
    if (comboCount > MAX_TEMPLATE_COMBOS) return null;
    let results = [literals[0]];
    exprSets.forEach((arr, i) => {
      const next = [];
      for (const prefix of results) for (const v of arr) next.push(prefix + v + literals[i + 1]);
      results = next;
    });
    return results;
  }

  function pushDynamic(entry, node) {
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    dynamicPatterns.push({
      ...entry,
      file: path.relative(PROJECT_ROOT, filePath),
      line: pos.line + 1,
      context: (content.split('\n')[pos.line] || '').trim().substring(0, 100),
    });
  }

  function pushKey(key, node, context) {
    if (!key) return;
    if (key.includes('://') || key.startsWith('.') || key.endsWith('.')) return;
    if (key.includes(' ') || key.startsWith('#') || key.startsWith('/') || key.includes('(')) return;
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    calls.push({
      key,
      file: path.relative(PROJECT_ROOT, filePath),
      line: pos.line + 1,
      context: (context || content.split('\n')[pos.line] || '').trim().substring(0, 100),
    });
  }

  function getPropertyNameText(nameNode) {
    if (!nameNode) return null;
    if (ts.isIdentifier(nameNode)) return nameNode.text;
    if (ts.isStringLiteral(nameNode) || ts.isNoSubstitutionTemplateLiteral(nameNode)) return nameNode.text;
    return null;
  }

  function isTCallExpression(expr) {
    if (ts.isIdentifier(expr)) return expr.text === 't';
    if (ts.isPropertyAccessExpression(expr)) return expr.name?.text === 't';
    return false;
  }

  function tryExtractKeyFromTemplateExpression(templateExpr, nodeForLocation) {
    const headText = templateExpr.head.text;
    if (!templateExpr.templateSpans?.length) return;
    if (templateExpr.templateSpans.length !== 1) return;
    const span = templateExpr.templateSpans[0];
    const tailText = span.literal?.text ?? '';
    if (tailText !== '') return;
    const expr = span.expression;
    if (
      headText === 'daily.createChallengeFeature.benefits.' &&
      ts.isPropertyAccessExpression(expr) &&
      ts.isIdentifier(expr.expression) &&
      expr.expression.text === 'benefit' &&
      expr.name.text === 'key' &&
      benefitsKeys.length > 0
    ) {
      for (const k of benefitsKeys) {
        pushKey(`${headText}${k}`, nodeForLocation, `template:${headText}\${benefit.key} -> ${headText}${k}`);
      }
    }
  }

  function visit(node) {
    if (ts.isCallExpression(node) && isTCallExpression(node.expression) && node.arguments?.length) {
      const firstArg = node.arguments[0];
      if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
        pushKey(firstArg.text, node);
      } else if (ts.isTemplateExpression(firstArg)) {
        tryExtractKeyFromTemplateExpression(firstArg, node);
        const resolved = resolveTemplateKeys(firstArg);
        if (resolved) {
          for (const k of resolved) pushKey(k, node, `resolved-template`);
        } else {
          pushDynamic({ pattern: firstArg.getText(sourceFile).substring(0, 120), type: 'template_literal' }, node);
        }
      } else if (ts.isIdentifier(firstArg)) {
        const s = lookupIdentifier(firstArg.text);
        if (s) {
          for (const k of s) pushKey(k, node, `resolved-variable:${firstArg.text}`);
        } else {
          pushDynamic({ pattern: `t(${firstArg.text})`, variable: firstArg.text, type: 'variable_key' }, node);
        }
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const propName = getPropertyNameText(node.name);
      if (propName && indirectPropertyNames.has(propName)) {
        const init = node.initializer;
        if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
          // Only treat as translation key if it looks like one:
          // alphanumeric + dots + underscores + hyphens (no spaces, no non-ASCII)
          if (init.text.includes('.') && /^[a-zA-Z0-9._-]+$/.test(init.text)) pushKey(init.text, node);
        }
      }
    }

    // Function-likes: bind params annotated with a string-union type
    // (function f(section: 'a' | 'b') / (k: MyUnion) => ...) so t(`ns.${param}`)
    // and t(param) inside the body resolve against the union members.
    if (
      ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) || ts.isMethodDeclaration(node)
    ) {
      pushScope();
      for (const p of node.parameters || []) {
        if (ts.isIdentifier(p.name)) {
          const s = resolveTypeNode(p.type);
          if (s) bindLocal(p.name.text, s);
        }
      }
      ts.forEachChild(node, visit);
      popScope();
      return;
    }

    // resolvableArray.map(cb) / .forEach(cb): bind the callback's first param
    // to the array's string members (covers `(['a','b'] as const).map(k => t(`ns.${k}`))`).
    if (
      ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      (node.expression.name.text === 'map' || node.expression.name.text === 'forEach') &&
      node.arguments.length &&
      (ts.isArrowFunction(node.arguments[0]) || ts.isFunctionExpression(node.arguments[0]))
    ) {
      const arrSet = resolveStaticStrings(node.expression.expression);
      const cb = node.arguments[0];
      if (arrSet && cb.parameters.length && ts.isIdentifier(cb.parameters[0].name)) {
        pushScope();
        bindLocal(cb.parameters[0].name.text, arrSet);
        ts.forEachChild(node, visit);
        popScope();
        return;
      }
    }

    // for (const x of resolvableArray) — bind the loop variable.
    if (ts.isForOfStatement(node) && ts.isVariableDeclarationList(node.initializer)) {
      const decl = node.initializer.declarations[0];
      const arrSet = decl && ts.isIdentifier(decl.name) ? resolveStaticStrings(node.expression) : null;
      if (arrSet) {
        pushScope();
        bindLocal(decl.name.text, arrSet);
        ts.forEachChild(node, visit);
        popScope();
        return;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return calls;
}

function extractTFunctionCalls(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const astCalls = extractTFunctionCallsWithTypeScript(filePath, content);
  if (astCalls && astCalls.length > 0) return astCalls;
  const lines = content.split('\n');
  const calls = [];

  // Multiple regex patterns to catch different t() usages
  const patterns = [
    // t('key') or t("key")
    /\bt\(\s*['"]([^'"]+)['"]\s*\)/g,
    // t('key', ...) with additional params
    /\bt\(\s*['"]([^'"]+)['"]\s*,/g,
    // {t('key')} in JSX
    /\{\s*t\(\s*['"]([^'"]+)['"]\s*\)/g,
    // t('key') || 'fallback'
    /\bt\(\s*['"]([^'"]+)['"]\s*\)\s*\|\|/g,
    // t('key').replace
    /\bt\(\s*['"]([^'"]+)['"]\s*\)\.replace/g,
    // Object property patterns for translation keys stored in objects:
    // nameKey: 'key', description: 'key', etc.
    /\b(?:nameKey|description|label|title|message|text|placeholder|tooltip|header|buttonText|errorMessage|successMessage):\s*['"]([^'"]+)['"]/g,
  ];

  // Heuristic: detect template literal t(`namespace.${var}`) cases and expand when possible
  // Specifically handles patterns like: t(`daily.createChallengeFeature.benefits.${benefit.key}`)
  const templatePattern = /\bt\(\s*`([^`]+)`\s*\)/g;
  // Collect local arrays of the form: const benefits = [ { key: '...' }, ... ]
  const benefitsArrayPattern = /const\s+benefits\s*=\s*\[\s*([\s\S]*?)\s*\]/m;
  const objectKeyPattern = /\{\s*[^}]*?\bkey\s*:\s*['"]([^'"]+)['"][^}]*?\}/g;
  let benefitsKeys = [];
  const benefitsMatch = content.match(benefitsArrayPattern);
  if (benefitsMatch) {
    let m;
    while ((m = objectKeyPattern.exec(benefitsMatch[1])) !== null) {
      benefitsKeys.push(m[1]);
    }
    benefitsKeys = [...new Set(benefitsKeys)];
  }

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (const pattern of patterns) {
      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(line)) !== null) {
        const key = match[1];

        // Skip keys that look like they contain variables or are not translation keys
        if (key.includes('${') || key.includes('`')) continue;

        // Skip if it looks like a method call or URL
        if (key.includes('://') || key.startsWith('.') || key.endsWith('.')) continue;

        // Skip if it looks like CSS classes, hex colors, or non-translation strings
        if (key.includes(' ') || key.startsWith('#') || key.startsWith('/') || key.includes('(')) continue;

        // For indirect patterns (from object properties), only accept keys that look like translation keys
        // (must contain a dot and only ASCII key characters — no non-Latin content)
        const isIndirectPattern = pattern.source.includes('nameKey|description|label');
        if (isIndirectPattern && (!key.includes('.') || !/^[a-zA-Z0-9._-]+$/.test(key))) continue;

        calls.push({
          key,
          file: path.relative(PROJECT_ROOT, filePath),
          line: lineNum + 1,
          context: line.trim().substring(0, 100)
        });
      }
    }

    // Handle template literals
    templatePattern.lastIndex = 0;
    let tpl;
    while ((tpl = templatePattern.exec(line)) !== null) {
      const raw = tpl[1];
      // If there's no interpolation, treat as a normal key
      if (!raw.includes('${')) {
        calls.push({
          key: raw,
          file: path.relative(PROJECT_ROOT, filePath),
          line: lineNum + 1,
          context: line.trim().substring(0, 100)
        });
        continue;
      }
      // Track dynamic pattern for reporting
      dynamicPatterns.push({
        pattern: raw,
        file: path.relative(PROJECT_ROOT, filePath),
        line: lineNum + 1,
        context: line.trim().substring(0, 100),
        type: 'template_literal'
      });
      // Expand known pattern for daily.createChallengeFeature.benefits.${benefit.key}
      const prefixMatch = raw.match(/^(daily\.createChallengeFeature\.benefits\.)\$\{benefit\.key\}$/);
      if (prefixMatch && benefitsKeys.length > 0) {
        const prefix = prefixMatch[1];
        for (const k of benefitsKeys) {
          calls.push({
            key: `${prefix}${k}`,
            file: path.relative(PROJECT_ROOT, filePath),
            line: lineNum + 1,
            context: `template:${raw} -> ${prefix}${k}`.substring(0, 100)
          });
        }
      }
    }

    // Detect risky patterns: t() with fallback || that might indicate missing key
    const fallbackPattern = /\bt\(\s*['"]([^'"]+)['"]\s*\)\s*\|\|\s*['"]([^'"]+)['"]/g;
    fallbackPattern.lastIndex = 0;
    let fb;
    while ((fb = fallbackPattern.exec(line)) !== null) {
      dynamicPatterns.push({
        pattern: fb[0],
        key: fb[1],
        fallback: fb[2],
        file: path.relative(PROJECT_ROOT, filePath),
        line: lineNum + 1,
        context: line.trim().substring(0, 100),
        type: 'fallback_usage'
      });
    }

    // Detect t() calls with variable keys (risky at runtime)
    const varKeyPattern = /\bt\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g;
    varKeyPattern.lastIndex = 0;
    let vk;
    while ((vk = varKeyPattern.exec(line)) !== null) {
      const varName = vk[1];
      // Skip common false positives
      if (['t', 'key', 'translationKey', 'i18nKey'].includes(varName)) continue;
      dynamicPatterns.push({
        pattern: vk[0],
        variable: varName,
        file: path.relative(PROJECT_ROOT, filePath),
        line: lineNum + 1,
        context: line.trim().substring(0, 100),
        type: 'variable_key'
      });
    }
  }

  return calls;
}

function extractAllTFunctionCalls() {
  console.log('Scanning codebase for t() function calls...');

  const files = getAllFiles(PROJECT_ROOT);
  console.log(`Found ${files.length} files to scan`);

  const allCalls = [];

  for (const file of files) {
    const calls = extractTFunctionCalls(file);
    allCalls.push(...calls);
  }

  console.log(`Found ${allCalls.length} t() calls total`);

  return allCalls;
}

// ============================================
// PART 3: Compare and generate report
// ============================================

function generateReport(keysByLanguage, tCalls, problematicByLanguage = {}, runtimeRisks = [], jsonReportPath = null) {
  console.log('\n========================================');
  console.log('TRANSLATION KEY ANALYSIS REPORT');
  console.log('========================================\n');

  const languages = Object.keys(keysByLanguage);
  console.log(`Languages found: ${languages.join(', ')}`);
  console.log('');

  // Get unique keys used in code
  const uniqueKeysInCode = [...new Set(tCalls.map(c => c.key))];
  console.log(`Unique translation keys used in code: ${uniqueKeysInCode.length}`);

  // Print key counts per language
  console.log('\nKeys defined per language:');
  for (const lang of languages) {
    console.log(`  ${lang}: ${keysByLanguage[lang].length} keys`);
  }

  // ========================================
  // Section 0a: Runtime risk patterns (dynamic keys, fallbacks, variables)
  // ========================================
  if (runtimeRisks.length > 0) {
    console.log('\n========================================');
    console.log('⚠️  RUNTIME RISK PATTERNS');
    console.log('========================================\n');
    console.log('These patterns may cause runtime errors if the dynamic keys don\'t exist.\n');

    const templateLiterals = runtimeRisks.filter(r => r.type === 'template_literal');
    const fallbackUsages = runtimeRisks.filter(r => r.type === 'fallback_usage');
    const variableKeys = runtimeRisks.filter(r => r.type === 'variable_key');

    if (templateLiterals.length > 0) {
      console.log(`TEMPLATE LITERALS (${templateLiterals.length} found):`);
      console.log('  These use dynamic interpolation - ensure all possible values exist.\n');
      for (const tl of templateLiterals.slice(0, 5)) {
        console.log(`  - ${tl.file}:${tl.line}`);
        console.log(`    Pattern: t(\`${tl.pattern}\`)`);
      }
      if (templateLiterals.length > 5) {
        console.log(`  ... and ${templateLiterals.length - 5} more\n`);
      }
      console.log('');
    }

    if (fallbackUsages.length > 0) {
      console.log(`FALLBACK PATTERNS (${fallbackUsages.length} found):`);
      console.log('  t("key") || "fallback" suggests the key might be missing.\n');
      for (const fb of fallbackUsages.slice(0, 10)) {
        console.log(`  - ${fb.file}:${fb.line}`);
        console.log(`    Key: "${fb.key}" -> Fallback: "${fb.fallback}"`);
      }
      if (fallbackUsages.length > 10) {
        console.log(`  ... and ${fallbackUsages.length - 10} more\n`);
      }
      console.log('');
    }

    if (variableKeys.length > 0) {
      console.log(`VARIABLE KEYS (${variableKeys.length} found):`);
      console.log('  t(variable) uses a variable as key - verify all possible values exist.\n');
      for (const vk of variableKeys.slice(0, 10)) {
        console.log(`  - ${vk.file}:${vk.line}`);
        console.log(`    Variable: ${vk.variable}`);
      }
      if (variableKeys.length > 10) {
        console.log(`  ... and ${variableKeys.length - 10} more\n`);
      }
      console.log('');
    }
  }

  // ========================================
  // Section 0b: CRITICAL - Problematic flat keys (keys with dots that break t() function)
  // ========================================
  const totalProblematic = Object.values(problematicByLanguage).reduce((sum, arr) => sum + arr.length, 0);
  if (totalProblematic > 0) {
    console.log('\n========================================');
    console.log('⚠️  CRITICAL: FLAT KEYS WITH DOTS (WILL BREAK AT RUNTIME)');
    console.log('========================================\n');
    console.log('These keys contain dots but are stored as flat strings, not nested objects.');
    console.log('The t() function splits by "." and traverses nested objects, so these WILL FAIL.\n');
    console.log('Example: { daily: { "wordHunt.subtitle": "value" } }');
    console.log('  - Script sees: "daily.wordHunt.subtitle" ✓');
    console.log('  - Runtime t("daily.wordHunt.subtitle") looks for: daily.wordHunt.subtitle');
    console.log('  - But actual structure is: daily["wordHunt.subtitle"] ✗\n');
    console.log('FIX: Convert flat keys to nested objects:\n');
    console.log('  WRONG: { daily: { "wordHunt.subtitle": "value" } }');
    console.log('  RIGHT: { daily: { wordHunt: { subtitle: "value" } } }\n');

    for (const lang of languages) {
      const problematic = problematicByLanguage[lang] || [];
      if (problematic.length > 0) {
        console.log(`${lang.toUpperCase()}: ${problematic.length} problematic flat keys`);
        for (const p of problematic.slice(0, 10)) {
          console.log(`  - "${p.parentPath}.${p.flatKey}" → should be nested under "${p.parentPath}"`);
        }
        if (problematic.length > 10) {
          console.log(`  ... and ${problematic.length - 10} more`);
        }
        console.log('');
      }
    }
  }

  // Use English as the reference language
  const referenceKeys = new Set(keysByLanguage['en'] || []);

  // ========================================
  // Section 1: Keys used in code but missing from English
  // ========================================
  console.log('\n========================================');
  console.log('KEYS USED IN CODE BUT NOT DEFINED IN TRANSLATIONS');
  console.log('========================================\n');

  const missingFromEnglish = [];

  for (const key of uniqueKeysInCode) {
    if (!referenceKeys.has(key)) {
      // Find all usages
      const usages = tCalls.filter(c => c.key === key);
      missingFromEnglish.push({ key, usages });
    }
  }

  if (missingFromEnglish.length === 0) {
    console.log('No missing keys found in English translations!\n');
  } else {
    console.log(`Found ${missingFromEnglish.length} keys used in code but not defined:\n`);

    // Sort by key
    missingFromEnglish.sort((a, b) => a.key.localeCompare(b.key));

    for (const { key, usages } of missingFromEnglish) {
      console.log(`KEY: "${key}"`);
      console.log('  Used in:');
      for (const usage of usages.slice(0, 5)) { // Show max 5 usages
        console.log(`    - ${usage.file}:${usage.line}`);
      }
      if (usages.length > 5) {
        console.log(`    ... and ${usages.length - 5} more locations`);
      }
      console.log('');
    }
  }

  // ========================================
  // Section 2: Keys missing in other languages (compared to English)
  // ========================================
  console.log('\n========================================');
  console.log('KEYS DEFINED IN ENGLISH BUT MISSING IN OTHER LANGUAGES');
  console.log('========================================\n');

  for (const lang of languages) {
    if (lang === 'en') continue;

    const langKeys = new Set(keysByLanguage[lang]);
    const missingInLang = [];

    for (const key of referenceKeys) {
      if (!langKeys.has(key)) {
        missingInLang.push(key);
      }
    }

    if (missingInLang.length === 0) {
      console.log(`${lang.toUpperCase()}: All keys present!`);
    } else {
      console.log(`${lang.toUpperCase()}: ${missingInLang.length} keys missing from English`);
      console.log('  Missing keys:');
      // Show first 20 missing keys
      for (const key of missingInLang.slice(0, 20)) {
        console.log(`    - ${key}`);
      }
      if (missingInLang.length > 20) {
        console.log(`    ... and ${missingInLang.length - 20} more`);
      }
    }
    console.log('');
  }

  // ========================================
  // Section 3: Keys in other languages but not in English
  // ========================================
  console.log('\n========================================');
  console.log('KEYS DEFINED IN OTHER LANGUAGES BUT NOT IN ENGLISH');
  console.log('========================================\n');

  for (const lang of languages) {
    if (lang === 'en') continue;

    const langKeys = new Set(keysByLanguage[lang]);
    const extraInLang = [];

    for (const key of langKeys) {
      if (!referenceKeys.has(key)) {
        extraInLang.push(key);
      }
    }

    if (extraInLang.length === 0) {
      console.log(`${lang.toUpperCase()}: No extra keys`);
    } else {
      console.log(`${lang.toUpperCase()}: ${extraInLang.length} keys not in English`);
      for (const key of extraInLang.slice(0, 10)) {
        console.log(`    - ${key}`);
      }
      if (extraInLang.length > 10) {
        console.log(`    ... and ${extraInLang.length - 10} more`);
      }
    }
    console.log('');
  }

  // ========================================
  // Section 4: Summary table - which keys are missing where
  // ========================================
  console.log('\n========================================');
  console.log('DETAILED MISSING KEY MATRIX');
  console.log('========================================\n');

  // Get all unique keys (from code AND from all languages)
  const allKeys = new Set([
    ...uniqueKeysInCode,
    ...Object.values(keysByLanguage).flat()
  ]);

  // Find keys that are missing in at least one place
  const keysWithIssues = [];

  for (const key of allKeys) {
    const inCode = uniqueKeysInCode.includes(key);
    const inLanguages = {};

    for (const lang of languages) {
      inLanguages[lang] = keysByLanguage[lang].includes(key);
    }

    // Only include if used in code but missing somewhere, or missing from English
    const usedButMissing = inCode && !inLanguages['en'];
    const missingFromSomeLang = inLanguages['en'] && languages.some(l => l !== 'en' && !inLanguages[l]);

    if (usedButMissing || missingFromSomeLang) {
      keysWithIssues.push({
        key,
        inCode,
        ...inLanguages
      });
    }
  }

  if (keysWithIssues.length > 0) {
    // Sort by key
    keysWithIssues.sort((a, b) => a.key.localeCompare(b.key));

    // Print header
    const header = ['Key', 'In Code', ...languages.map(l => l.toUpperCase())].join(' | ');
    console.log(header);
    console.log('-'.repeat(header.length));

    for (const row of keysWithIssues.slice(0, 100)) {
      const cells = [
        row.key.substring(0, 40).padEnd(40),
        row.inCode ? 'YES' : 'NO ',
        ...languages.map(l => row[l] ? 'YES' : 'NO ')
      ];
      console.log(cells.join(' | '));
    }

    if (keysWithIssues.length > 100) {
      console.log(`\n... and ${keysWithIssues.length - 100} more keys with issues`);
    }
  } else {
    console.log('No keys with cross-language issues found!');
  }

  // ========================================
  // Section 5: JSON output for further processing
  // ========================================
  const totalProblematicCount = Object.values(problematicByLanguage).reduce((sum, arr) => sum + arr.length, 0);

  const jsonReport = {
    summary: {
      totalKeysInCode: uniqueKeysInCode.length,
      keyCountByLanguage: Object.fromEntries(
        languages.map(l => [l, keysByLanguage[l].length])
      ),
      missingFromEnglish: missingFromEnglish.length,
      problematicFlatKeys: totalProblematicCount,
      runtimeRisks: {
        templateLiterals: runtimeRisks.filter(r => r.type === 'template_literal').length,
        fallbackUsages: runtimeRisks.filter(r => r.type === 'fallback_usage').length,
        variableKeys: runtimeRisks.filter(r => r.type === 'variable_key').length,
      },
    },
    runtimeRisks: {
      templateLiterals: runtimeRisks.filter(r => r.type === 'template_literal'),
      fallbackUsages: runtimeRisks.filter(r => r.type === 'fallback_usage'),
      variableKeys: runtimeRisks.filter(r => r.type === 'variable_key'),
    },
    problematicFlatKeys: Object.fromEntries(
      languages.map(lang => [
        lang,
        (problematicByLanguage[lang] || []).map(p => ({
          flatKey: p.flatKey,
          parentPath: p.parentPath,
          appearsAs: p.appearsAs,
          fix: `Convert "${p.parentPath}.${p.flatKey}" to nested: ${p.parentPath}.${p.flatKey.split('.').join('.')}`
        }))
      ])
    ),
    missingFromEnglish: missingFromEnglish.map(m => ({
      key: m.key,
      usages: m.usages.map(u => ({ file: u.file, line: u.line }))
    })),
    missingByLanguage: Object.fromEntries(
      languages.filter(l => l !== 'en').map(lang => {
        const langKeys = new Set(keysByLanguage[lang]);
        const missing = [...referenceKeys].filter(k => !langKeys.has(k));
        return [lang, missing];
      })
    ),
    keysNotInEnglish: Object.fromEntries(
      languages.filter(l => l !== 'en').map(lang => {
        const langKeys = new Set(keysByLanguage[lang]);
        const extra = [...langKeys].filter(k => !referenceKeys.has(k));
        return [lang, extra];
      })
    )
  };

  // Write JSON report (path injectable so tests don't clobber the real artifact)
  const reportPath = jsonReportPath || path.join(PROJECT_ROOT, 'scripts/translation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
  console.log(`\nJSON report written to: ${reportPath}`);

  return jsonReport;
}

// ============================================
// Main execution
// ============================================

function main() {
  console.log('Translation Key Analysis Tool');
  console.log('==============================\n');

  // Clear dynamic patterns from previous runs
  dynamicPatterns.length = 0;

  // Step 1: Extract translation keys and detect problematic flat keys
  const { keysByLanguage, problematicByLanguage } = getTranslationKeysFromFile();

  // Step 2: Extract t() calls (also populates dynamicPatterns)
  const tCalls = extractAllTFunctionCalls();

  // Step 3: Generate report with runtime risk patterns
  const report = generateReport(keysByLanguage, tCalls, problematicByLanguage, dynamicPatterns);

  console.log('\n==============================');
  console.log('Analysis complete!');
  console.log('==============================');

  // Return exit code based on issues found
  const totalProblematic = Object.values(problematicByLanguage).reduce((sum, arr) => sum + arr.length, 0);
  if (totalProblematic > 0) {
    console.log(`\n⚠️  CRITICAL: ${totalProblematic} flat keys with dots found - these WILL BREAK at runtime!`);
    return 1;
  }

  if (report.missingFromEnglish.length > 0) {
    console.log(`\nWARNING: ${report.missingFromEnglish.length} translation keys are used but not defined!`);
    // ADVISORY, not a hard failure. This set is dominated by dynamic
    // `t(\`...${var}...\`)` template keys and deploy-lag (keys present in source
    // but not yet in the scanned snapshot), so gating on it exited non-zero on a
    // perfectly healthy tree — which permanently red-failed CI's lint job and the
    // pre-commit hook, training everyone to ignore/bypass the gate and letting
    // real failures (stale tests, 2026-06-01) slip through. Keep it VISIBLE but
    // non-gating. Genuine runtime-breaking issues (flat keys with dots) still
    // hard-fail above. Opt back into strict gating with TRANSLATIONS_STRICT=1.
    if (process.env.TRANSLATIONS_STRICT === '1') return 1;
  }

  // Ratchet gate on missingByLanguage: fail only on keys that are NEWLY missing
  // vs a committed baseline. This is the durable fix for the recurring class
  // "key added to en, forgotten in other locales" that renders raw key paths to
  // users and floods Sentry with "Translation missing". Unlike missingFromEnglish
  // (advisory above — polluted by dynamic template keys + code-vs-snapshot
  // deploy-lag), missingByLanguage compares en dict vs locale dict in the SAME
  // snapshot, so there are no such false positives — safe to hard-gate.
  // The baseline holds the current (large) backlog so CI doesn't red-fail on it;
  // any NEW omission fails immediately. Regenerate intentionally with
  // TRANSLATIONS_UPDATE_BASELINE=1 (e.g. after deleting a feature's en keys).
  const baselinePath = path.join(PROJECT_ROOT, 'scripts/translation-missing-baseline.json');
  const currentMissing = report.missingByLanguage; // { lang: [keyPaths] }
  if (process.env.TRANSLATIONS_UPDATE_BASELINE === '1') {
    fs.writeFileSync(baselinePath, JSON.stringify(currentMissing, null, 2) + '\n');
    console.log(`\n✅ Missing-translation baseline updated: ${baselinePath}`);
    return 0;
  }
  if (!fs.existsSync(baselinePath)) {
    fs.writeFileSync(baselinePath, JSON.stringify(currentMissing, null, 2) + '\n');
    console.log(`\n📌 Missing-translation baseline created (bootstrap): ${baselinePath}`);
    return 0;
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const regressions = [];
  for (const [lang, keys] of Object.entries(currentMissing)) {
    const known = new Set(baseline[lang] || []);
    for (const k of keys) if (!known.has(k)) regressions.push(`${lang}: ${k}`);
  }
  if (regressions.length > 0) {
    console.log(`\n❌ ${regressions.length} NEW missing translation(s) vs baseline.`);
    console.log('   Add the key to the listed translations/<lang>.js file(s),');
    console.log('   or re-run with TRANSLATIONS_UPDATE_BASELINE=1 if this omission is intentional:');
    regressions.slice(0, 50).forEach(r => console.log(`   - ${r}`));
    if (regressions.length > 50) console.log(`   …and ${regressions.length - 50} more`);
    return 1;
  }
  console.log('\n✅ No new missing translations vs baseline.');

  return 0;
}

// Run the script only when invoked directly (imported by tests otherwise)
if (require.main === module) {
  const exitCode = main();
  process.exit(exitCode);
}

module.exports = {
  extractTFunctionCalls,
  extractAllTFunctionCalls,
  getTranslationKeysFromFile,
  generateReport,
  dynamicPatterns,
  main,
};
