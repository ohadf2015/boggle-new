/**
 * Test for wordValidatorWorker spawn behavior
 * Verifies that spawning workers doesn't produce MODULE_TYPELESS_PACKAGE_JSON warnings
 */

const { Worker } = require('worker_threads');
const path = require('path');

describe('Word Validator Worker - Spawn Test', () => {
  test('worker should spawn without MODULE_TYPELESS_PACKAGE_JSON warnings', (done) => {
    const workerPath = path.join(__dirname, '../modules/wordValidatorWorker.mjs');

    // Capture stderr to check for warnings
    const originalStderrWrite = process.stderr.write;
    const stderrOutput = [];

    process.stderr.write = function(chunk) {
      stderrOutput.push(chunk.toString());
      return originalStderrWrite.apply(process.stderr, arguments);
    };

    const worker = new Worker(workerPath);

    worker.on('message', (data) => {
      // Worker should respond
      expect(data).toBeDefined();
    });

    worker.on('error', (error) => {
      // Restore stderr
      process.stderr.write = originalStderrWrite;
      done(error);
    });

    // Give worker time to initialize
    setTimeout(() => {
      worker.terminate();

      // Restore stderr
      process.stderr.write = originalStderrWrite;

      // Check for MODULE_TYPELESS_PACKAGE_JSON warning
      const warningFound = stderrOutput.some(output =>
        output.includes('MODULE_TYPELESS_PACKAGE_JSON')
      );

      expect(warningFound).toBe(false);
      done();
    }, 1000);
  }, 10000);
});
