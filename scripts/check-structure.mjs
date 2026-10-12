import { verifyProjectStructure } from '../tooling/lib/project-structure.mjs';

const result = await verifyProjectStructure();
console.log(
  `Project structure verified: ${result.requiredDirectories} required directories; ${result.codeFiles} consistently named code files`,
);
