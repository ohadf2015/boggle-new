// Every list of lessons keeps a private copy; a write anywhere must refresh them all.
const subscribers = new Set<() => void>();

export function notifyLessonsChanged(): void {
  subscribers.forEach((notify) => notify());
}

export function onLessonsChanged(notify: () => void): () => void {
  subscribers.add(notify);
  return () => { subscribers.delete(notify); };
}
