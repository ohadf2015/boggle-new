import fs from 'fs';
import path from 'path';

/** Directories and patterns to exclude from public route discovery */
const EXCLUDED_DIRS = new Set([
  'admin', 'auth', 'api', 'avatar-test',
]);

/** Segments starting with [ are dynamic — exclude them */
function isDynamicSegment(segment: string): boolean {
  return segment.startsWith('[');
}

/**
 * Recursively scan app/[locale]/ for page.tsx files and return
 * all static public routes (e.g. '/blog/daily-challenge-strategies').
 * Excludes admin, auth, dynamic [param] routes, and test pages.
 */
export async function discoverPublicRoutes(): Promise<string[]> {
  const localeDir = path.join(process.cwd(), 'app', '[locale]');

  if (!fs.existsSync(localeDir)) {
    return [];
  }

  const routes: string[] = [];
  scan(localeDir, '', routes);
  return routes.sort();
}

function scan(baseDir: string, relativePath: string, routes: string[]): void {
  const fullPath = path.join(baseDir, relativePath);
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  // Check if this directory has a page.tsx
  if (entries.some(e => e.isFile() && e.name === 'page.tsx')) {
    const route = relativePath ? '/' + relativePath.replace(/\\/g, '/') : '';
    routes.push(route);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    if (isDynamicSegment(entry.name)) continue;
    // Skip hidden/special dirs
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;

    scan(baseDir, path.join(relativePath, entry.name), routes);
  }
}
