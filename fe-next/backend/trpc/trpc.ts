import { initTRPC } from '@trpc/server';
import type { Request, Response } from 'express';
import logger from '../utils/logger';

export interface TRPCContext {
  req: Request;
  res: Response;
}

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

export const loggedProcedure = publicProcedure.use(async ({ path, next }) => {
  const start = Date.now();
  const result = await next();
  logger.debug('TRPC', `${path} completed`, { durationMs: Date.now() - start });
  return result;
});
