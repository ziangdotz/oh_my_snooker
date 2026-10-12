/** Browser capability gate and launch, independent of gameplay composition. */
export default function launchGame(_module, _exports, loadModule) {
  const interiorTransition = loadModule('application/interior-transition');
  const fonts = loadModule('presentation/typography/page-fonts');
  loadModule('adapters/browser/webgl-detector');
  const browser = loadModule('adapters/browser/browser-detector');
  const telemetry = window.gtag;
  const fail = (label, title, message) => {
    interiorTransition.fail({ title, message });
    telemetry('event', 'startup', { event_category: 'game_page', event_label: label, value: 0 });
  };
  if (browser.mobile || browser.tablet) {
    fail(
      'mobile',
      'UNSUPPORTED DEVICE...',
      'MOBILE DEVICES ARE TEMPORARILY NOT SUPPORTED. PLEASE VISIT THIS SITE ON DESKTOP, AND USE ONE OF THE LATEST MODERN BROWSERS TO PLAY THIS GAME.',
    );
  } else if (browser.msie) {
    fail(
      'ie',
      'UNSUPPORTED BROWSER...',
      'YOUR CURRENT BROWSER IS NOT SUPPORTED. PLEASE USE ONE OF THE FOLLOWING SUPPORTED BROWSERS AND TRY AGAIN.',
    );
  } else if (!window.Modernizr.webgl) {
    fail(
      'no_webgl',
      'UNSUPPORTED BROWSER...',
      'IT LOOKS THAT THE CURRENT BROWSER DOES NOT SUPPORT WEBGL. PLEASE CHANGE TO ANOTHER WEBGL SUPPORTED BROWSER TO PLAY THIS GAME. ( SUCH AS BELOW, LATEST FIREFOX IS RECOMMENDED )',
    );
  } else {
    Promise.all([loadModule.e('render-engine'), loadModule.e('snooker-game')])
      .then(async () => {
        await fonts.ready();
        const GameApplication = loadModule('application/compose-game').default;
        telemetry('event', 'startup', {
          event_category: 'game_page',
          event_label: 'success',
          value: 1,
        });
        const application = new GameApplication();
        application.launch({
          displayName: 'PLAYER 1',
          userId: 'user',
        });
      })
      .catch((error) => {
        console.error(error);
        fail(
          'launch_error',
          'LAUNCH ERROR...',
          'AN ERROR OCCURRED WHEN LAUNCHING THE GAME, PLEASE TRY AGAIN LATER...',
        );
      });
  }
}
