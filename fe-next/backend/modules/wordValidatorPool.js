/**
 * Word Validator Worker Pool
 * Manages a pool of worker threads for CPU-intensive word validation
 * Falls back to synchronous validation if workers are unavailable
 */

const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');

// Configuration
const POOL_SIZE = Math.min(os.cpus().length, 4); // Max 4 workers
const TASK_TIMEOUT = 5000; // 5 second timeout per task
const MAX_QUEUE_SIZE = 1000; // Maximum pending tasks

class WordValidatorPool {
  constructor() {
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.pendingTasks = new Map(); // id -> { resolve, reject, timeout }
    this.taskIdCounter = 0;
    this.isInitialized = false;
    this.initPromise = null;
  }

  /**
   * Initialize the worker pool
   */
  async initialize() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initWorkers();
    await this.initPromise;
    this.isInitialized = true;
  }

  async _initWorkers() {
    const workerPath = path.join(__dirname, 'wordValidatorWorker.js');

    for (let i = 0; i < POOL_SIZE; i++) {
      try {
        const worker = new Worker(workerPath);

        worker.on('message', (data) => this._handleWorkerMessage(worker, data));
        worker.on('error', (error) => this._handleWorkerError(worker, error));
        worker.on('exit', (code) => this._handleWorkerExit(worker, code));

        this.workers.push(worker);
        this.availableWorkers.push(worker);
      } catch (error) {
        console.warn(`[WORKER POOL] Failed to create worker ${i}:`, error.message);
      }
    }

    if (this.workers.length > 0) {
      console.log(`[WORKER POOL] Initialized with ${this.workers.length} workers`);
    } else {
      console.warn('[WORKER POOL] No workers available, falling back to sync mode');
    }
  }

  /**
   * Handle message from a worker
   */
  _handleWorkerMessage(worker, data) {
    const { id, success, result, error } = data;
    const task = this.pendingTasks.get(id);

    if (task) {
      clearTimeout(task.timeout);
      this.pendingTasks.delete(id);

      if (success) {
        task.resolve(result);
      } else {
        task.reject(new Error(error));
      }
    }

    // Return worker to pool and process next task
    this.availableWorkers.push(worker);
    this._processQueue();
  }

  /**
   * Handle worker error
   */
  _handleWorkerError(worker, error) {
    console.error('[WORKER POOL] Worker error:', error.message);
    this._removeWorker(worker);
  }

  /**
   * Handle worker exit
   */
  _handleWorkerExit(worker, code) {
    if (code !== 0) {
      console.warn(`[WORKER POOL] Worker exited with code ${code}`);
    }
    this._removeWorker(worker);
  }

  /**
   * Remove a worker from the pool
   */
  _removeWorker(worker) {
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex !== -1) {
      this.workers.splice(workerIndex, 1);
    }

    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex !== -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }
  }

  /**
   * Process the next task in the queue
   */
  _processQueue() {
    if (this.taskQueue.length === 0 || this.availableWorkers.length === 0) {
      return;
    }

    const worker = this.availableWorkers.pop();
    const task = this.taskQueue.shift();

    worker.postMessage(task.message);
  }

  /**
   * Submit a task to the worker pool
   */
  _submitTask(action, data) {
    return new Promise((resolve, reject) => {
      // If no workers available, fall back to sync
      if (this.workers.length === 0) {
        return this._runSync(action, data).then(resolve).catch(reject);
      }

      // Reject if queue is full
      if (this.taskQueue.length >= MAX_QUEUE_SIZE) {
        return reject(new Error('Worker queue full'));
      }

      const id = ++this.taskIdCounter;
      const message = { id, action, ...data };

      // Set up timeout
      const timeout = setTimeout(() => {
        const task = this.pendingTasks.get(id);
        if (task) {
          this.pendingTasks.delete(id);
          // Fall back to sync on timeout
          this._runSync(action, data).then(task.resolve).catch(task.reject);
        }
      }, TASK_TIMEOUT);

      this.pendingTasks.set(id, { resolve, reject, timeout });

      if (this.availableWorkers.length > 0) {
        const worker = this.availableWorkers.pop();
        worker.postMessage(message);
      } else {
        this.taskQueue.push({ message });
      }
    });
  }

  /**
   * Synchronous fallback for when workers are unavailable
   */
  async _runSync(action, data) {
    // Import the synchronous validator
    const validator = require('./wordValidator');

    switch (action) {
      case 'isWordOnBoard':
        return validator.isWordOnBoard(data.word, data.board, data.positions);
      case 'getWordPath':
        return validator.getWordPath(data.word, data.board, data.positions);
      case 'makePositionsMap':
        return Array.from(validator.makePositionsMap(data.board).entries());
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Check if a word exists on the board (async)
   */
  async isWordOnBoardAsync(word, board, positions) {
    await this.initialize();

    try {
      return await this._submitTask('isWordOnBoard', {
        word,
        board,
        positions: positions ? Array.from(positions.entries()) : null
      });
    } catch (error) {
      // Fall back to sync on error
      console.warn('[WORKER POOL] Falling back to sync:', error.message);
      const validator = require('./wordValidator');
      return validator.isWordOnBoard(word, board, positions);
    }
  }

  /**
   * Get the path of cells used to form a word (async)
   */
  async getWordPathAsync(word, board, positions) {
    await this.initialize();

    try {
      return await this._submitTask('getWordPath', {
        word,
        board,
        positions: positions ? Array.from(positions.entries()) : null
      });
    } catch (error) {
      console.warn('[WORKER POOL] Falling back to sync:', error.message);
      const validator = require('./wordValidator');
      return validator.getWordPath(word, board, positions);
    }
  }

  /**
   * Build positions map (async) - useful for pre-computing once per game
   */
  async makePositionsMapAsync(board) {
    await this.initialize();

    try {
      const entries = await this._submitTask('makePositionsMap', { board });
      return new Map(entries);
    } catch (error) {
      console.warn('[WORKER POOL] Falling back to sync:', error.message);
      const validator = require('./wordValidator');
      return validator.makePositionsMap(board);
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      queueLength: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size
    };
  }

  /**
   * Shutdown the worker pool
   */
  async shutdown() {
    console.log('[WORKER POOL] Shutting down...');

    // Clear pending tasks
    for (const [id, task] of this.pendingTasks) {
      clearTimeout(task.timeout);
      task.reject(new Error('Worker pool shutting down'));
    }
    this.pendingTasks.clear();
    this.taskQueue = [];

    // Terminate all workers
    const terminationPromises = this.workers.map(worker => {
      return new Promise(resolve => {
        worker.once('exit', resolve);
        worker.terminate();
      });
    });

    await Promise.all(terminationPromises);
    this.workers = [];
    this.availableWorkers = [];
    this.isInitialized = false;
    this.initPromise = null;

    console.log('[WORKER POOL] Shutdown complete');
  }
}

// Export singleton instance
const pool = new WordValidatorPool();

module.exports = {
  pool,
  isWordOnBoardAsync: (word, board, positions) => pool.isWordOnBoardAsync(word, board, positions),
  getWordPathAsync: (word, board, positions) => pool.getWordPathAsync(word, board, positions),
  makePositionsMapAsync: (board) => pool.makePositionsMapAsync(board),
  getPoolStats: () => pool.getStats(),
  shutdownPool: () => pool.shutdown()
};
