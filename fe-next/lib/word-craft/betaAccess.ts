const BETA_EMAILS = ['ohadf2015@gmail.com', 'eden320@gmail.com'] as const

export function isWordCraftBetaUser(email: string | undefined): boolean {
  return !!email && (BETA_EMAILS as readonly string[]).includes(email)
}
