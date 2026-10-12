// Recorded ball layout: time, held duration, active/sleep, x, y, z, shadow alpha.
// Read immutable recording bytes, without consulting the renderer's cached frame indices.
export function recordedBallAt(track, time) {
  const { data, stride, totalFrames } = track;
  if (stride !== 7 || totalFrames < 1 || data.length !== stride * totalFrames) {
    throw new Error('Unsupported or empty ball recording');
  }
  let frame = 0;
  while (frame + 1 < totalFrames && data[(frame + 1) * stride] <= time) {
    frame++;
  }
  const left = frame * stride;
  const right = Math.min(frame + 1, totalFrames - 1) * stride;
  const holdEnd = data[left] + data[left + 1];
  const interval = data[right] - holdEnd;
  const elapsed = time - holdEnd;
  const ratio = interval < 1e-6 || elapsed < 1e-6 ? 0 : elapsed / interval;
  return {
    visible: data[left + 2] !== 0,
    position: [3, 4, 5].map(
      (offset) => data[left + offset] + (data[right + offset] - data[left + offset]) * ratio,
    ),
  };
}
