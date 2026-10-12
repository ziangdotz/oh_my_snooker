import { measureInteriorPerformance } from '../tooling/measurement/interior-performance.mjs';

const args = process.argv.slice(2);
const options = { runs: 3, seconds: 6, browser: 'chrome', dpr: 2 };
for (let index = 0; index < args.length; index += 2) {
  const key = args[index]?.slice(2);
  if (
    !args[index].startsWith('--') ||
    !['label', 'runs', 'seconds', 'browser', 'dpr', 'design', 'target'].includes(key) ||
    !args[index + 1]
  ) {
    throw new Error(
      'Usage: node scripts/measure-interior-performance.mjs --label LABEL [--runs 1..10] [--seconds 3..30] [--browser chrome|edge] [--dpr 1|2] [--design interior-design-ID] [--target source|development]',
    );
  }
  options[key] = ['runs', 'seconds', 'dpr'].includes(key)
    ? Number(args[index + 1])
    : args[index + 1];
}
if (
  !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(options.label || '') ||
  !Number.isInteger(options.runs) ||
  options.runs < 1 ||
  options.runs > 10 ||
  !Number.isInteger(options.seconds) ||
  options.seconds < 3 ||
  options.seconds > 30 ||
  !['chrome', 'edge'].includes(options.browser) ||
  ![1, 2].includes(options.dpr) ||
  (options.design && !/^interior-design-(?:original|001|002|003)$/.test(options.design)) ||
  (options.target && !['source', 'development'].includes(options.target))
) {
  throw new Error('Invalid interior performance options');
}
await measureInteriorPerformance(options);
