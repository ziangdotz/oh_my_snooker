export default function collisionEventsModule(module, exports) {
  const i = Object.create(null);
  ((i.FIRST_KISS = 'fk'),
    (i.OUT_OF_BOUNDS = 'oob'),
    (i.POTTED = 'ptd'),
    (i.PREPOT = 'ppt'),
    (module.exports = i));
}
