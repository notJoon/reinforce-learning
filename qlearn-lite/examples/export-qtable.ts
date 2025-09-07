#!/usr/bin/env ts-node
/**
 * Example: Export Q-table to JSON after training
 */

const fs = require('fs');
const { QLeaningAgent, EpsilonGreedy, ExpEpsilon } = require('../dist/index');

// Simple grid world environment for demonstration
class GridWorld implements DiscreteEnv<[number, number], string> {
    private state: [number, number] = [0, 0];
    private readonly goal: [number, number] = [3, 3];
    private readonly gridSize = 4;

    reset(): [number, number] {
        this.state = [0, 0];
        return [...this.state];
    }

    actions(state: [number, number]): string[] {
        const [x, y] = state;
        if (x === this.goal[0] && y === this.goal[1]) {
            return []; // Terminal state
        }
        
        const acts: string[] = [];
        if (x > 0) acts.push('left');
        if (x < this.gridSize - 1) acts.push('right');
        if (y > 0) acts.push('up');
        if (y < this.gridSize - 1) acts.push('down');
        return acts;
    }

    step(state: [number, number], action: string): { nextState: [number, number]; reward: number; done: boolean } {
        const [x, y] = state;
        let newX = x, newY = y;
        
        switch (action) {
            case 'left': newX = Math.max(0, x - 1); break;
            case 'right': newX = Math.min(this.gridSize - 1, x + 1); break;
            case 'up': newY = Math.max(0, y - 1); break;
            case 'down': newY = Math.min(this.gridSize - 1, y + 1); break;
        }
        
        this.state = [newX, newY];
        const done = newX === this.goal[0] && newY === this.goal[1];
        const reward = done ? 1.0 : -0.01; // Small penalty for each step
        
        return {
            nextState: [...this.state],
            reward,
            done
        };
    }
}

// Custom encoders for grid states and actions
const stateEncoder = (s: [number, number]) => `(${s[0]},${s[1]})`;
const actionEncoder = (a: string) => a;

// Train agent
const env = new GridWorld();
const epsilonSchedule = new ExpEpsilon(1.0, 0.01, 0.005);
const policy = new EpsilonGreedy(epsilonSchedule);
const agent = new QLeaningAgent(
    env,
    policy,
    { alpha: 0.1, gamma: 0.95 },
    stateEncoder,
    actionEncoder
);

console.log('Training Q-learning agent on GridWorld...');
agent.train({
    episodes: 1000,
    maxStepsPerEpisode: 100,
    onEpisodeEnd: (info) => {
        if (info.episode % 100 === 0) {
            console.log(`Episode ${info.episode}: Steps=${info.steps}, Reward=${info.totalReward.toFixed(3)}`);
        }
    }
});

// Export Q-table to JSON
const qtableData = agent.q.toJSON();
const outputPath = 'qtable.json';
fs.writeFileSync(outputPath, JSON.stringify(qtableData, null, 2));
console.log(`\nQ-table exported to ${outputPath}`);

// Also create a simplified version for visualization
const gridData: Record<string, number> = {};
for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
        const state: [number, number] = [x, y];
        const maxQ = agent.q.getStateMaxQ(state);
        gridData[stateEncoder(state)] = maxQ;
    }
}

const gridOutputPath = 'qtable_grid.json';
fs.writeFileSync(gridOutputPath, JSON.stringify(gridData, null, 2));
console.log(`Grid Q-values exported to ${gridOutputPath}`);

console.log('\nTo visualize the Q-table, run:');
console.log(`python ../visualize_qtable.py ${outputPath} -o qtable_heatmap.png -r 4 -c 4`);
