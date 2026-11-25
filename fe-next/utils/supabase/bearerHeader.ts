import { createClient } from './client';

export async function accessToken(): Promise<string | undefined> {
  try {
    return (await createClient().auth.getSession()).data.session?.access_token;
  } catch {
    return undefined;
  }
}

/** Session token as a header, so submits still authenticate where cookies are blocked (embed iframes). */
export async function bearerHeader(): Promise<Record<string, string>> {
  const token = await accessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
