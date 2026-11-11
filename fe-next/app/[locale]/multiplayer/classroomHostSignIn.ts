export const CLASSROOM_HOST_SIGN_IN_WAIT_MS = 8000;
const POLL_MS = 60;

/** A classroom host must create as the signed-in teacher; resolves false if no user shows up in time. */
export async function waitForSignedInUser(
  readUser: () => { id?: string } | null | undefined,
  timeoutMs = CLASSROOM_HOST_SIGN_IN_WAIT_MS,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (!readUser()?.id && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return !!readUser()?.id;
}
