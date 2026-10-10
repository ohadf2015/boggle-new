import { notFound } from 'next/navigation';
import { connection } from 'next/server';

type RouteEnv = { NODE_ENV?: string; ENABLE_QA_ROUTES?: string };

export async function notFoundInProduction(env: RouteEnv = process.env): Promise<void> {
  await connection();
  if (env.NODE_ENV === 'production' && env.ENABLE_QA_ROUTES !== '1') notFound();
}
