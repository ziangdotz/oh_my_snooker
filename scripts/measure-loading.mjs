import { measureLoading } from '../tooling/measurement/loading-profile.mjs';

const args = process.argv.slice(2);
if (
  (args.length !== 2 && args.length !== 4) ||
  args[0] !== '--label' ||
  !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(args[1]) ||
  (args.length === 4 && args[2] !== '--runs')
) {
  throw new Error('Usage: node scripts/measure-loading.mjs --label LABEL [--runs 1..20]');
}
const runs = args.length === 4 ? Number(args[3]) : 5;
if (!Number.isInteger(runs) || runs < 1 || runs > 20) {
  throw new Error('Runs must be an integer from 1 to 20');
}
await measureLoading({ label: args[1], runs });
