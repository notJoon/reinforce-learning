# RL Logger

A lightweight JSONL trajectory logger for reinforcement learning experiments.

## Features

- 📝 **JSONL Format** - One JSON object per line for easy streaming and analysis
- 🔍 **Schema Validation** - Ensures data consistency with built-in validators
- 🎯 **Type Safety** - Full TypeScript support with generics for action types
- 🚀 **Async I/O** - Non-blocking file operations
- 📊 **Metadata Support** - Track experiment configuration and reproducibility info

## Installation

```bash
npm install rl-logger
```

## Quick Start

```typescript
import { JSONLLogger, TrajectoryEntry, RunMetadata } from 'rl-logger';

// Create a logger (with typed actions)
const logger = new JSONLLogger<string>('experiment.jsonl');

// Write experiment metadata
const metadata: RunMetadata = {
  engine: 'my-rl-framework',
  dataset: 'cartpole-v1',
  envVersion: '1.0.0',
  algoVersion: '1.0.0',
  seed: 42,
  timestamp: Date.now()
};
logger.writeMetadata(metadata);

// Log trajectory data
const entry: TrajectoryEntry<string> = {
  timestamp: Date.now(),
  episode: 1,
  step: 0,
  state: {
    goalText: 'Balance the pole',
    meta: {
      goalDepth: 0,
      subgoalCount: 0
    }
  },
  action: 'move_left',
  reward: 1.0,
  nextState: {
    goalText: 'Balance the pole',
    meta: {
      goalDepth: 0,
      subgoalCount: 0
    }
  },
  done: false,
  info: {
    episodeSteps: 1,
    totalSteps: 1,
    poleAngle: 0.02,
    cartPosition: -0.05
  }
};
logger.writeEntry(entry);

// Always close when done
await logger.close();
```

## API Reference

### `JSONLLogger<TAction>`

Main logger class with generic action type support.

#### Constructor
```typescript
new JSONLLogger<TAction>(filePath: string)
```

#### Methods

##### `writeMetadata(metadata: RunMetadata): void`
Write experiment metadata (typically called once at the start).

##### `writeEntry(entry: TrajectoryEntry<TAction>): void`
Write a trajectory entry for a single environment step.

##### `close(): Promise<void>`
Close the logger and ensure all data is written. Always await this!

### Types

#### `RunMetadata`
```typescript
interface RunMetadata {
  engine: string;      // RL library/framework name
  dataset: string;     // Environment or dataset name
  envVersion: string;  // Environment version
  algoVersion: string; // Algorithm version
  seed: number;        // Random seed for reproducibility
  timestamp: number;   // Unix timestamp in milliseconds
  [key: string]: string | number; // Additional custom fields
}
```

#### `TrajectoryEntry<TAction>`
```typescript
interface TrajectoryEntry<TAction> {
  timestamp: number;    // Unix timestamp in milliseconds
  episode: number;      // Episode number
  step: number;         // Step within episode
  state: Observation;   // Current state observation
  action: TAction;      // Action taken
  reward: number;       // Reward received
  nextState: Observation; // Next state observation
  done: boolean;        // Is episode finished?
  info: StepInfo;       // Additional step information
}
```

#### `Observation`
```typescript
interface Observation {
  goalText: string;     // Description of current goal/state
  meta: {
    goalDepth: number;    // Depth in goal hierarchy
    subgoalCount: number; // Number of subgoals
  };
  hints?: string[];     // Optional hints
}
```

#### `StepInfo`
```typescript
interface StepInfo {
  reason?: 'timeout' | 'success' | 'invalid' | 'stuck';
  episodeSteps: number; // Steps in current episode
  totalSteps: number;   // Total steps across all episodes
  [key: string]: unknown; // Additional custom fields
}
```

## Output Format

The logger produces JSONL files where each line is a valid JSON object:

```jsonl
{"type":"metadata","data":{"engine":"qlearn","dataset":"maze-v1","envVersion":"1.0.0","algoVersion":"1.0.0","seed":42,"timestamp":1234567890}}
{"type":"trajectory","data":{"timestamp":1234567891,"episode":1,"step":0,"state":{"goalText":"Find exit","meta":{"goalDepth":0,"subgoalCount":0}},"action":"north","reward":-1,"nextState":{"goalText":"Find exit","meta":{"goalDepth":0,"subgoalCount":0}},"done":false,"info":{"episodeSteps":1,"totalSteps":1}}}
```

## Reading Log Files

```typescript
import * as fs from 'fs';
import * as readline from 'readline';

async function readLog(filename: string) {
  const fileStream = fs.createReadStream(filename);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const entry = JSON.parse(line);
    
    if (entry.type === 'metadata') {
      console.log('Experiment:', entry.data.engine, entry.data.dataset);
    } else if (entry.type === 'trajectory') {
      console.log(`Episode ${entry.data.episode}, Step ${entry.data.step}: ${entry.data.action} -> ${entry.data.reward}`);
    }
  }
}
```

## Integration Examples

### With Custom RL Loop

```typescript
const logger = new JSONLLogger<number>('training.jsonl');

// Training loop
for (let episode = 0; episode < 100; episode++) {
  let state = env.reset();
  let step = 0;
  
  while (!done) {
    const action = agent.selectAction(state);
    const { nextState, reward, done } = env.step(action);
    
    logger.writeEntry({
      timestamp: Date.now(),
      episode,
      step,
      state: convertToObservation(state),
      action,
      reward,
      nextState: convertToObservation(nextState),
      done,
      info: {
        episodeSteps: step + 1,
        totalSteps: episode * 1000 + step + 1
      }
    });
    
    state = nextState;
    step++;
  }
}

await logger.close();
```

### With Callbacks

```typescript
class LoggingCallback {
  private logger: JSONLLogger<Action>;
  private episode = 0;
  private step = 0;
  private totalSteps = 0;

  constructor(filename: string) {
    this.logger = new JSONLLogger(filename);
  }

  onEpisodeStart() {
    this.step = 0;
    this.episode++;
  }

  onStep(transition: Transition) {
    this.logger.writeEntry({
      timestamp: Date.now(),
      episode: this.episode,
      step: this.step,
      state: transition.state,
      action: transition.action,
      reward: transition.reward,
      nextState: transition.nextState,
      done: transition.done,
      info: {
        episodeSteps: this.step + 1,
        totalSteps: ++this.totalSteps
      }
    });
    this.step++;
  }

  async close() {
    await this.logger.close();
  }
}
```

## Error Handling

The logger validates all data before writing:

```typescript
try {
  logger.writeEntry({
    // Missing required fields
    action: 'up'
  } as any);
} catch (error) {
  console.error('Validation failed:', error.message);
  // "timestamp must be a number"
}
```

## Performance Tips

1. **Batch writes** - The logger buffers writes automatically
2. **Close properly** - Always `await logger.close()` to ensure data is flushed
3. **Async operations** - File I/O is non-blocking
4. **Compression** - JSONL compresses well with gzip if needed

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.