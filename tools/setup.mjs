// First-time setup: installs both halves of the app and fills the database with demo data.
//   npm run setup
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// On Windows npm needs a shell. Passing one plain command string (instead of a list of
// arguments) avoids Node's DEP0190 warning. The arguments are fixed, so this is safe.
const isWindows = process.platform === 'win32';
const npmCall = (fn, args, options) => (isWindows ? fn(`npm ${args.join(' ')}`, { ...options, shell: true }) : fn('npm', args, options));

function run(label, folder, args) {
  console.log(`\n== ${label}`);
  const result = npmCall(spawnSync, args, { cwd: path.join(root, folder), stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\nSetup stopped at "${label}". Read the message above, fix it, then run npm run setup again.`);
    process.exit(result.status ?? 1);
  }
}

run('Installing the backend', 'backend', ['install']);
run('Installing the frontend', 'frontend', ['install']);
run('Preparing the database and demo data', 'backend', ['run', 'seed']);
console.log('\nAll set. Start the app with:  npm start');
