import createNavigation from '../infrastructure/navigation/interior-navigation.js';
import createTransitionView from '../presentation/ui/interior-transition.js';

/** Coordinates in-page venue switching and cold-start recovery. */
export default function interiorDesignTransitionModule(module, _exports, loadModule) {
  const fonts = loadModule('presentation/typography/page-fonts');
  const navigation = createNavigation(window);
  let pending = navigation.read();
  let loading = true;
  let timer = null;
  let revealTimer = null;
  let view = null;
  let handingOff = false;
  let live = null;
  let generation = 0;
  function stopWatching() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (revealTimer !== null) {
      clearTimeout(revealTimer);
      revealTimer = null;
    }
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', fail);
  }
  function getView() {
    if (!view) {
      view = createTransitionView({
        fonts,
        onRetry: () => {
          if (live) {
            live.quick = false;
            runLive();
          } else {
            navigation.retry(pending);
          }
        },
        onBack: () => {
          if (live) {
            generation++;
            live.cancel();
            const finish = live.finish;
            live = null;
            pending = null;
            loading = false;
            stopWatching();
            getView().hide();
            finish();
            return;
          }
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
      generation++;
      live?.cancel();
      stopWatching();
      getView().fail(details);
    }
  }
  function onError(event) {
    if (event.error) {
      fail();
    }
  }
  function watch({ handoff = false, quick = false } = {}) {
    stopWatching();
    const show = () => getView().loading(pending?.name || 'OH MY SNOOKER', { handoff });
    if (quick) {
      revealTimer = setTimeout(show, 150);
    } else {
      show();
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', fail);
    // A recovery action for stalled resource loading, never an automatic retry.
    timer = setTimeout(fail, 45000);
  }
  function runLive() {
    loading = true;
    handingOff = true;
    const attempt = ++generation;
    watch({ quick: live.quick });
    const start = () => {
      if (attempt !== generation) {
        return;
      }
      Promise.resolve()
        .then(() => live.run())
        .then(() => {
          if (attempt !== generation) {
            return;
          }
          navigation.commit(pending);
          const finish = live.finish;
          live = null;
          handingOff = false;
          finish();
          module.exports.complete(pending.id);
        })
        .catch(() => {
          if (attempt === generation) {
            fail();
          }
        });
    };
    if (live.quick) {
      start();
    } else {
      window.requestAnimationFrame(() => window.requestAnimationFrame(start));
    }
  }
  if (!pending) {
    navigation.clear();
  }
  watch();
  module.exports = {
    get href() {
      return navigation.href;
    },
    begin(selection, actions = null) {
      if (pending) {
        return;
      }
      pending = { ...selection, previousHref: navigation.href };
      if (actions) {
        live = actions;
        runLive();
        return;
      }
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
