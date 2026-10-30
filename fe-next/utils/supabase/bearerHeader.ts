import { createClient } from './client';

/** Session token as a header, so submits still authenticate where cookies are blocked (embed iframes). */
export async function bearerHeader(): Promise<Record<string, string>> {
  try {
    const token = (await createClient().auth.getSession()).data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
