import { Encoder } from './types.js';

export class QTable<S, A> {
  private readonly store = new Map<string, Map<string, number>>();

  constructor(
    private readonly sEnc: Encoder<S>,
    private readonly aEnc: Encoder<A>,
  ) {}

  get(s: S, a: A): number {
    const stateKey = this.sEnc(s);
    const actionKey = this.aEnc(a);
    return this.store.get(stateKey)?.get(actionKey) ?? 0;
  }

  set(s: S, a: A, value: number): void {
    const stateKey = this.sEnc(s);
    const actionKey = this.aEnc(a);
    const row = this.getOrCreateRow(stateKey);
    row.set(actionKey, value);
  }

  private getOrCreateRow(stateKey: string): Map<string, number> {
    let row = this.store.get(stateKey);
    if (!row) {
      row = new Map<string, number>();
      this.store.set(stateKey, row);
    }
    return row;
  }

  /** max_a' Q(s, a') over provided actions; returns {a*, q*} or undefined. */
  maxOverActions(s: S, actions: A[]): { action: A; q: number } | undefined {
    let best: { action: A; q: number } | undefined;
    for (const a of actions) {
      const q = this.get(s, a);
      if (!best || q > best.q) best = { action: a, q };
    }
    return best;
  }

  /** Export Q-table as JSON object */
  toJSON(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};

    for (const [stateKey, actionMap] of this.store.entries()) {
      const actions: Record<string, number> = {};
      for (const [actionKey, value] of actionMap.entries()) {
        actions[actionKey] = value;
      }
      result[stateKey] = actions;
    }

    return result;
  }

  /** Get max Q-value for a state across all stored actions */
  getStateMaxQ(s: S): number {
    const stateKey = this.sEnc(s);
    const row = this.store.get(stateKey);
    if (!row || row.size === 0) return 0;

    return Math.max(...row.values());
  }

  /** Get all states that have Q-values stored */
  getStates(): Set<string> {
    return new Set(this.store.keys());
  }
}
