// Starts the backend (port 4000) and the frontend (port 5173) together.
//   npm start        then open http://localhost:5173      stop with Ctrl+C
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// On Windows npm needs a shell. Passing one plain command string (instead of a list of
// arguments) avoids Node's DEP0190 warning. The arguments are fixed, so this is safe.
const isWindows = process.platform === 'win32';
const npmCall = (fn, args, options) => (isWindows ? fn(`npm ${args.join(' ')}`, { ...options, shell: true }) : fn('npm', args, options));

for (const folder of ['backend', 'frontend']) {
  if (!fs.existsSync(path.join(root, folder, 'node_modules'))) {
    console.error(`The ${folder} isn't installed yet. Run this once first:  npm run setup`);
    process.exit(1);
  }
}

const children = [];
function start(label, folder, args) {
  const child = npmCall(spawn, args, { cwd: path.join(root, folder) });
  const prefix = (line) => (line ? `[${label}] ${line}` : line);
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => process.stdout.write(chunk.toString().split('\n').map(prefix).join('\n')));
  }
  child.on('exit', (code) => {
    if (code && code !== 0) console.log(`\n[${label}] stopped (code ${code}). Read the lines above for why.`);
  });
  children.push(child);
}

start('api', 'backend', ['start']);
start('web', 'frontend', ['run', 'dev']);
setTimeout(() => console.log('\n  Open http://localhost:5173 in your browser. Stop everything with Ctrl+C.\n'), 2500);

function stop() {
  for (const child of children) child.kill('SIGINT');
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
