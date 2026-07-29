/**
 * Word Validator Worker Pool
 * Manages a pool of worker threads for CPU-intensive word validation
 * Falls back to direct synchronous validation if workers are unavailable
 *
 * Supports both Node.js worker_threads and Bun.Worker
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { createWorker, WorkerLike, isBun } from './workerRuntime';
import * as validator from './wordValidator';
import { findAllWords as solverFindAllWords, type FindWordsOptions } from './boggleSolver';
import logger from '../utils/logger';

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
  private syncOnly: boolean = false;

  /**
   * Initialize the worker pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initWorkers()
      .then(() => {
        this.isInitialized = true;
      })
      .catch((error) => {
        // Reset so next call can retry instead of returning the rejected promise forever
        this.initPromise = null;
        logger.error('WORKER_POOL', 'Initialization failed, will retry on next call', error);
        // Fall back to sync mode for this attempt
        this.syncOnly = true;
      });
    await this.initPromise;
  }

  private async _initWorkers(): Promise<void> {
    // Worker file must be JavaScript as worker_threads don't support TypeScript directly
    const workerPath = path.join(__dirname, 'wordValidatorWorker.mjs');

    // Skip worker creation if the worker file doesn't exist (uses sync fallback)
    if (!fs.existsSync(workerPath)) {
      logger.info('WORKER_POOL', 'Worker file not found, using direct synchronous validation');
      this.syncOnly = true;
      return;
    }

    const runtime = isBun ? 'Bun' : 'Node.js';
    logger.info('WORKER_POOL', `Initializing with ${runtime} runtime...`);

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
        logger.warn('WORKER_POOL', `Failed to create worker ${i}`, { error: errorMessage });
      }
    }

    if (this.workers.length > 0) {
      logger.info('WORKER_POOL', `Initialized with ${this.workers.length} workers`, { runtime });
    } else {
      logger.warn('WORKER_POOL', 'No workers available, falling back to sync mode');
      this.syncOnly = true;
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
    logger.error('WORKER_POOL', 'Worker error', { error: error.message });
    this._removeWorker(worker);
  }

  /**
   * Handle worker exit
   */
  private _handleWorkerExit(worker: WorkerLike, code: number): void {
    if (code !== 0) {
      logger.warn('WORKER_POOL', `Worker exited with code ${code}`);
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
        try {
          return resolve(this._runSync(action, data));
        } catch (err) {
          return reject(err);
        }
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
          try {
            task.resolve(this._runSync(action, data));
          } catch (err) {
            task.reject(err);
          }
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
   * Used only when workers exist but the task needs sync execution
   */
  private _runSync(action: string, data: Record<string, unknown>): unknown {
    // Reconstruct Map from serialized array entries if needed
    const positions = data.positions
      ? new Map(data.positions as [string, [number, number][]][])
      : undefined;

    switch (action) {
      case 'isWordOnBoard':
        return validator.isWordOnBoard(data.word as string, data.board as string[][], positions);
      case 'getWordPath':
        return validator.getWordPath(data.word as string, data.board as string[][], positions);
      case 'makePositionsMap':
        return Array.from(validator.makePositionsMap(data.board as string[][]).entries());
      case 'findAllWords':
        return solverFindAllWords(
          data.board as string[][],
          data.language as string,
          (data.options ?? {}) as FindWordsOptions
        );
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

    // Defensive: ensure positions is a proper Map before using Map methods
    const safePositions = positions instanceof Map ? positions : undefined;

    // Direct sync path — no serialization overhead, no promise chains
    if (this.syncOnly) {
      return validator.isWordOnBoard(word, board, safePositions);
    }

    try {
      return await this._submitTask('isWordOnBoard', {
        word,
        board,
        positions: safePositions ? Array.from(safePositions.entries()) : null
      }) as boolean;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('WORKER_POOL', 'Falling back to sync', { error: errorMessage });
      return validator.isWordOnBoard(word, board, safePositions);
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

    const safePositions = positions instanceof Map ? positions : undefined;

    if (this.syncOnly) {
      return validator.getWordPath(word, board, safePositions);
    }

    try {
      return await this._submitTask('getWordPath', {
        word,
        board,
        positions: safePositions ? Array.from(safePositions.entries()) : null
      }) as GridPosition[] | null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('WORKER_POOL', 'Falling back to sync', { error: errorMessage });
      return validator.getWordPath(word, board, safePositions);
    }
  }

  /**
   * Build positions map (async) - useful for pre-computing once per game
   */
  async makePositionsMapAsync(board: string[][]): Promise<PositionsMap> {
    await this.initialize();

    if (this.syncOnly) {
      return validator.makePositionsMap(board);
    }

    try {
      const entries = await this._submitTask('makePositionsMap', { board }) as [string, [number, number][]][];
      return new Map(entries);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('WORKER_POOL', 'Falling back to sync', { error: errorMessage });
      return validator.makePositionsMap(board);
    }
  }

  /**
   * Find all valid words on a Boggle grid (async).
   *
   * When workers are available the computation runs in a worker thread,
   * keeping the event loop free during the 50-100 ms DFS over a 6×6 grid.
   * When in sync-only mode (worker file absent) the call is wrapped in a
   * setImmediate-deferred Promise so that at minimum any I/O callbacks
   * queued before game-start can flush before we block.
   *
   * TODO(PERF-012): create wordValidatorWorker.mjs with a 'findAllWords'
   * action so this path fully offloads to a worker thread.
   */
  async findAllWordsAsync(
    board: string[][],
    language: string,
    options: FindWordsOptions = {}
  ): Promise<string[]> {
    await this.initialize();

    if (this.syncOnly) {
      // Defer to next event-loop iteration so queued I/O can flush first,
      // then run the synchronous (but potentially blocking) DFS.
      return new Promise<string[]>((resolve, reject) => {
        setImmediate(() => {
          try {
            resolve(solverFindAllWords(board, language, options));
          } catch (err) {
            reject(err);
          }
        });
      });
    }

    try {
      return await this._submitTask('findAllWords', { board, language, options }) as string[];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('WORKER_POOL', 'findAllWords falling back to sync', { error: errorMessage });
      return solverFindAllWords(board, language, options);
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
    logger.info('WORKER_POOL', 'Shutting down...');

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

    logger.info('WORKER_POOL', 'Shutdown complete');
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
 * Find all valid words on a Boggle grid (async, worker-offloaded when available)
 */
export function findAllWordsAsync(
  board: string[][],
  language: string,
  options?: FindWordsOptions
): Promise<string[]> {
  return pool.findAllWordsAsync(board, language, options);
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
