#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve } from 'path';
import { existsSync } from 'fs';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
RL Dashboard CLI

Usage:
  rl-dashboard <demo-script> [args...]

Examples:
  rl-dashboard ../demo/gridworld/gridworld.ts
  rl-dashboard ../demo/knight/knight.ts 6

Options:
  --help, -h    Show this help message
`);
  process.exit(0);
}

const scriptPath = resolve(args[0]);

if (!existsSync(scriptPath)) {
  console.error(`Error: Script file not found: ${scriptPath}`);
  process.exit(1);
}

console.log(`Starting interactive dashboard for: ${scriptPath}`);
console.log('Note: The script must be modified to use InteractiveWrapper\n');

// Run the script with tsx
const child = spawn('npx', ['tsx', scriptPath, ...args.slice(1)], {
  stdio: 'inherit',
  env: { ...process.env, USE_DASHBOARD: 'true' },
});

child.on('error', (err) => {
  console.error(`Failed to start script: ${err.message}`);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
