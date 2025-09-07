#!/usr/bin/env node

import { spawn } from 'child_process';
import { readdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function listExamples() {
  const examplesDir = join(dirname(__dirname), 'examples');
  const examples = [];
  
  try {
    const items = await readdir(examplesDir);
    
    for (const item of items) {
      const itemPath = join(examplesDir, item);
      const stats = await stat(itemPath);
      
      if (stats.isDirectory()) {
        // Check if directory contains an entry point file
        const possibleFiles = [`${item}.ts`, `${item}.mjs`, `${item}.js`, 'index.ts', 'index.mjs', 'index.js'];
        
        for (const file of possibleFiles) {
          try {
            await stat(join(itemPath, file));
            examples.push(item);
            break;
          } catch {
            // File doesn't exist, try next
          }
        }
      } else if (item.endsWith('.ts') || item.endsWith('.mjs') || item.endsWith('.js')) {
        // Single file example
        examples.push(basename(item).replace(/\.(ts|mjs|js)$/, ''));
      }
    }
  } catch (err) {
    console.error('Error listing examples:', err.message);
  }
  
  return examples;
}

async function findExampleFile(name) {
  const examplesDir = join(dirname(__dirname), 'examples');
  
  // Check if it's a directory with an entry point
  const dirPath = join(examplesDir, name);
  try {
    const stats = await stat(dirPath);
    if (stats.isDirectory()) {
      // Look for entry point files
      const possibleFiles = [
        join(dirPath, `${name}.ts`),
        join(dirPath, `${name}.mjs`),
        join(dirPath, `${name}.js`),
        join(dirPath, 'index.ts'),
        join(dirPath, 'index.mjs'),
        join(dirPath, 'index.js')
      ];
      
      for (const file of possibleFiles) {
        try {
          await stat(file);
          return file;
        } catch {
          // File doesn't exist, try next
        }
      }
    }
  } catch {
    // Not a directory, check for single file
  }
  
  // Check for single file example
  const possibleExtensions = ['.ts', '.mjs', '.js'];
  for (const ext of possibleExtensions) {
    const filePath = join(examplesDir, `${name}${ext}`);
    try {
      await stat(filePath);
      return filePath;
    } catch {
      // File doesn't exist, try next extension
    }
  }
  
  throw new Error(`Example "${name}" not found`);
}

async function runExample(name, additionalArgs = []) {
  try {
    const file = await findExampleFile(name);
    const ext = file.split('.').pop();
    
    let command, args;
    
    if (ext === 'ts') {
      command = 'npx';
      args = ['tsx', file, ...additionalArgs];
    } else if (ext === 'mjs' || ext === 'js') {
      command = 'node';
      args = [file, ...additionalArgs];
    } else {
      throw new Error(`Unsupported file extension: ${ext}`);
    }
    
    console.log(`Running example: ${name}`);
    console.log(`File: ${file}`);
    if (additionalArgs.length > 0) {
      console.log(`Arguments: ${additionalArgs.join(' ')}`);
    }
    console.log(`Command: ${command} ${args.join(' ')}\n`);
    
    const child = spawn(command, args, { 
      stdio: 'inherit',
      cwd: __dirname
    });
    
    child.on('error', (err) => {
      console.error(`Failed to run example: ${err.message}`);
      process.exit(1);
    });
    
    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.log('\nRun "npm run example" to see available examples');
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    const examples = await listExamples();
    console.log('Usage: npm run example <name> [args...]');
    console.log('       node run-example.js <name> [args...]\n');
    console.log('Examples:');
    console.log('  npm run example knight           # Run with default settings');
    console.log('  npm run example knight 8         # Run with 8x8 board');
    console.log('  npm run example knight 6 10000   # 6x6 board, 10000 episodes\n');
    
    if (examples.length > 0) {
      console.log('Available examples:');
      examples.forEach(e => console.log(`  - ${e}`));
    } else {
      console.log('No examples found.');
    }
    return;
  }
  
  const exampleName = args[0];
  const additionalArgs = args.slice(1);
  await runExample(exampleName, additionalArgs);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});