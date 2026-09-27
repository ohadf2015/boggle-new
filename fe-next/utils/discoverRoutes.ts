import { PUBLIC_ROUTES } from './generatedRoutes';

/**
 * Returns all static public routes.
 * Uses build-time generated list (works in both dev and production).
 */
export async function discoverPublicRoutes(): Promise<string[]> {
  return PUBLIC_ROUTES;
}
