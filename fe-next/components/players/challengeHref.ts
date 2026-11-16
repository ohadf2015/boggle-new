/** A friend gets a real join invite to the new room; anyone else gets the create-room sheet to share by hand. */
export function playerChallengeHref(locale: string, userId: string, isFriend: boolean): string {
  return isFriend
    ? `/${locale}/multiplayer?invite=${encodeURIComponent(userId)}`
    : `/${locale}/multiplayer?autoCreate=true`;
}
