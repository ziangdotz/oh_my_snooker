export default function gameStateModule(module, exports) {
  const i = Object.create(null);
  ((i.ERROR = 0),
    (i.NO_GAME = 1),
    (i.PENDING = 2),
    (i.READY = 4),
    (i.SIMULATING = 8),
    (i.JUDGING = 16),
    (module.exports = i));
}
