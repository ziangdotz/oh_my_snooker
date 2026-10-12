export default function simulationEventsModule(module, exports) {
  const i = Object.create(null);
  ((i.ERROR = 'error'), (i.SYNCHRONIZED = 'synchronized'), (module.exports = i));
}
