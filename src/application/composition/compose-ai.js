import createAiRegistry from '../ai/ai-registry.js';
import createRoutePool from '../ai/route-pool.js';
import createAiRoutePlanner from '../ai/ai-route-planner.js';
import createAiGameModel from '../models/ai-game-model.js';
/** Own this type family and its shared state once per game composition. */
export default function composeAi(dependencies) {
  const Ot = dependencies.physicsApi.a.Vec3,
    Mt = Ot.EPSILON,
    Ut = new Ot(),
    Bt = new Ot(),
    Nt = new Ot(),
    Vt = new Ot(),
    Ft = new Ot(),
    zt = new Ot(),
    Ht = new Ot(),
    Gt = new Ot(),
    qt = new dependencies.VectorTwo(),
    Wt = new dependencies.VectorTwo(),
    Yt = new dependencies.VectorTwo(),
    jt = new dependencies.VectorTwo(),
    Xt = new dependencies.VectorTwo(),
    Kt = new dependencies.VectorTwo(),
    Zt = new dependencies.VectorTwo();
  const RoutePool = createRoutePool({});
  const routePool = new RoutePool();
  const AiRoutePlanner = createAiRoutePlanner({
    get Bt() {
      return Bt;
    },
    get Ft() {
      return Ft;
    },
    get Gt() {
      return Gt;
    },
    get Ht() {
      return Ht;
    },
    get Kt() {
      return Kt;
    },
    get Mt() {
      return Mt;
    },
    get Nt() {
      return Nt;
    },
    get Ot() {
      return Ot;
    },
    get Ut() {
      return Ut;
    },
    get Vt() {
      return Vt;
    },
    get Wt() {
      return Wt;
    },
    get Xt() {
      return Xt;
    },
    get Yt() {
      return Yt;
    },
    get Zt() {
      return Zt;
    },
    get geometryUtils() {
      return dependencies.geometryUtils;
    },
    get jt() {
      return jt;
    },
    get qt() {
      return qt;
    },
    get routePool() {
      return routePool;
    },
    get zt() {
      return zt;
    },
  });
  const aiRegistry = createAiRegistry({
    get gameRecords() {
      return dependencies.gameRecords;
    },
    get AiRoutePlanner() {
      return AiRoutePlanner;
    },
  });
  const AiGameModel = createAiGameModel({
    get BaseGameModel() {
      return dependencies.BaseGameModel;
    },
    get aiRegistry() {
      return aiRegistry;
    },
    get localGameSettings() {
      return dependencies.localGameSettings;
    },
  });

  return { aiRegistry, AiGameModel };
}
