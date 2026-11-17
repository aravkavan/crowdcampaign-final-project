// Puts the Taronja demo campaign back to its starting state, so the demo can be run again.
// Removes that one campaign (with its ideas, scores and pictures) and recreates it.
//   npm run reset-demo
import { hasDatabaseUrl, query } from '../src/db.js';
import { explainStartupError } from '../src/lib/startupErrors.js';
import { migrate } from '../src/migrate.js';
import { DEMO_CAMPAIGNS } from './demo-data.js';

const demo = DEMO_CAMPAIGNS.find((c) => c.brand === 'Taronja Juice');

try {
  if (!hasDatabaseUrl()) throw Object.assign(new Error('DATABASE_URL is missing'), { code: 'NO_DATABASE_URL' });
  await migrate();
  const { rowCount } = await query(
    `DELETE FROM campaigns c USING users u
      WHERE c.organizer_id = u.id AND lower(u.username) = 'nyugrader' AND c.title = $1`,
    [demo.title],
  );
  console.log(rowCount ? 'Removed the used demo campaign.' : 'No used demo campaign found.');
  await import('./seed.js'); // recreates it fresh (and closes the database connection)
} catch (err) {
  console.error(explainStartupError(err));
  process.exitCode = 1;
}
