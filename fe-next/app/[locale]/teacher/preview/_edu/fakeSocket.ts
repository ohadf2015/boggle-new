import type { Socket } from 'socket.io-client';

type Handler = (payload: unknown) => void;
type Responder = (payload: unknown, reply: (event: string, data: unknown) => void) => void;

/** Dev preview only: answers request events from fixtures; every other emit stays in the page. */
export class FakeSocket {
  private handlers = new Map<string, Set<Handler>>();
  readonly sent: { event: string; payload: unknown }[] = [];
  connected = true;
  id = 'preview-socket';

  constructor(private responders: Record<string, Responder> = {}) {}

  on(event: string, fn: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(fn);
    return this;
  }

  off(event: string, fn?: Handler) {
    if (fn) this.handlers.get(event)?.delete(fn);
    else this.handlers.delete(event);
    return this;
  }

  emit(event: string, payload?: unknown) {
    this.sent.push({ event, payload });
    const responder = this.responders[event];
    if (responder) setTimeout(() => responder(payload, (e, d) => this.fire(e, d)), 0);
    return this;
  }

  fire(event: string, payload: unknown) {
    for (const fn of [...(this.handlers.get(event) ?? [])]) fn(payload);
  }

  asSocket(): Socket {
    return this as unknown as Socket;
  }
}
