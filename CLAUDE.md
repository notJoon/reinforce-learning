# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based reinforcement learning playground containing `qlearn-lite`, a lightweight tabular Q-learning library for discrete RL environments.

## Build Commands

### Development Setup
```bash
# Install dependencies (from qlearn-lite directory)
cd qlearn-lite
npm install

# Build TypeScript to JavaScript
npm run build

# Run Knight's Tour example (when available)
npm run example:knight
```

### Nix Development Environment
```bash
# Enter development shell with Node.js, TypeScript, and npm
nix develop

# Or use shell.nix
nix-shell
```

## Architecture

### Core Components

The qlearn-lite library implements tabular Q-learning with a modular architecture:

- **DiscreteEnv Interface** (`types.ts`): Defines the environment contract with `reset()`, `actions()`, `step()`, and optional `potential()` for reward shaping
- **QTable** (`qtable.ts`): Stores Q-values with string-based state-action encoding for arbitrary discrete spaces
- **QLearningAgent** (`agent.ts`): Main agent class that:
  - Performs Q-learning updates with configurable α (learning rate) and γ (discount)
  - Supports potential-based reward shaping (Ng et al., 1999)
  - Provides `train()` for learning and `rollOut()` for greedy evaluation
- **Policy** (`policy.ts`): Action selection strategies (ε-greedy, softmax, etc.)
- **Schedules** (`schedules.ts`): Parameter scheduling (e.g., epsilon decay)

### Key Design Patterns

1. **Generic Type System**: Uses TypeScript generics `<S, A>` for flexible state/action types
2. **Encoder Pattern**: Serializes states/actions to strings for Q-table keys via `Encoder<T>` functions
3. **Callback Hooks**: Training provides `onEpisodeEnd` and `onUpdate` callbacks for monitoring
4. **Separation of Concerns**: Environment, agent, policy, and value storage are decoupled

## TypeScript Configuration

- Target: ES2020 modules
- Strict mode enabled
- Source in `src/`, compiled output to `dist/`
- Declaration files generated for type definitions