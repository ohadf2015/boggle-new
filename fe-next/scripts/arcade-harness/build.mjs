import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import path from 'path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const app = path.resolve(import.meta.dirname, '../..');
const out = process.argv[2];
const content = process.argv[3];
mkdirSync(out, { recursive: true });
const stub = (f) => path.join(import.meta.dirname, 'stubs', f);
const alias = {
  '@/contexts/LanguageContext': stub('LanguageContext.tsx'),
  '@/contexts/SoundEffectsContext': stub('SoundEffectsContext.ts'),
  '@/hooks/useHoliday': stub('useHoliday.ts'),
  'next/navigation': stub('navigation.ts'),
};

await build({
  entryPoints: [path.join(import.meta.dirname, 'entry.tsx')],
  bundle: true,
  format: 'esm',
  splitting: true,
  outdir: out,
  jsx: 'automatic',
  loader: { '.webp': 'file', '.png': 'file', '.mp3': 'file' },
  define: { 'process.env.NODE_ENV': '"development"', CONTENT: readFileSync(content, 'utf8') },
  tsconfig: path.join(app, 'tsconfig.json'),
  logLevel: 'warning',
  plugins: [{
    name: 'stubs',
    setup(b) {
      b.onResolve({ filter: /^(node:)?(fs|path|url|stream|zlib|async_hooks|readline|crypto|os|util|events|child_process)$|^posthog-node|gzip-size/ }, (a) => ({ path: a.path, namespace: 'empty' }));
      b.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: 'module.exports = new Proxy({}, { get: () => () => ({}) });', loader: 'js' }));
      b.onResolve({ filter: /.*/ }, (a) => (alias[a.path] ? { path: alias[a.path] } : /\/ArcadeGameHost$/.test(a.path) ? { path: stub('GameHost.tsx') } : undefined));
    },
  }],
});

const css = readFileSync(path.join(app, 'app/globals.css'), 'utf8');
const result = await postcss([tailwind({ base: app })]).process(css, { from: path.join(app, 'app/globals.css') });
writeFileSync(path.join(out, 'app.css'), result.css);
cpSync(path.join(app, 'public/holidays'), path.join(out, 'holidays'), { recursive: true });
cpSync(path.join(app, 'public/fonts'), path.join(out, 'fonts'), { recursive: true, force: true });
writeFileSync(path.join(out, 'index.html'), `<!doctype html><html class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/entry.css"></head><body class="bg-neo-navy text-neo-white"><div id="root"></div><script type="module" src="/entry.js"></script></body></html>`);
console.log('built', out);
