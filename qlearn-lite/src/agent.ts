import { EpisodeAwarePolicy } from './policy.js';
import { QTable } from './qtable.js';
import {
  DiscreteEnv,
  Encoder,
  Policy,
  QLearningConfig,
  RolloutOptions,
  TrainOptions,
} from './types.js';
import { defaultEncoder } from './utils.js';

export class QLearningAgent<S, A> {
  readonly q: QTable<S, A>;

  constructor(
    private readonly env: DiscreteEnv<S, A>,
    private readonly policy: Policy<S, A>,
    private readonly cfg: QLearningConfig,
    sEncoder: Encoder<S> = defaultEncoder,
    aEncoder: Encoder<A> = defaultEncoder,
  ) {
    this.q = new QTable<S, A>(sEncoder, aEncoder);
  }

  private qValue = (s: S, a: A) => this.q.get(s, a);

  train(opts: TrainOptions<S, A>): void {
    const { episodes, maxStepsPerEpisode = Infinity, onEpisodeEnd, onUpdate } = opts;

    for (let ep = 0; ep < episodes; ep++) {
      this.updatePolicyEpisode(ep);
      const { totalReward, steps } = this.runEpisode(maxStepsPerEpisode, onUpdate);
      onEpisodeEnd?.({
        episode: ep,
        steps,
        totalReward,
        terminated: steps < maxStepsPerEpisode,
      });
    }
  }

  private updatePolicyEpisode(episode: number): void {
    if (this.isEpisodeAwarePolicy(this.policy)) {
      this.policy.currentEpisode = episode;
    }
  }

  private isEpisodeAwarePolicy(policy: Policy<S, A>): policy is EpisodeAwarePolicy<S, A> {
    return 'currentEpisode' in policy;
  }

  private runEpisode(
    maxSteps: number,
    onUpdate?: TrainOptions<S, A>['onUpdate'],
  ): { totalReward: number; steps: number } {
    let state = this.env.reset();
    let totalReward = 0;
    let steps = 0;

    for (; steps < maxSteps; steps++) {
      const legal = this.env.actions(state);
      const action = this.policy.select(state, legal, this.qValue);
      if (action === undefined) break;

      const { nextState, reward, done } = this.env.step(state, action);
      const shapedReward = this.getShapedReward(state, nextState, reward);

      this.updateQValue(state, action, nextState, shapedReward, reward, done, onUpdate);

      totalReward += reward;
      state = nextState;
      if (done) break;
    }

    return { totalReward, steps };
  }

  private getShapedReward(state: S, nextState: S, reward: number): number {
    if (!this.env.potential) return reward;

    const currentPotential = this.env.potential(state);
    const nextPotential = this.env.potential(nextState);
    return reward + this.cfg.gamma * nextPotential - currentPotential;
  }

  private updateQValue(
    state: S,
    action: A,
    nextState: S,
    shapedReward: number,
    originalReward: number,
    done: boolean,
    onUpdate?: TrainOptions<S, A>['onUpdate'],
  ): void {
    const oldQ = this.q.get(state, action);
    const maxNext = this.q.maxOverActions(nextState, this.env.actions(nextState))?.q ?? 0;
    const target = shapedReward + this.cfg.gamma * maxNext;
    const newQ = oldQ + this.cfg.alpha * (target - oldQ);

    this.q.set(state, action, newQ);

    onUpdate?.({
      state,
      action,
      reward: originalReward,
      nextState,
      done,
      oldQ,
      newQ,
    });
  }

  /**
   * Greedy (evaluation) rollout variant without exploration.
   * @return path of states visited and total reward accumulated.
   */
  rollout(startState?: S, opts: RolloutOptions = {}) {
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
