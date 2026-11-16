/**
 * Class mode-bridge funnel. Never throws. `class_id` is the property the
 * retention read groups on; teacher names stay off the event.
 */
import { safeCapture, safeRegister } from './telemetryCore';
import { CLASS_MODE_BRIDGE_EVENTS, type ClassBridgeMode } from './classModeBridge';

export interface ClassModeBridgeEvent {
  class_id: string;
  mode?: ClassBridgeMode;
}

export function trackClassModeBridgeOffered(event: ClassModeBridgeEvent): void {
  safeCapture(CLASS_MODE_BRIDGE_EVENTS.offered, { class_id: event.class_id });
}

export function trackClassModeBridgeAccepted(event: ClassModeBridgeEvent & { mode: ClassBridgeMode }): void {
  safeCapture(CLASS_MODE_BRIDGE_EVENTS.accepted, { class_id: event.class_id, mode: event.mode });
}

/** The second session has begun. Register the class so later events on that session still carry it. */
export function trackSecondSessionStarted(event: ClassModeBridgeEvent & { mode: ClassBridgeMode }): void {
  safeRegister({ class_id: event.class_id });
  safeCapture(CLASS_MODE_BRIDGE_EVENTS.started, { class_id: event.class_id, mode: event.mode });
}
