import { notFound } from 'next/navigation';

export function notFoundInProduction(env: string | undefined = process.env.NODE_ENV): void {
  if (env === 'production') notFound();
}
