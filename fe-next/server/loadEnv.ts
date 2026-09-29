// .env.local first so it wins over .env placeholders, matching Next's own
// precedence. Existing process env is never overridden (dotenv default).
// Side-effect module: imported before anything that reads process.env.
import { config as loadEnv } from 'dotenv';

loadEnv({ path: ['.env.local', '.env'], quiet: true });
