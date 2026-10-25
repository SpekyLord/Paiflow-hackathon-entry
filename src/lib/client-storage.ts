'use client';

import { useMemo, useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('storage', onStoreChange);
  return () => window.removeEventListener('storage', onStoreChange);
}

export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function useLocalStorageValue(key: string) {
  return useSyncExternalStore(
    subscribe,
    () => (typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
    () => null,
  );
}

export function useLocalStorageJson<T>(key: string) {
  const rawValue = useLocalStorageValue(key);

  return useMemo(() => {
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return null;
    }
  }, [rawValue]);
}
