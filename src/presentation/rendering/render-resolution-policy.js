// Stable pixel density preserves CSS layout and avoids a changing resolution during play.
export default function installRenderResolutionPolicy(engine, view, browser = window) {
  const apply = () => {
    const nativeDensity = Number(browser.devicePixelRatio) || 1;
    const scaling = 1 / Math.min(Math.max(nativeDensity, 0.5), 1.5);
    if (Math.abs(engine.getHardwareScalingLevel() - scaling) > 1e-6) {
      engine.setHardwareScalingLevel(scaling);
      view.requireRender();
    }
  };
  apply();
  browser.addEventListener('resize', apply);
  let disposed = false;
  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    browser.removeEventListener('resize', apply);
    browser.removeEventListener('pagehide', onPageHide);
  };
  const onPageHide = (event) => {
    if (!event?.persisted) {
      dispose();
    }
  };
  // Babylon 3.2 lacks Engine.onDisposeObservable; page teardown owns this engine.
  browser.addEventListener('pagehide', onPageHide);
  engine.onDisposeObservable?.add(dispose);
  return dispose;
}
