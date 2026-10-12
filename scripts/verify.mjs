import { BUILD_TARGETS } from '../config/project.config.mjs';
import { verifyBuild } from '../tooling/build/verify-build.mjs';

for (const target of BUILD_TARGETS) {
  const manifest = await verifyBuild(target);
  console.log(
    `${target}: ${manifest.files.length} files verified against maintained sources; frozen reference also verified, SHA-256`,
  );
}
