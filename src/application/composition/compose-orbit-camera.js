import createOrbitPointCache from '../../presentation/camera/orbit-point-cache.js';
import createOrbitTrack from '../../presentation/camera/orbit-track.js';
import createOrbitController from '../../presentation/camera/orbit-controller.js';
import createStanceController from '../../presentation/camera/stance-controller.js';
import createLookController from '../../presentation/camera/look-controller.js';
import createHeadingController from '../../presentation/camera/heading-controller.js';
import createTimedOrbitController from '../../presentation/camera/timed-orbit-controller.js';
import createTimedLinearController from '../../presentation/camera/timed-linear-controller.js';
import createTimedLookController from '../../presentation/camera/timed-look-controller.js';
/** Own this type family and its shared state once per game composition. */
export default function composeOrbitCamera(dependencies) {
  const CameraLinearController = createTimedLinearController(dependencies.LinearController);
  const orbitLine = new dependencies.LineTwo(),
    orbitPoints = createOrbitPointCache({
      get VectorTwo() {
        return dependencies.VectorTwo;
      },
    });
  const OrbitTrack = createOrbitTrack({
    get EllipseTwo() {
      return dependencies.EllipseTwo;
    },
    get VectorTwo() {
      return dependencies.VectorTwo;
    },
    get orbitLine() {
      return orbitLine;
    },
    get orbitPoints() {
      return orbitPoints;
    },
  });
  const ti = (t, e, i, s, n) => {
      n.angle = Math.atan2(s - e, i - t);
    },
    ei = (t, e, i, s, n) => {
      const r = n.getLineCrossedPoint(t, e, i, s);
      n.angle = r ? n.angleToCenter(r.x, r.y) : Math.atan2(s - e, i - t);
    },
    ii = (t, e, i, s) => {
      const n = t.center,
        r = n.x + Math.cos(t.angle) * t.radius * t.scaleX,
        a = n.y + Math.sin(t.angle) * t.radius,
        o = e.center,
        l = Math.atan2(a - o.y, r - o.x),
        h = o.x + Math.cos(l) * e.radius * e.scaleX,
        c = o.y + Math.sin(l) * e.radius;
      (i.set(r, a), s.set(h - r, c - a));
    },
    si = (t, e, i, s) => {
      let n;
      let r;
      const a = e.center;
      const o = a.x + Math.cos(e.angle) * e.radius * e.scaleX;
      const l = a.y + Math.sin(e.angle) * e.radius;
      const h = t.getLineCrossedPoint(a.x, a.y, o, l);
      (h
        ? ((n = h.x), (r = h.y))
        : ((n = t.center.x + Math.cos(t.angle) * t.radius * t.scaleX),
          (r = t.center.y + Math.sin(t.angle) * t.radius)),
        i.set(n, r),
        s.set(o - n, l - r));
    };
  const OrbitController = createOrbitController({
    get AngularController() {
      return dependencies.AngularController;
    },
    get OrbitTrack() {
      return OrbitTrack;
    },
    get VectorTwo() {
      return dependencies.VectorTwo;
    },
    get ei() {
      return ei;
    },
    get ii() {
      return ii;
    },
    get si() {
      return si;
    },
    get ti() {
      return ti;
    },
  });
  const StanceController = createStanceController({
    get Easing() {
      return dependencies.Easing;
    },
    get Tween() {
      return dependencies.Tween;
    },
  });
  const LookController = createLookController({
    get Easing() {
      return dependencies.Easing;
    },
    get LinearController() {
      return CameraLinearController;
    },
    get PropertyTween() {
      return dependencies.PropertyTween;
    },
  });
  const HeadingController = createHeadingController({
    get Babylon() {
      return dependencies.Babylon;
    },
  });

  return {
    OrbitController: createTimedOrbitController(OrbitController),
    StanceController,
    LookController: createTimedLookController(LookController),
    HeadingController,
  };
}
