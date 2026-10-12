/* PCOL boundary only. Does not patch timing, input, WebGL, physics or camera. */
(() => {
  'use strict';
  // Legacy startup and menus call this API. Keep its signature, disable telemetry.
  window.gtag = function gtag() {};
  const diagnostics = { errors: [], resourceFailures: [] };
  window.addEventListener(
    'error',
    (event) => {
      if (event.target !== window) {
        const url = event.target && (event.target.src || event.target.href);
        if (url) {
          diagnostics.resourceFailures.push(url);
        }
      } else {
        diagnostics.errors.push(event.message);
      }
    },
    true,
  );
  window.addEventListener('unhandledrejection', (event) => {
    diagnostics.errors.push(String(event.reason));
  });
  // Local, passive diagnostics for support and regression tests.
  window.PCOLCompatibility = Object.freeze({ version: '1.0.0', diagnostics });
})();
