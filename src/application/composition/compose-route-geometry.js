import createVectorTwo from '../../domain/math/vector-two.js';
import createLineTwo from '../../domain/geometry/line-two.js';
import createEllipseTwo from '../../domain/geometry/ellipse-two.js';
/** Own this type family and its shared state once per game composition. */
export default function composeRouteGeometry() {
  const geometryPrecision = 1e-6;
  const VectorTwo = createVectorTwo({
    get geometryPrecision() {
      return geometryPrecision;
    },
  });
  const LineTwo = createLineTwo({
    get geometryPrecision() {
      return geometryPrecision;
    },
  });
  const ellipseIntersections = [];
  const EllipseTwo = createEllipseTwo({
    get ellipseIntersections() {
      return ellipseIntersections;
    },
    get geometryPrecision() {
      return geometryPrecision;
    },
  });

  return { VectorTwo, LineTwo, EllipseTwo };
}
