import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Server chunks stay minified (V8 keeps every loaded chunk's source in the heap)
 * but keep their function names, so server stack traces in Sentry stay readable.
 * Next only exposes no-mangling as a build-wide flag, which would bloat the client.
 */
export function keepServerNames(minimizers) {
  const { MinifyPlugin } = require('next/dist/build/webpack/plugins/minify-webpack-plugin/src');
  return minimizers.map((m) =>
    typeof m === 'function' ? (compiler) => new MinifyPlugin({ noMangling: true }).apply(compiler) : m,
  );
}
