import path from 'node:path';
import { ROOT } from '../../config/project.config.mjs';

export const ARTIFACT_CATEGORIES = ['testing'];
export const DESIGN_IDS = [
  'interior-design-original',
  'interior-design-001',
  'interior-design-002',
  'interior-design-003',
];

export function artifactDirectory(category, ...segments) {
  if (
    !ARTIFACT_CATEGORIES.includes(category) ||
    segments.some((segment) => !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(segment))
  ) {
    throw new Error('Invalid artifact directory');
  }
  return path.join(ROOT, 'artifacts', category, ...segments);
}

export function designDirectory(category, designId, ...segments) {
  if (!DESIGN_IDS.includes(designId)) {
    throw new Error('Unknown interior design: ' + designId);
  }
  return artifactDirectory(category, 'designs', designId, ...segments);
}
