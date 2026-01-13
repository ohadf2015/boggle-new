/**
 * Word Validator Worker Pool
 * Manages a pool of worker threads for CPU-intensive word validation
 * Falls back to synchronous validation if workers are unavailable
 *
 * Supports both Node.js worker_threads and Bun.Worker
 */

import path from 'path';
import os from 'os';
import { createWorker, WorkerLike, isBun } from './workerRuntime';

// Interfaces
export interface WorkerMessage {
  id: number;
  action: string;
  word?: string;
  board?: string[][];
  positions?: [string, [number, number][]][] | null;
}

export interface WorkerResponse {
  id: number;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface PendingTask {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeout: NodeJS.Timeout;
}

export interface QueuedTask {
  message: WorkerMessage;
}

export interface PoolStats {
  totalWorkers: number;
  availableWorkers: number;
  queueLength: number;
  pendingTasks: number;
}

export interface GridPosition {
  row: number;
  col: number;
}

type PositionsMap = Map<string, [number, number][]>;

// Configuration
const POOL_SIZE = Math.min(os.cpus().length, 4); // Max 4 workers
const TASK_TIMEOUT = 5000; // 5 second timeout per task
const MAX_QUEUE_SIZE = 1000; // Maximum pending tasks

export class WordValidatorPool {
  private workers: WorkerLike[] = [];
  private availableWorkers: WorkerLike[] = [];
  private taskQueue: QueuedTask[] = [];
  private pendingTasks: Map<number, PendingTask> = new Map();
  private taskIdCounter: number = 0;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the worker pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initWorkers();
    await this.initPromise;
    this.isInitialized = true;
  }

  private async _initWorkers(): Promise<void> {
    // Worker file must be JavaScript as worker_threads don't support TypeScript directly
    const workerPath = path.join(__dirname, 'wordValidatorWorker.mjs');
    const runtime = isBun ? 'Bun' : 'Node.js';
    console.log(`[WORKER POOL] Initializing with ${runtime} runtime...`);

    for (let i = 0; i < POOL_SIZE; i++) {
      try {
        const worker = await createWorker(workerPath);

        worker.on('message', (data: unknown) => this._handleWorkerMessage(worker, data as WorkerResponse));
        worker.on('error', (error: Error) => this._handleWorkerError(worker, error));
        worker.on('exit', (code: number) => this._handleWorkerExit(worker, code));

        this.workers.push(worker);
        this.availableWorkers.push(worker);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[WORKER POOL] Failed to create worker ${i}:`, errorMessage);
      }
    }

    if (this.workers.length > 0) {
      console.log(`[WORKER POOL] Initialized with ${this.workers.length} workers (${runtime})`);
    } else {
      console.warn('[WORKER POOL] No workers available, falling back to sync mode');
    }
  }

  /**
   * Handle message from a worker
   */
  private _handleWorkerMessage(worker: WorkerLike, data: WorkerResponse): void {
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
  private _handleWorkerError(worker: WorkerLike, error: Error): void {
    console.error('[WORKER POOL] Worker error:', error.message);
    this._removeWorker(worker);
  }

  /**
   * Handle worker exit
   */
  private _handleWorkerExit(worker: WorkerLike, code: number): void {
    if (code !== 0) {
      console.warn(`[WORKER POOL] Worker exited with code ${code}`);
    }
    this._removeWorker(worker);
  }

  /**
   * Remove a worker from the pool
   */
  private _removeWorker(worker: WorkerLike): void {
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
  private _processQueue(): void {
    if (this.taskQueue.length === 0 || this.availableWorkers.length === 0) {
      return;
    }

    const worker = this.availableWorkers.pop()!;
    const task = this.taskQueue.shift()!;

    worker.postMessage(task.message);
  }

  /**
   * Submit a task to the worker pool
   */
  private _submitTask(action: string, data: Record<string, unknown>): Promise<unknown> {
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
      const message: WorkerMessage = { id, action, ...data } as WorkerMessage;

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
        const worker = this.availableWorkers.pop()!;
        worker.postMessage(message);
      } else {
        this.taskQueue.push({ message });
      }
    });
  }

  /**
   * Synchronous fallback for when workers are unavailable
   */
  private async _runSync(action: string, data: Record<string, unknown>): Promise<unknown> {
    // Dynamic import for ES module compatibility
    const validator = await import('./wordValidator');

    switch (action) {
      case 'isWordOnBoard':
        return validator.isWordOnBoard(data.word as string, data.board as string[][], data.positions as PositionsMap);
      case 'getWordPath':
        return validator.getWordPath(data.word as string, data.board as string[][], data.positions as PositionsMap);
      case 'makePositionsMap':
        return Array.from(validator.makePositionsMap(data.board as string[][]).entries());
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Check if a word exists on the board (async)
   */
  async isWordOnBoardAsync(
    word: string,
    board: string[][],
    positions?: PositionsMap
  ): Promise<boolean> {
    await this.initialize();

    try {
      return await this._submitTask('isWordOnBoard', {
        word,
        board,
        positions: positions ? Array.from(positions.entries()) : null
      }) as boolean;
    } catch (error) {
      // Fall back to sync on error
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('[WORKER POOL] Falling back to sync:', errorMessage);
      const validator = await import('./wordValidator');
      return validator.isWordOnBoard(word, board, positions);
    }
  }

  /**
   * Get the path of cells used to form a word (async)
   */
  async getWordPathAsync(
    word: string,
    board: string[][],
    positions?: PositionsMap
  ): Promise<GridPosition[] | null> {
    await this.initialize();

    try {
      return await this._submitTask('getWordPath', {
        word,
        board,
        positions: positions ? Array.from(positions.entries()) : null
      }) as GridPosition[] | null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('[WORKER POOL] Falling back to sync:', errorMessage);
      const validator = await import('./wordValidator');
      return validator.getWordPath(word, board, positions);
    }
  }

  /**
   * Build positions map (async) - useful for pre-computing once per game
   */
  async makePositionsMapAsync(board: string[][]): Promise<PositionsMap> {
    await this.initialize();

    try {
      const entries = await this._submitTask('makePositionsMap', { board }) as [string, [number, number][]][];
      return new Map(entries);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('[WORKER POOL] Falling back to sync:', errorMessage);
      const validator = await import('./wordValidator');
      return validator.makePositionsMap(board);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
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
  async shutdown(): Promise<void> {
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
      return new Promise<void>(resolve => {
        worker.once('exit', () => resolve());
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
export const pool = new WordValidatorPool();

/**
 * Check if a word exists on the board (async)
 */
export function isWordOnBoardAsync(
  word: string,
  board: string[][],
  positions?: PositionsMap
): Promise<boolean> {
  return pool.isWordOnBoardAsync(word, board, positions);
}

/**
 * Get the path of cells used to form a word (async)
 */
export function getWordPathAsync(
  word: string,
  board: string[][],
  positions?: PositionsMap
): Promise<GridPosition[] | null> {
  return pool.getWordPathAsync(word, board, positions);
}

/**
 * Build positions map (async)
 */
export function makePositionsMapAsync(board: string[][]): Promise<PositionsMap> {
  return pool.makePositionsMapAsync(board);
}

/**
 * Get pool statistics
 */
export function getPoolStats(): PoolStats {
  return pool.getStats();
}

/**
 * Shutdown the worker pool
 */
export function shutdownPool(): Promise<void> {
  return pool.shutdown();
}
