import * as earthquakeHandler from '../earthquakeHandler';

describe('EARTHQUAKE_CONFIG durations (catalyst unification)', () => {
  it('uses the scaled-up multiplayer durations', () => {
    expect(earthquakeHandler.EARTHQUAKE_CONFIG.warningDurationMs).toBe(3000);
    expect(earthquakeHandler.EARTHQUAKE_CONFIG.shakeDurationMs).toBe(1500);
    expect(earthquakeHandler.EARTHQUAKE_CONFIG.fireRoundDurationSeconds).toBe(23);
  });
});

describe('executeEarthquakeSequence export (catalyst unification)', () => {
  it('is exported so the catalyst scheduler can invoke it', () => {
    expect(typeof earthquakeHandler.executeEarthquakeSequence).toBe('function');
  });
});

describe('triggerEarthquake socket handler removal (catalyst unification)', () => {
  it('does not register a triggerEarthquake listener', () => {
    const registered: string[] = [];
    const fakeSocket = {
      id: 'sock-1',
      on: (event: string) => { registered.push(event); },
    } as unknown as import('socket.io').Socket;
    const fakeIo = {} as unknown as import('socket.io').Server;

    earthquakeHandler.registerEarthquakeHandlers(fakeIo, fakeSocket);

    expect(registered).not.toContain('triggerEarthquake');
  });
});
