import { DiscreteEnv, QLearningAgent } from "../../../qlearn-lite/src/index";

/** Coordinate in the grid */
export type Pos = { x: number; y: number };

/** Knight relative move */
export type Move = { dx: number; dy: number };

/** Standard chess knight move set */
const KNIGHT_MOVES: Move[] = [
  { dx: 2, dy: 1 },
  { dx: 1, dy: 2 },
  { dx: -1, dy: 2 },
  { dx: -2, dy: 1 },
  { dx: -2, dy: -1 },
  { dx: -1, dy: -2 },
  { dx: 1, dy: -2 },
  { dx: 2, dy: -1 },
];

export interface KnightEnvParams {
  size: number; // board dimension N (N×N)
  start?: Pos; // optional start position (default: {0,0})
  rewardPerStep?: number; // default: +1 when visiting a new square
  penaltyIllegal?: number; // default: -2 when illegal/blocked
  rewardGoal?: number; // default: +100 on complete tour
  /** If true, revisit is disallowed (standard tour). Default: true. */
  forbidRevisit?: boolean;
  /** Enable Warnsdorff-like potential shaping. Default: true. */
  enablePotentialShaping?: boolean;
}

export function createKnightEnv(
  params: KnightEnvParams
): DiscreteEnv<Pos, Move> {
  const N = params.size;
  if (!Number.isInteger(N) || N <= 0) {
    throw new Error(`Invalid board size: ${N}. Expected positive integer.`);
  }

  const start: Pos = params.start ?? { x: 0, y: 0 };
  const rewardPerStep = params.rewardPerStep ?? 1;
  const penaltyIllegal = params.penaltyIllegal ?? -2;
  const rewardGoal = params.rewardGoal ?? 100;
  const forbidRevisit = params.forbidRevisit ?? true;
  const usePotential = params.enablePotentialShaping ?? true;

  function inBounds(p: Pos): boolean {
    return p.x >= 0 && p.x < N && p.y >= 0 && p.y < N;
  }

  let cur: Pos = { ...start };
  let visited = new Set<string>();

  const key = (p: Pos) => `${p.x},${p.y}`;

  const env: DiscreteEnv<Pos, Move> = {
    reset(): Pos {
      cur = { ...start };
      visited = new Set<string>([key(cur)]);
      return cur;
    },

    actions(_: Pos): Move[] {
      const out: Move[] = [];
      for (const m of KNIGHT_MOVES) {
        const next = { x: cur.x + m.dx, y: cur.y + m.dy };
        if (!inBounds(next)) continue;
        if (forbidRevisit && visited.has(key(next))) continue;
        out.push(m);
      }
      return out;
    },

    step(_: Pos, a: Move) {
      const next = { x: cur.x + a.dx, y: cur.y + a.dy };
      if (!inBounds(next)) {
        return { nextState: cur, reward: penaltyIllegal, done: true };
      }
      if (forbidRevisit && visited.has(key(next))) {
        return { nextState: cur, reward: penaltyIllegal, done: true };
      }

      cur = next;
      visited.add(key(next));

      const done = visited.size === N * N;
      const reward = rewardPerStep + (done ? rewardGoal : 0);
      return { nextState: cur, reward, done };
    },

    /** Warnsdorff-like potential: prefer squares with fewer onward moves */
    potential(state: Pos): number {
      if (!usePotential) return 0;
      let degree = 0;
      for (const m of KNIGHT_MOVES) {
        const nxt = { x: state.x + m.dx, y: state.y + m.dy };
        if (!inBounds(nxt)) continue;
        if (forbidRevisit && visited.has(key(nxt))) continue;
        degree++;
      }
      // Fewer onward options → lower potential (guide exploration)
      return -degree;
    },
  };

  return env;
}
