import createNavigation from '../infrastructure/navigation/interior-navigation.js';
import createTransitionView from '../presentation/ui/interior-transition.js';

/** Coordinates reload recovery without changing the game clock or render loop. */
export default function interiorDesignTransitionModule(module, _exports, loadModule) {
  const fonts = loadModule('presentation/typography/page-fonts');
  const navigation = createNavigation(window);
  let pending = navigation.read();
  let loading = true;
  let timer = null;
  let view = null;
  let handingOff = false;
  function stopWatching() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', fail);
  }
  function getView() {
    if (!view) {
      view = createTransitionView({
        fonts,
        onRetry: () => navigation.retry(pending),
        onBack: () => {
          if (pending) {
            navigation.back(pending);
          } else {
            const previous = new URL(navigation.href);
            previous.searchParams.set('interior', 'interior-design-original');
            previous.searchParams.delete('wall-study');
            navigation.back({ previousHref: previous.href });
          }
        },
      });
    }
    return view;
  }
  function fail(details) {
    if (loading) {
      handingOff = false;
      stopWatching();
      getView().fail(details);
    }
  }
  function onError(event) {
    if (event.error) {
      fail();
    }
  }
  function watch({ handoff = false } = {}) {
    stopWatching();
    getView().loading(pending?.name || 'OH MY SNOOKER', { handoff });
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', fail);
    // A recovery action for stalled resource loading, never an automatic retry.
    timer = setTimeout(fail, 45000);
  }
  if (!pending) {
    navigation.clear();
  }
  watch();
  module.exports = {
    get href() {
      return navigation.href;
    },
    begin(selection) {
      if (pending) {
        return;
      }
      pending = { ...selection, previousHref: navigation.href };
      loading = true;
      handingOff = true;
      watch({ handoff: true });
      // RAF callbacks run before paint. A second frame gives the first frame a
      // rendering opportunity before navigation; the game loop is untouched.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!handingOff) {
            return;
          }
          try {
            pending = navigation.begin(selection);
          } catch {
            fail();
          }
        });
      });
    },
    complete(actualId) {
      if (!loading || handingOff) {
        return;
      }
      if (pending && pending.id !== actualId) {
        fail();
        return;
      }
      stopWatching();
      navigation.clear();
      pending = null;
      loading = false;
      view.hide();
    },
    fail,
  };
}
