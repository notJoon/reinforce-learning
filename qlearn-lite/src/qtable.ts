import { Encoder } from "./types";

export class QTable<S, A> {
    private readonly sEnc: Encoder<S>;
    private readonly aEnc: Encoder<A>;
    private readonly store = new Map<string, Map<string, number>>();

    constructor(sEnc: Encoder<S>, aEnc: Encoder<A>) {
        this.sEnc = sEnc;
        this.aEnc = aEnc;
    }

    get(s: S, a: A): number {
        const sk = this.sEnc(s);
        const ak = this.aEnc(a);
        return this.store.get(sk)?.get(ak) ?? 0;
    }

    set(s: S, a: A, value: number): void {
        const sk = this.sEnc(s);
        const ak = this.aEnc(a);

        let row = this.store.get(sk);
        if (!row) {
            row = new Map<string, number>();
            this.store.set(sk, row);
        }
        row.set(ak, value);
    }

    /** max_a' Q(s, a') over provided actions; returns {a*, q*} or undefined. */
    maxOverActions(s: S, actions: A[]): { action: A; q: number} | undefined {
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
        const sk = this.sEnc(s);
        const row = this.store.get(sk);
        if (!row || row.size === 0) return 0;
        
        let maxQ = -Infinity;
        for (const q of row.values()) {
            if (q > maxQ) maxQ = q;
        }
        return maxQ;
    }

    /** Get all states that have Q-values stored */
    getStates(): Set<string> {
        return new Set(this.store.keys());
    }
}
