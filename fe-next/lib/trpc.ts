import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../backend/trpc/root';

export const trpc = createTRPCReact<AppRouter>();
