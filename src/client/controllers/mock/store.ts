// Minimal external store for useSyncExternalStore. Every update replaces the
// snapshot object so React sees the change.
export interface Store<T> {
  get(): T;
  set(patch: Partial<T>): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => snapshot,
    set(patch) {
      snapshot = { ...snapshot, ...patch };
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// Timers that can all be cancelled when a hook unmounts or the user stops.
export function createTimers() {
  const pending = new Map<ReturnType<typeof setTimeout>, (ok: boolean) => void>();
  return {
    // Resolves true after `ms`, or false at once if cancelled while waiting.
    wait(ms: number): Promise<boolean> {
      return new Promise((resolve) => {
        const handle = setTimeout(() => {
          pending.delete(handle);
          resolve(true);
        }, ms);
        pending.set(handle, resolve);
      });
    },
    cancel() {
      pending.forEach((resolve, handle) => {
        clearTimeout(handle);
        resolve(false);
      });
      pending.clear();
    },
  };
}
