import { movementTotals, type MoneyMovementDTO, type MoneyMovementsPage } from "@/lib/money-movements";
import type { SafeError } from "@/contracts/controllers";

// ERP-LOG-3: paged state for the money-movements log. A plain store (like
// the other machines) so it is testable without React. The server stays the
// record; this only accumulates the pages it was given.
export interface MovementsState {
  rows: MoneyMovementDTO[];
  totals: MoneyMovementsPage["totals"] | null;
  nextBefore: string | null;
  loading: boolean;
  error: SafeError | null;
}

export type MovementsFetcher = (before: string | null) => Promise<MoneyMovementsPage>;

const INITIAL: MovementsState = { rows: [], totals: null, nextBefore: null, loading: true, error: null };

export function createMovementsStore(fetchPage: MovementsFetcher, toError: (e: unknown) => SafeError) {
  let state = INITIAL;
  const listeners = new Set<() => void>();
  const set = (patch: Partial<MovementsState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };

  // Totals are recomputed over every loaded row, so pages never double count.
  const merge = (rows: MoneyMovementDTO[], page: MoneyMovementsPage): Partial<MovementsState> => {
    const all = [...rows, ...page.rows];
    return { rows: all, totals: movementTotals(all), nextBefore: page.nextBefore, loading: false, error: null };
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    getSnapshot: () => state,
    async reload() {
      set({ loading: true });
      try {
        set(merge([], await fetchPage(null)));
      } catch (e) {
        set({ loading: false, error: toError(e) });
      }
    },
    async loadMore() {
      if (state.loading || state.nextBefore === null) return;
      set({ loading: true });
      try {
        set(merge(state.rows, await fetchPage(state.nextBefore)));
      } catch (e) {
        set({ loading: false, error: toError(e) });
      }
    },
  };
}
