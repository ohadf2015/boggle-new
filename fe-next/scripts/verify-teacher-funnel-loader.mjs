import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const shim = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'verify-teacher-funnel-next-headers.mjs')).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/headers') {
    return { url: shim, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
