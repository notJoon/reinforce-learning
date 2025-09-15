import { QLearningAgent } from "../../qlearn-lite/src/agent";
import { EpsilonGreedy, ExpEpsilon } from "../../qlearn-lite/src/policy";
import { createKnightEnv, Pos, Move } from "./src/env";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

// Read N from argv or default 5
const DEFAULT_N = 5;
const N = Number(process.argv[2] ?? DEFAULT_N);

const env = createKnightEnv({
  size: N,
  start: { x: 0, y: 0 },
  rewardPerStep: 1,
  penaltyIllegal: -2,
  rewardGoal: 100,
  forbidRevisit: true,
  enablePotentialShaping: true,
});

// ε schedule & agent
const eps = new ExpEpsilon(0.8, 0.02, 3.0 / 60000);
const policy = new EpsilonGreedy<Pos, Move>(eps);
const agent = new QLearningAgent<Pos, Move>(
  env,
  policy,
  { alpha: 0.2, gamma: 0.98 },
  (p) => `${p.x},${p.y}`,
  (m) => `${m.dx},${m.dy}`
);

// Train
let avg = 0;
agent.train({
  episodes: 60000,
  maxStepsPerEpisode: 300,
  onEpisodeEnd: ({ episode, totalReward }) => {
    avg = 0.995 * avg + 0.005 * totalReward;
    if (episode % 5000 === 0) {
      console.log(`ep=${episode} avgR≈${avg.toFixed(2)}`);
    }
  },
});

// Greedy rollout
const { path } = agent.rollout();
console.log(`Board ${N}×${N} — Path length: ${path.length}/${N * N}`);
console.log(path.map((p, i) => `${i + 1}:(${p.x},${p.y})`).join(" -> "));

// Save path data for visualization
const pathData = {
  board_size: N,
  start: { x: 0, y: 0 },
  path: path.map((p, i) => ({ step: i + 1, x: p.x, y: p.y })),
  total_squares: N * N,
  visited_squares: path.length
};

// Get the directory of the current module
const currentDir = dirname(fileURLToPath(import.meta.url));
const dataPath = join(currentDir, "path_data.json");
const imagePath = join(currentDir, "image.png");
const qtablePath = join(currentDir, "qtable.json");
const qtableGridPath = join(currentDir, "qtable_grid.json");
const qtableHeatmapPath = join(currentDir, "qtable_heatmap.png");

writeFileSync(dataPath, JSON.stringify(pathData, null, 2));
console.log(`\nPath data saved to: ${dataPath}`);

// Save Q-table for visualization
const qtableData = agent.q.toJSON();
writeFileSync(qtablePath, JSON.stringify(qtableData, null, 2));
console.log(`Q-table saved to: ${qtablePath}`);

// Create simplified grid format (max Q-value per state)
const qtableGrid: { [key: string]: number } = {};
for (const [stateKey, actions] of Object.entries(qtableData)) {
  const maxQ = Math.max(...Object.values(actions as { [key: string]: number }));
  qtableGrid[stateKey] = maxQ;
}
writeFileSync(qtableGridPath, JSON.stringify(qtableGrid, null, 2));
console.log(`Q-table grid saved to: ${qtableGridPath}`);

// Check if visualization flag is set
const shouldVisualize = process.argv.includes("--visualize") || process.argv.includes("-v");

if (shouldVisualize) {
  console.log("\nGenerating visualizations...");
  
  // Generate path visualization
  const pythonScript = join(currentDir, "visualize.py");
  const pathViz = spawn("python3", [pythonScript, dataPath, imagePath]);
  
  pathViz.on("close", (code) => {
    if (code === 0) {
      console.log(`Path visualization saved to: ${imagePath}`);
    } else {
      console.error(`Path visualization failed with code ${code}`);
    }
  });
  
  // Generate Q-table heatmap
  const qtableScript = join(dirname(dirname(currentDir)), "visualize_qtable.py");
  const qtableViz = spawn("python3", [
    qtableScript, 
    qtableGridPath, 
    "-o", qtableHeatmapPath,
    "-r", String(N),
    "-c", String(N),
    "-t", `Q-values for Knight's Tour (${N}×${N})`
  ]);
  
  qtableViz.stdout.on("data", (data) => {
    console.log(`${data}`);
  });
  
  qtableViz.stderr.on("data", (data) => {
    console.error(`Q-table viz error: ${data}`);
  });
  
  qtableViz.on("close", (code) => {
    if (code === 0) {
      console.log(`Q-table heatmap saved to: ${qtableHeatmapPath}`);
    } else {
      console.error(`Q-table visualization failed with code ${code}`);
    }
  });
}
