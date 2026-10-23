/* Simulated network conditions. The UI must never assume instant, infallible
   persistence — these knobs make loading and error states real. */

export interface SimSettings {
  latencyMs: number;
  pendingFailures: number;
}

export const sim: SimSettings = { latencyMs: 220, pendingFailures: 0 };

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function jittered(base: number): number {
  return base + Math.floor(Math.random() * 40);
}

/** Consumes one queued failure if present. Deterministic, testable. */
export function consumeFailure(): boolean {
  if (sim.pendingFailures > 0) {
    sim.pendingFailures -= 1;
    return true;
  }
  return false;
}
