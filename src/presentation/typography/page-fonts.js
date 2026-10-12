/** One font readiness result shared by startup and loading/recovery surfaces. */
export default function pageFontsModule(module) {
  let readiness = null;
  module.exports = {
    ready() {
      if (!readiness) {
        readiness = new Promise((resolve) => {
          // Fonts may stall independently of the game; settle once to a readable fallback.
          const timer = setTimeout(() => resolve('fallback'), 10000);
          Promise.resolve()
            .then(() => {
              if (!document.fonts) {
                return [];
              }
              return Promise.all([
                document.fonts.load('600 16px "Saira ExtraCondensed SemiBold"'),
                document.fonts.load('700 16px "Saira ExtraCondensed Bold"'),
              ]);
            })
            .then(
              (families) =>
                families.length === 2 && families.every((faces) => faces.length > 0)
                  ? 'ready'
                  : 'fallback',
              () => 'fallback',
            )
            .then((state) => {
              clearTimeout(timer);
              resolve(state);
            });
        });
      }
      return readiness;
    },
  };
}
