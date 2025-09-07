import { QTable } from "./qtable";
import { DiscreteEnv, Policy, QLearningConfig, RolloutOptions, TrainOptions } from "./types";
import { defaultEncoder } from "./utils";

export class QLeaningAgent<S, A> {
    readonly q: QTable<S, A>;

    constructor(
        private readonly env: DiscreteEnv<S, A>,
        private readonly policy: Policy<S, A>,
        private readonly cfg: QLearningConfig,
        sEncoder = defaultEncoder,
        aEncoder = defaultEncoder
    ) {
        this.q = new QTable<S, A>(sEncoder, aEncoder);
    }

    private qValue = (s: S, a: A) => this.q.get(s, a);

    train(opts: TrainOptions<S, A>): void {
        const { episodes, maxStepsPerEpisode = Infinity, onEpisodeEnd, onUpdate } = opts;

        for (let ep = 0; ep < episodes; ep++) {
            // let policy know current episode, if it cares
            (this.policy as any).currentEpisode = ep;

            let s = this.env.reset();
            const phiS = this.env.potential?.(s) ?? 0;

            let totalReward = 0;
            let steps = 0;

            for (; steps < maxStepsPerEpisode; steps++) {
                const legal = this.env.actions(s);
                const a = this.policy.select(s, legal, this.qValue);
                if (a === undefined) break; // terminal state

                const { nextState: s2, reward, done } = this.env.step(s, a);

                // potential-based reward shaping (Ng et al., 1999)
                // [1] https://people.eecs.berkeley.edu/~pabbeel/cs287-fa09/readings/NgHaradaRussell-shaping-ICML1999.pdf
                const shaped = reward +
                    this.cfg.gamma * (this.env.potential?.(s2) ?? 0) - (this.env.potential?.(s) ?? 0);

                // Q-Learning update
                // Q(s,a) ← Q(s,a) + α [ r' + γ max_a' Q(s',a') − Q(s,a) ]
                const oldQ = this.q.get(s, a);
                const maxNext = this.q.maxOverActions(s2, this.env.actions(s2))?.q ?? 0;
                const target = shaped + this.cfg.gamma * maxNext;
                const newQ = oldQ + this.cfg.alpha * (target - oldQ);
                this.q.set(s, a, newQ);

                onUpdate?.({ state: s, action: a, reward, nextState: s2, done, oldQ, newQ });

                totalReward += reward;
                s = s2;
                if (done) break; // episode ends
            }

            onEpisodeEnd?.({ episode: ep, steps, totalReward, terminated: steps < maxStepsPerEpisode });
        }
    }

    /**
     * Greedy (evaluation) rollout variant without exploration.
     * @return path of states visited and total reward accumulated.
     */
    rollOut(startState?: S, opts: RolloutOptions = {}) {
        const maxSteps = opts.maxSteps ?? Infinity;
        let s = startState ?? this.env.reset();

        const path: S[] = [s];
        let totalReward = 0;

        for (let t = 0; t < maxSteps; t++) {
            const actions = this.env.actions(s);
            if (actions.length === 0) break; // terminal state

            const best = this.q.maxOverActions(s, actions);
            if (!best) break; // no legal actions

            const { nextState, reward, done } = this.env.step(s, best.action);
            totalReward += reward;
            s = nextState;
            path.push(s);
            if (done) break;
        }

        return { path, totalReward };
    }
}