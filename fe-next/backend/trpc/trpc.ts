import { initTRPC } from '@trpc/server';
import type { Request, Response } from 'express';

export interface TRPCContext {
  req: Request;
  res: Response;
}

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
