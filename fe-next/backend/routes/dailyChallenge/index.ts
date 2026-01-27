/**
 * Daily Challenge Routes Index
 *
 * This module provides the daily challenge API routes.
 * For backward compatibility, it re-exports the main router from the parent directory.
 *
 * Future migration plan:
 * 1. Move routes incrementally to domain-specific files
 * 2. Update imports to use './types' and './utils'
 * 3. Once complete, update the parent module to import from here
 */

// Export types and utilities for use in route files
export * from './types';
export * from './utils';

// Note: The main router is still in the parent directory for backward compatibility
// import dailyChallengeRouter from '../dailyChallenge';
// export default dailyChallengeRouter;
