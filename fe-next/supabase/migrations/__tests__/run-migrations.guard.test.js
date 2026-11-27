/**
 * Tests for Supabase migration runner
 * Tests the deployment performance bottleneck fix
 */

const { spawn } = require('child_process');
const path = require('path');

describe('Migration Runner - Deployment Performance', () => {
  const migrationScript = path.join(__dirname, '../run-migrations.js');

  beforeEach(() => {
    // Clear env vars to simulate deployment without service key
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('should exit quickly (< 2s) when env vars are missing', (done) => {
    const start = Date.now();

    const child = spawn('node', [migrationScript], {
      env: { ...process.env },
      stdio: 'pipe',
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const elapsed = Date.now() - start;

      // Critical: Must exit within 2 seconds even on failure
      expect(elapsed).toBeLessThan(2000);

      // Should fail early without attempting network calls
      expect(code).toBe(1);
      expect(stderr).toContain('Missing required environment variables');

      done();
    });

    // Timeout after 3s (test should complete in < 2s)
    setTimeout(() => {
      child.kill();
      done(new Error('Migration script took too long'));
    }, 3000);
  });

  it('should exit with code 1 when env vars are missing', (done) => {
    const child = spawn('node', [migrationScript], {
      env: { ...process.env },
      stdio: 'pipe',
    });

    child.on('close', (code) => {
      expect(code).toBe(1);
      done();
    });
  });

  it('should fail BEFORE reading migration files (< 100ms)', (done) => {
    const start = Date.now();

    const child = spawn('node', [migrationScript], {
      env: { ...process.env },
      stdio: 'pipe',
    });

    child.on('close', () => {
      const elapsed = Date.now() - start;

      // Should fail BEFORE reading any files (< 100ms)
      // This ensures we don't waste time on disk I/O
      expect(elapsed).toBeLessThan(100);

      done();
    });
  });
});
