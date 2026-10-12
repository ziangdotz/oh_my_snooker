import { BUILD_TARGETS } from '../config/project.config.mjs';
import { buildTarget } from '../tooling/build/build-target.mjs';

for (const target of BUILD_TARGETS) {
  await buildTarget(target);
}
