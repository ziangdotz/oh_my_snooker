/** Presentation-only normalization; penalty values continue to come from the referee. */
export default function gameNotice({ title, body, kind = 0, pinned = false, id, duration }) {
  const persistent = pinned || title === 'PLACE CUE BALL';
  let heading = title || 'INFORMATION';
  let copy = body || '';
  if (title === 'PLACE CUE BALL') {
    copy =
      'Click inside the D area on the table to place the cue ball. Press <span class="kb">ESC</span> to cancel.';
  }
  if (title === 'FOUL') {
    const penalty = copy.match(/^(-?\d+):\s*(.*)$/s);
    if (penalty) {
      heading = 'FOUL · ' + Math.abs(Number(penalty[1])) + ' PENALTY POINTS';
      copy = penalty[2];
    }
  }
  if (title === 'PERFORMANCE TIP') {
    copy = 'This browser is using WebGL 1. For best results, use a browser with WebGL 2 support.';
  }
  const priority = persistent
    ? 40
    : title === 'PERFORMANCE TIP'
      ? 10
      : kind === 3
        ? 30
        : kind === 2
          ? 20
          : 15;
  const readable = copy.replace(/<[^>]*>/g, '').length;
  const seconds = persistent
    ? Infinity
    : Math.max(
        kind === 3 ? 6 : 4,
        Math.min(12, duration === undefined ? 2 + readable * 0.055 : duration),
      );
  return {
    title: heading,
    body: copy,
    kind: persistent ? 0 : kind,
    pinned: persistent,
    id,
    priority,
    remaining: seconds,
    fingerprint: heading + '\n' + copy,
  };
}
