export default function assetQueueModule(module, exports) {
  const i = Object.create(null);
  i.isPending = !0;
  module.exports = class AssetQueue {
    constructor(t = 5) {
      ((this._concurrency = t || 5),
        (this._currentTaskCount = 0),
        (this._caches = Object.create(null)),
        (this._pendingRequests = []));
    }
    static errObj(t) {
      let e = Object.create(null);
      return ((e.message = t || 'undefined message'), (e.isError = !0), e);
    }
    getCache(t, e) {
      let i = this._caches[t];
      return i ? (i.isPending ? null : i) : (e || this.reload(t), null);
    }
    reload(t) {
      ((this._caches[t] = i),
        this._currentTaskCount < this._concurrency
          ? this._startLoadAndCache(t)
          : this._pendingRequests.push(t));
    }
    _startLoadAndCache(t) {
      (this._currentTaskCount++, this._loadHandler(t));
    }
    _loadHandler(t) {
      throw new Error(
        'AbstractMBCache.loadHandler: should override me, let me know how to load "' + t + '"? ',
      );
    }
    _onTaskComplete(t, e) {
      let i = this._pendingRequests;
      for (
        this._caches[t] = e, e.id = t, this._currentTaskCount--;
        this._currentTaskCount < this._concurrency && i.length > 0;

      )
        this._startLoadAndCache(this._pendingRequests.shift());
    }
  };
}
