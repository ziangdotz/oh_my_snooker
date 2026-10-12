export default function baseRefereeModule(module, exports, loadModule) {
  const EventEmitter = loadModule('shared/events/event-emitter'),
    Polygon = loadModule('domain/geometry/polygon'),
    r = 65535;
  module.exports = class BaseReferee extends EventEmitter {
    get validRegionGeoCenter() {
      return this._playArea.geoCenter;
    }
    get sysReservedBallOn() {
      return r;
    }
    constructor() {
      (super(), (this._sceneId = ''), (this._playArea = new Polygon()));
    }
    syncAreaWithSimulator(t) {
      this._sceneId !== t.sceneId &&
        ((this._sceneId = t.sceneId), this._playArea.resetWithAtomPolygon(t.ground));
    }
    intersectionRayValidRegionPlane(t, e, i) {
      return this._playArea.intersectionWithRay(t, e, i, 10);
    }
    projectionInSideValidRegion(t, e, i) {
      return this.projectionOnTable(t, e, i);
    }
    projectionOnTable(t, e, i) {
      return this._playArea.projectionInside(t, e, i);
    }
    resetGContext(t) {
      throw ((t.inHand = 2), (t.ballOn = 0), new Error('Override me!'));
    }
    checkResult(t, e, i) {
      throw new Error('Override me!' + t + e + i);
    }
  };
}
