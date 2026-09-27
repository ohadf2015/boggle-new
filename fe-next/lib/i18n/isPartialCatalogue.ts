import { PARTIAL_FLAG } from './pickLandingMessages';

export function isPartialCatalogue(data: Record<string, unknown> | undefined): boolean {
  return Boolean(data && data[PARTIAL_FLAG] === true);
}
