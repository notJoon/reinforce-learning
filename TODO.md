# 🧩 P0 — ENV/Reward/Logging/Determinism Contract

**Goal**
Define a gym-like environment contract (reset/step/close/seed), observation schema, action mask, reward shaping toggles, JSONL logging, and determinism guards.

**Scope**

* Standardize `Env` interface: `reset()`, `step(action)`, `close()`, `seed(s)`.
* Observation schema: goal text, meta (goal depth, subgoal count), optional hints.
* **Action Mask**: shape + semantics (`boolean[]` or ids).
* Reward policy: `solve`, `invalid`, `timeout`, `step_cost` (shaping on/off).
* JSONL trajectory format + version hashing (engine/dataset/seed).
* Timeouts + deterministic behavior guidelines.

**Acceptance Criteria (DoD)**

* All current examples run under the new `Env` contract and emit valid JSONL logs.
* A minimal `docs/ENV.md` and `docs/REWARD.md` exist and match implementation.
* Seeded runs are reproducible (TTPS and success\@1 variance within agreed bound).

**Tasks**

* [ ] Define TypeScript types for `Observation`, `Action`, `ActionMask`, `Info`.
* [ ] Implement reward presets: `default`, `shaping-lite`, `strict`.
* [ ] Implement JSONL logger with schema validation.
* [ ] Add run metadata: `{engine, dataset, env_version, algo_version, seed}`.
* [ ] Add timeout policy: per-step + per-episode.
* [ ] Update all `examples/` to new contract.
* [ ] Write docs: `ENV.md`, `REWARD.md`, `LOGGING.md`.

**Tests (What to verify)**

* **Unit**

  * [ ] Observation validator rejects malformed observations; accepts valid ones.
  * [ ] ActionMask length matches action space; mask respected in `step`.
  * [ ] Rewards follow the selected preset exactly (table-driven checks).
* **Integration**

  * [ ] Given a fixed seed, two runs produce identical JSONL (hash/line count).
  * [ ] Timeout triggers consistent `done=true` with `info.reason='timeout'`.
* **Property**

  * [ ] For any episode, `sum(rewards)` is bounded and monotonic wrt shaping toggle.
  * [ ] Log schema evolvability: older logs are readable with current schema (semver).

**Risks / Mitigations**

* Ambiguous env variants → Keep optional fields with sensible defaults, document invariants.

**Metrics**

* Log validity rate, determinism variance (success\@1 stddev), schema drift incidents.

---

# 🧠 P1 — Stabilized Q-Learning (Double Q, n-step / Q(λ), Prioritized Replay, Softmax Exploration)

**Goal**
Reduce Q overestimation and handle sparse/delayed rewards typical in proof search.

**Scope**

* Add **Double Q-learning** toggle.
* Add **n-step** returns and **Q(λ)** eligibility traces (configurable `n`, `λ`).
* Add **Prioritized Experience Replay** (TD-error based, β annealing).
* Add **Softmax/Boltzmann** exploration option with temperature schedule.

**DoD**

* On a synthetic sparse-reward env, learning curves strictly dominate baseline ε-greedy Q.
* Config toggles documented and usable from examples.

**Tasks**

* [ ] Refactor core for pluggable target computation (1-step / n-step / λ).
* [ ] Implement Double Q switch with clear separation of online/target tables.
* [ ] Implement prioritized replay with stable sampling and bias correction.
* [ ] Implement softmax exploration and scheduling.
* [ ] Add config surface + docs.

**Tests**

* **Unit**

  * [ ] TD-targets correct for 1-step, n-step (k=5), and λ variants on canned sequences.
  * [ ] Prioritized replay sampling is proportional to priority; β-correction unbiased.
* **Integration**

  * [ ] On a toy chain MDP with terminal reward, n-step/λ converges with fewer episodes than 1-step (statistically significant over ≥10 seeds).
  * [ ] Double Q reduces overestimation vs vanilla (evaluate max-Q bias proxy).
* **Property**

  * [ ] Temperature → ∞ approximates uniform; → 0 approaches argmax (within tolerance).

**Risks / Mitigations**

* Instability via skewed replay → start mixed (uniform+prioritized), cap extreme priorities.

**Metrics**

* Success\@1, Episodes-to-solve, TD error distribution, Overestimation bias proxy.

---

# 🎯 P2 — Action Masking & 2-Stage Actions (Tactic then Arguments)

**Goal**
Drastically shrink branching by masking invalid actions and splitting tactic selection from argument instantiation.

**Scope**

* `info.applicable_actions`: mask or id-list for valid actions at each state.
* Introduce **Stage-1 (tactic)** → **Stage-2 (arguments)** pipeline.
* Shaping: light penalty for invalid/degenerate choices, configurable.

**DoD**

* Random policy’s invalid-rate drops significantly vs P0/P1.
* With identical step budgets, success\@K increases vs P1.

**Tasks**

* [ ] Extend Env to expose `applicable_actions` consistently.
* [ ] Design 2-stage controller interface; maintain backward-compat single-stage.
* [ ] Add shaping hooks + docs (`SEARCH.md` cross-references).
* [ ] Update examples to demonstrate 2-stage flow.

**Tests**

* **Unit**

  * [ ] Mask strictly forbids selection of invalid actions in `step`.
  * [ ] Stage-1 and Stage-2 contract: if Stage-1 invalidates Stage-2, episode flags `stuck`.
* **Integration**

  * [ ] On masked env, invalid-rate < unmasked baseline by ≥X%.
  * [ ] End-to-end: same compute budget → higher Pass\@K and lower Steps-to-solve.
* **Property**

  * [ ] Mask monotonicity: tightening the mask never increases invalid transitions.

**Risks / Mitigations**

* Mask computation cost → cache deltas; recompute only on structural state changes.

**Metrics**

* Invalid-action rate, mask coverage (% actions masked), success\@K delta vs baseline.

---

# 🌲 P3 — Tree Search Wrapper (UCT/PUCT) with Q Priors

**Goal**
Combine learned Q with principled tree search (UCT/PUCT). Node = proof state, edge = (tactic, args).

**Scope**

* UCT/PUCT searcher with configurable budget (iterations, depth), exploration constant.
* Prior injection from Q-values; integrate action masks; back-up rules for failure/timeout.
* Rollout & selection temperature control.

**DoD**

* On curriculum-easy tasks, MCTS+Q improves Pass\@K and reduces Steps-to-solve vs P2.
* Search hyperparameters are documented with recommended defaults.

**Tasks**

* [ ] Implement generic tree node/edge storage with transposition keys (state hashes).
* [ ] Integrate Q as priors; ensure masked actions are excluded from expansion.
* [ ] Add pluggable rollout policy (random, ε-greedy, softmax).
* [ ] Log per-episode search stats (visited nodes, branching factors, cutoffs).
* [ ] Document `SEARCH.md` (hyperparameter guidance).

**Tests**

* **Unit**

  * [ ] UCT score respects prior and exploration; masked actions never selected.
  * [ ] Depth/budget limits always honored; back-ups handle failure terminals.
* **Integration**

  * [ ] A/B vs no-search: higher Pass\@K at same wall-time budget on toy-proofs.
  * [ ] Robustness: increase branching by X% → controlled degradation (graceful).
* **Property**

  * [ ] With prior=uniform and infinite budget, behavior approaches standard UCT.

**Risks / Mitigations**

* Search cost explosion → strict budgets, early cut policies, node reuse (transpositions).

**Metrics**

* Pass\@K, Steps-to-solve, Nodes visited per episode, Effective branching factor.

---

# 📈 P4 — Curriculum & Offline Prefill

**Goal**
Warm-start learning and stabilize training by mixing offline trajectories and a difficulty scheduler.

**Scope**

* Curriculum scheduler keyed by proof length / required premises / tactic count.
* Offline buffer loader (JSONL trajectories) with sanitization and priority boost.
* Optional domain randomization (perturb messages/order) to improve robustness.

**DoD**

* Curriculum-on converges faster and to a higher success rate vs curriculum-off.
* Prefill reduces cold-start episodes to first successes.

**Tasks**

* [ ] Define difficulty bins and schedule policies (linear, step, adaptive).
* [ ] Implement offline JSONL loader + filters (duplicate removal, min quality).
* [ ] Integrate with prioritized replay (rare successes higher priority).
* [ ] Add toggles in config; document scheduler behavior.

**Tests**

* **Unit**

  * [ ] Loader enforces schema; de-duplicates by `(state_hash, action, next_hash)`.
  * [ ] Scheduler yields non-decreasing difficulty per policy; adaptive mode bounded.
* **Integration**

  * [ ] Prefill vs no-prefill: measure TTPS (time-to-first-success) and episodes-to-first-success.
  * [ ] Curriculum ablation: show statistically significant Gains over ≥10 seeds.
* **Property**

  * [ ] Randomization never corrupts terminal correctness flags.

**Risks / Mitigations**

* Distribution shift between offline and online → cap offline ratio; gradually anneal.

**Metrics**

* TTPS, Success\@1/K over time, Offline/Online sample mix, Replay utilization.

---

# 📊 P5 — Evaluation Harness, Metrics & Report

**Goal**
Make results comparable and guard against regressions with a standard harness and report.

**Scope**

* Fixed-seed evaluators for micro/mini benchmarks.
* Metrics: Success\@1/K, Proof length, Steps-to-solve, TTPS, failure taxonomy.
* Automated report (markdown/JSON) + threshold-based failure flags for CI.

**DoD**

* Single command produces a benchmark report for a chosen suite.
* CI job fails on regression exceeding thresholds.

**Tasks**

* [ ] Implement evaluation controller (budget, seeds, dataset split).
* [ ] Implement metrics collectors + summary report generator.
* [ ] Define failure taxonomy (`invalid`, `timeout`, `stuck`, `no-progress`).
* [ ] Wire up minimal CI workflow to run a small nightly suite.
* [ ] Document `EVAL.md` with methodology and thresholds.

**Tests**

* **Unit**

  * [ ] Metrics formulas verified on synthetic trajectories.
  * [ ] Report schema validated and backwards compatible.
* **Integration**

  * [ ] Re-running eval with same seed yields same results (within tolerance).
  * [ ] CI regression test: force a controlled degradation → harness flags it.
* **Property**

  * [ ] Increasing compute budget monotonically improves or equals Success\@K.

**Risks / Mitigations**

* Non-determinism from environment → strict seeding, fixed timeouts, engine/version pinning.

**Metrics**

* Eval reproducibility rate, CI stability, time-per-eval, false positive/negative rates.

---

## Optional Extensions (create separate issues if/when needed)

### 🎲 Distributional Q (C51 / Quantile)

* **Value**: uncertainty-aware priors for search.
* **Tests**: distribution calibration on toy env; uncertainty correlates with search width.

### 🧱 Hierarchical RL (Tactic Macros / Options)

* **Value**: compress frequent tactic sequences into macro-actions.
* **Tests**: macro on/off ablation; macro-usage rate vs success\@K.

### 🔎 Premise Retrieval (BM25/TF-IDF)

* **Value**: shrink Stage-2 argument candidates; better scaling to large libraries.
* **Tests**: retrieval\@K vs proof success; latency budgets respected.

---

## Shared “Definition of Done” Checklist (attach to each issue)

* [ ] Public docs updated (`docs/*.md`) with examples.
* [ ] All examples runnable; new config parameters have sensible defaults.
* [ ] Logs validated; schema version bumped if needed.
* [ ] Bench harness shows **no regression** on the smoke suite (fixed seeds).
* [ ] Risk notes & mitigations updated in the issue before closing.

---

### URL (References)

* [https://leandojo.org/](https://leandojo.org/)
* [https://arxiv.org/abs/2306.15626](https://arxiv.org/abs/2306.15626)
* [https://github.com/openai/miniF2F](https://github.com/openai/miniF2F)
* [https://sites.google.com/view/holist/home](https://sites.google.com/view/holist/home)
* [https://proceedings.mlr.press/v97/bansal19a/bansal19a.pdf](https://proceedings.mlr.press/v97/bansal19a/bansal19a.pdf)
* [https://arxiv.org/abs/1804.00595](https://arxiv.org/abs/1804.00595)
