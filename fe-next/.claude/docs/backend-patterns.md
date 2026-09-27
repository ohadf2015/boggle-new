# Backend Patterns

## WebSocket Handlers
Located in `backend/handlers/`:
- Use `createHandler(name, schema)` for validation (Zod)
- Rate limit: `backend/middleware/rateLimit.ts` (50 msg/10s default)
- Error format: `{ error: 'ERROR_CODE', message: 'Human-readable' }`
- Handler structure:
  ```typescript
  export const myHandler = createHandler('my-event', schema,
    async (socket, data, context) => {
      // Validated data, auto-typed
      // Return response or throw error
    }
  );
  ```

## Rate Limiting
- Default: 50 messages per 10 seconds per socket
- Configure: `backend/config/rateLimits.ts`
- Bypass: Set `DISABLE_RATE_LIMIT=true` in `.env.local` (dev only)
- Custom limits: Pass `rateLimit` option to `createHandler()`

## Testing Backend
```bash
npm run test:backend         # Run backend tests
npm run test:backend:watch   # Watch mode
```

**Test structure:**
- Unit tests: `backend/**/*.test.ts`
- Integration tests: `backend/**/*.integration.test.ts`
- Mocks: Use `vi.mock()` for Redis, Supabase (Vitest)

**Common patterns:**
- Mock SocketIO: `import { createMockSocket } from 'backend/test-utils'`
- Mock Redis: Auto-mocked via `__mocks__/ioredis.ts`
- Test cleanup: `afterEach(() => vi.clearAllMocks())`
