import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { qaRoutesEnabled, type QaRouteEnv } from './qaRoutes';

export async function notFoundInProduction(env: QaRouteEnv = process.env): Promise<void> {
  await connection();
  if (!qaRoutesEnabled(env)) notFound();
}
