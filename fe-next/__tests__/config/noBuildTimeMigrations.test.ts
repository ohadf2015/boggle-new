import { describe, it, expect } from 'vitest';
import pkg from '../../package.json';

/**
 * `postbuild` used to run `db:migrate` against whatever Supabase the build env
 * pointed at — i.e. PRODUCTION on every Railway build with a service key. It was
 * a no-op only because prod lacks the `exec_sql` RPC it calls; creating that RPC
 * would have applied every pending migration on the next deploy. Migrations go
 * through the CI Management-API migrator instead.
 */
describe('build never migrates a database', () => {
  it('has no lifecycle hook that runs db:migrate', () => {
    const scripts = (pkg as { scripts: Record<string, string> }).scripts;
    for (const hook of ['prebuild', 'postbuild', 'preinstall', 'postinstall', 'prestart', 'poststart']) {
      expect(scripts[hook] ?? '', hook).not.toMatch(/db:migrate|run-migrations/);
    }
    expect(scripts.build).not.toMatch(/db:migrate|run-migrations/);
  });
});
