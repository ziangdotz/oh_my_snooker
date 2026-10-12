/** Apply the same architectural boundaries to factory and native ESM dependencies. */
export function assertDependencyBoundary(from, to) {
  if (
    from.startsWith('src/domain/') &&
    !to.startsWith('src/domain/') &&
    !to.startsWith('src/shared/')
  ) {
    throw new Error(`Domain dependency violation: ${from} -> ${to}`);
  }
  if (
    from.startsWith('src/shared/') &&
    !to.startsWith('src/shared/') &&
    !to.startsWith('src/domain/math/')
  ) {
    throw new Error(`Shared dependency violation: ${from} -> ${to}`);
  }
}
