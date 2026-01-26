/**
 * Architecture Test: Client-Server Boundary
 *
 * Verifies that client-safe utilities don't import server-only modules
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('Client-Server Boundary', () => {
  describe('utils/dailyChallenge/', () => {
    it('should not import server-only modules in client-safe files', () => {
      const utilsDir = join(process.cwd(), 'utils/dailyChallenge');
      const files = readdirSync(utilsDir);

      // Files that are safe for client-side use
      const clientSafeFiles = files.filter(
        (f) => f.endsWith('.ts') && !f.endsWith('.server.ts') && !f.includes('.test.') && f !== 'types.ts'
      );

      const serverOnlyImports = [
        '@/backend/',
        'backend/',
        'async_hooks',
        'ioredis',
        'fs/promises',
        'fs',
        'net',
        'tls',
        'dns',
      ];

      const violations: string[] = [];

      for (const file of clientSafeFiles) {
        const filePath = join(utilsDir, file);
        const content = readFileSync(filePath, 'utf-8');

        for (const serverImport of serverOnlyImports) {
          if (content.includes(`from '${serverImport}`) || content.includes(`from "${serverImport}`)) {
            violations.push(
              `${file} imports server-only module: ${serverImport}`
            );
          }

          // Check dynamic imports too
          if (
            content.includes(`import('${serverImport}`) ||
            content.includes(`import("${serverImport}`)
          ) {
            violations.push(
              `${file} has dynamic import of server-only module: ${serverImport}`
            );
          }
        }
      }

      if (violations.length > 0) {
        throw new Error(
          'Client-safe files must not import server-only modules:\n' +
          violations.map((v) => `  - ${v}`).join('\n') +
          '\n\nMove server-only functions to .server.ts files.'
        );
      }
    });

    it('gridGeneration.ts should not have dynamic imports to backend modules', () => {
      const gridGenPath = join(process.cwd(), 'utils/dailyChallenge/gridGeneration.ts');
      const content = readFileSync(gridGenPath, 'utf-8');

      // Check for dynamic imports to backend
      expect(content).not.toContain("import('@/backend/");
      expect(content).not.toContain('import("@/backend/');
    });
  });
});
