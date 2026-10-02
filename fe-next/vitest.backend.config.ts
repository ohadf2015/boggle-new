// The backend suite needs backend/vitest.config.ts's cjs-to-esm transform: without it, require() bypasses vi.mock and loads a second module graph.
export { default } from './backend/vitest.config';
