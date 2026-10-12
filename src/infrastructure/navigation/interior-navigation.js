/** Browser I/O for one pending interior transition; never stores a room preference. */
export default function createInteriorDesignNavigation(browser) {
  const key = 'oh-my-snooker:interior-transition';
  function read() {
    try {
      const record = JSON.parse(browser.sessionStorage.getItem(key));
      const current = new URL(browser.location.href);
      if (
        !record ||
        typeof record.startedAt !== 'number' ||
        Date.now() - record.startedAt > 300000
      ) {
        return null;
      }
      const target = new URL(record.href);
      const previous = new URL(record.previousHref);
      if (
        target.origin !== current.origin ||
        previous.origin !== current.origin ||
        target.pathname !== current.pathname ||
        previous.pathname !== current.pathname ||
        target.href !== current.href ||
        target.searchParams.get('interior') !== record.id ||
        typeof record.name !== 'string'
      ) {
        return null;
      }
      return record;
    } catch {
      return null;
    }
  }
  function clear() {
    try {
      browser.sessionStorage.removeItem(key);
    } catch {
      // Storage may be disabled; navigation itself remains available.
    }
  }
  return {
    get href() {
      return browser.location.href;
    },
    read,
    clear,
    begin(selection) {
      const record = { ...selection, previousHref: browser.location.href, startedAt: Date.now() };
      try {
        browser.sessionStorage.setItem(key, JSON.stringify(record));
      } catch {
        // A disabled session store must not prevent selecting a room.
      }
      browser.location.assign(selection.href);
      return record;
    },
    retry(record) {
      if (record) {
        try {
          browser.sessionStorage.setItem(key, JSON.stringify({ ...record, startedAt: Date.now() }));
        } catch {
          // Retry works without storage as a normal page reload.
        }
      } else {
        clear();
      }
      browser.location.reload();
    },
    back(record) {
      clear();
      browser.location.replace(record.previousHref);
    },
  };
}
