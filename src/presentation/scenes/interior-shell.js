/** Build real wall openings rather than covering an intact wall with a window image. */
export default function buildInteriorShell(
  box,
  bounds,
  definition,
  wall = 'wall',
  floor = 'floor',
) {
  const { left, right, front, back, ceiling } = bounds;
  const center = (left + right) / 2;
  const ground = box('floor', [13.2, 0.1, 12.2], [center, -0.05, 2], floor, 0, false);
  box('ceiling', [13.2, 0.12, 12.2], [center, ceiling + 0.06, 2], 'ceiling');
  box('front-wall', [13.2, ceiling, 0.18], [center, ceiling / 2, front - 0.09], wall);
  box('right-wall', [0.18, ceiling, 12], [right + 0.09, ceiling / 2, 2], wall);
  const doorX = definition.doorX;
  for (const [start, end] of [
    [left, doorX - 0.65],
    [doorX + 0.65, right],
  ]) {
    box(
      'back-wall',
      [end - start, ceiling, 0.18],
      [(start + end) / 2, ceiling / 2, back + 0.09],
      wall,
    );
  }
  box(
    'door-wall-header',
    [1.3, ceiling - 2.38, 0.18],
    [doorX, (ceiling + 2.38) / 2, back + 0.09],
    wall,
  );
  let previous = front;
  for (const z of definition.windows) {
    const start = z - 1.025;
    const end = z + 1.025;
    box(
      'window-wall-pier',
      [0.18, ceiling, start - previous],
      [left - 0.09, ceiling / 2, (previous + start) / 2],
      wall,
    );
    box('window-wall-apron', [0.18, 1.2, 2.05], [left - 0.09, 0.6, z], wall);
    box(
      'window-wall-header',
      [0.18, ceiling - 2.78, 2.05],
      [left - 0.09, (ceiling + 2.78) / 2, z],
      wall,
    );
    previous = end;
  }
  box(
    'window-wall-pier',
    [0.18, ceiling, back - previous],
    [left - 0.09, ceiling / 2, (previous + back) / 2],
    wall,
  );
  return ground;
}
