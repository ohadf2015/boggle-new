import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = join(__dirname, '..', 'assert-vitest-passed.mjs');

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'assert-vitest-'));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Run the gate; returns { code, stdout, stderr }. Never throws on non-zero exit. */
function runGate(reportArg: string | null, vitestRc = ''): { code: number; out: string } {
  const args = [SCRIPT];
  if (reportArg !== null) args.push(reportArg);
  if (vitestRc !== '') args.push(vitestRc);
  const r = spawnSync('node', args, { encoding: 'utf8' });
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function writeReport(name: string, body: object): string {
  const p = join(dir, name);
  writeFileSync(p, JSON.stringify(body));
  return p;
}

const PASSING = {
  numTotalTestSuites: 498,
  numTotalTests: 4559,
  numPassedTests: 4554,
  numFailedTests: 0,
  numFailedTestSuites: 0,
};

describe('assert-vitest-passed gate', () => {
  // Given a fully-green report AND vitest itself exited 0, When gated, Then PASS.
  it('passes when all tests passed and vitest exited 0', () => {
    const p = writeReport('clean.json', PASSING);
    const { code } = runGate(p, '0');
    expect(code).toBe(0);
  });

  // The core behavior: all tests passed but vitest crashed on teardown (rc=1).
  // Given zero failed tests, When vitest rc != 0, Then PASS but emit a warning.
  it('tolerates a post-success worker crash (rc!=0, zero failures) with a warning', () => {
    const p = writeReport('crash.json', PASSING);
    const { code, out } = runGate(p, '1');
    expect(code).toBe(0);
    expect(out).toContain('::warning::');
    expect(out).toMatch(/tolerating a post-success worker crash/i);
  });

  // Given a genuine test failure, When gated, Then FAIL regardless of rc — never masked.
  it('fails when a test actually failed', () => {
    const p = writeReport('failed.json', { ...PASSING, numFailedTests: 3 });
    const { code, out } = runGate(p, '1');
    expect(code).toBe(1);
    expect(out).toContain('::error::');
  });

  it('fails when a whole suite failed', () => {
    const p = writeReport('suite-failed.json', { ...PASSING, numFailedTestSuites: 1 });
    expect(runGate(p, '1').code).toBe(1);
  });

  // Guard against a crash BEFORE the suite ran (counts at zero) being read as success.
  it('fails when no suites/tests ran (crash before execution)', () => {
    const p = writeReport('empty.json', {
      numTotalTestSuites: 0,
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 0,
      numFailedTestSuites: 0,
    });
    expect(runGate(p, '1').code).toBe(1);
  });

  it('fails when the report is missing', () => {
    const { code, out } = runGate(join(dir, 'does-not-exist.json'), '1');
    expect(code).toBe(1);
    expect(out).toMatch(/could not read\/parse/i);
  });

  it('fails when the report is unparseable', () => {
    const p = join(dir, 'bad.json');
    writeFileSync(p, '{ not valid json');
    expect(runGate(p, '1').code).toBe(1);
  });

  it('fails when expected counters are absent', () => {
    const p = writeReport('partial.json', { startTime: 1, success: true });
    expect(runGate(p, '1').code).toBe(1);
  });

  it('fails when no report path argument is given', () => {
    expect(runGate(null).code).toBe(1);
  });
});
