export default function rigidBodyModule(module, exports, loadModule) {
  const VectorThree = loadModule('domain/math/vector-three'),
    MatrixThree = loadModule('domain/math/matrix-three'),
    Quaternion = loadModule('domain/math/quaternion'),
    PhysicsConstants = loadModule('domain/physics/physics-constants'),
    o = VectorThree.EPSILON,
    l = PhysicsConstants.gravity,
    h = new VectorThree(),
    c = [
      'uid',
      'active',
      'acc',
      'cdRound',
      'v',
      'vProp_dir',
      'vProp_sq',
      'vProp_dirty',
      'vChangedCount',
      'vProp0_dir',
      'vProp0_sq',
      '__vState',
      '__vStateDirty',
      'w',
      'wProp_sq',
      'wProp_dirty',
      'position',
      'orientation',
      'predictionDirty',
      'steppedLenSq',
      'canSleep',
      'asleep',
      'energy',
    ];
  class RigidBody {
    get wSq() {
      return (
        this.wProp_dirty && ((this.wProp_dirty = !1), (this.wProp_sq = this.w.lengthSq())),
        this.wProp_sq
      );
    }
    get vDir() {
      return (this.vProp_dirty && this.updateVProps(), this.vProp_dir);
    }
    get vSq() {
      return (this.vProp_dirty && this.updateVProps(), this.vProp_sq);
    }
    get vState() {
      return (this.__vStateDirty && this.updateVState(), this.__vState);
    }
    constructor(t, e, i, o, h, c, u) {
      ((this.uid = -1),
        (this.active = !0),
        (this.mass = t),
        (this.invMass = t > 0 ? 1 / t : 0),
        (this.acc = l.clone()),
        (this.cdRound = 0),
        (this.v = new VectorThree()),
        (this.vProp_dir = new VectorThree()),
        (this.vProp_sq = 0),
        (this.vProp_dirty = !1),
        (this.vChangedCount = 0),
        (this.vProp0_dir = new VectorThree()),
        (this.vProp0_sq = 0),
        (this.__vState = 0),
        (this.__vStateDirty = !1),
        (this.w = new VectorThree(0, 0, 0)),
        (this.wProp_sq = 0),
        (this.wProp_dirty = !1),
        (this.invInertia = new MatrixThree()),
        (this.airAngularDamping = PhysicsConstants.airAngularDamping),
        (this.rfPower = 0),
        (this.rfDir = new VectorThree(0, 0, 0)),
        (this.position = new VectorThree(e || 0, i || 0, o || 0)),
        (this.orientation = new Quaternion().setFromEuler(h || 0, c || 0, u || 0)),
        (this.predictionDirty = !1),
        (this.steppedLenSq = 0),
        (this.canSleep = !0),
        (this.asleep = !1),
        (this.energy = RigidBody.minEnergy),
        (this.userData = null),
        (this.restitution = 0),
        (this.friction = 0),
        (this.peneOffset = new VectorThree(0, 0, 0)),
        (this.penetration = 0),
        (this.serializable = !0),
        (this.collisionGroup = 1),
        (this.collisionMask = 0));
    }
    serialize(t) {
      if (!this.serializable) return void t.push(-1 - Math.floor(10 * Math.random()));
      if ((t.push(this.uid), t.push(this.active ? 1 : 0), !this.active)) return;
      let e = c;
      for (let i = 2, s = e.length; i !== s; ++i) {
        let s = this[e[i]];
        switch (typeof s) {
          case 'number':
            t.push(s);
            break;
          case 'boolean':
            t.push(s ? 1 : 0);
            break;
          case 'object':
            s.toArray(t, t.length);
        }
      }
    }
    deserialize(t, e) {
      if (t[e] < 0) return e + 1;
      if (0 === t[e + 1]) return ((this.active = !1), e + 2);
      ((this.active = !0), (e += 2));
      let i = c;
      for (let s = 2, n = i.length; s !== n; ++s) {
        let n = i[s];
        switch (typeof this[n]) {
          case 'number':
            this[n] = t[e++];
            break;
          case 'boolean':
            this[n] = !!t[e++];
            break;
          case 'object':
            e += this[n].fromArray(t, e);
        }
      }
      return e;
    }
    dispose() {
      ((this.acc = null),
        (this.v = null),
        (this.vProp_dir = null),
        (this.vProp0_dir = null),
        (this.w = null),
        (this.invInertia = null),
        (this.position = null),
        (this.orientation = null),
        (this.userData = null));
    }
    setSleep() {
      this.asleep ||
        ((this.asleep = !0),
        (this.energy = 0),
        this.vProp0_dir.set(0, 0, 0),
        (this.vProp0_sq = 0),
        this.v.set(0, 0, 0),
        this.w.set(0, 0, 0),
        (this.__vStateDirty = !0),
        (this.vProp_dirty = !0),
        (this.wProp_dirty = !0));
    }
    wakeUp() {
      this.asleep && ((this.asleep = !1), (this.energy = RigidBody.wakeUpEnergy));
    }
    applyForce(t) {
      (this.acc.addScaled(t, this.invMass), this.wakeUp());
    }
    applyForce2(t, e) {
      (this.acc.addScaled(e, this.invMass * t), this.wakeUp());
    }
    predVelocities(t) {
      if (((this.predictionDirty = !1), !this.asleep)) {
        if ((this.v.addScaled(this.acc, t), 0 !== this.rfPower)) {
          let t = this.rfDir.normalize().scale(this.rfPower),
            e = t.x >= 0 ? t.x : -t.x,
            i = t.y >= 0 ? t.y : -t.y,
            s = t.z >= 0 ? t.z : -t.z,
            n = this.w;
          (n.x > e ? (n.x -= e) : n.x < -e ? (n.x += e) : (n.x = 0),
            n.y > i ? (n.y -= i) : n.y < -i ? (n.y += i) : (n.y = 0),
            n.z > s ? (n.z -= s) : n.z < -s ? (n.z += s) : (n.z = 0),
            (this.rfPower = 0),
            t.set(0, 0, 0));
        }
        (this.w.scale(this.airAngularDamping),
          (this.__vStateDirty = !0),
          (this.vProp_dirty = !0),
          this.vChangedCount++);
      }
    }
    applyImpulseAtPoint(t, e, i) {
      this.v.addScaled(t, this.invMass);
      let s = h.crossVectors(e, t);
      (this.invInertia.transform(s, s),
        this.w.add(s),
        i > this.rfPower && (this.rfPower = i),
        this.rfDir.add(s),
        (this.__vStateDirty = !0),
        (this.vProp_dirty = !0),
        (this.wProp_dirty = !0),
        this.vChangedCount++,
        this.wakeUp(),
        (this.canSleep = !0));
    }
    step(t) {
      if (this.asleep) return ((this.steppedLenSq = 0), (this.penetration = 0), !0);
      (this.position.addScaled(this.v, t),
        0 !== this.penetration &&
          (this.position.add(this.peneOffset), (this.penetration = 0), (this.canSleep = !1)),
        this.orientation.integrate(this.w, t),
        this.acc.copy(l),
        (this.steppedLenSq = this.vSq * t));
      let e = Math.pow(RigidBody.baseSleepBias, t),
        i = e * this.energy + (1 - e) * this.getMotion();
      if (i > RigidBody.maxEnergy) i = RigidBody.maxEnergy;
      else if (i < RigidBody.minEnergy && this.canSleep) return (this.setSleep(), !0);
      return ((this.energy = i), this.vProp0_dir.copy(this.vDir), (this.vProp0_sq = this.vSq), !1);
    }
    addPeneOffset(t, e) {
      t < this.penetration &&
        ((this.penetration = t), this.peneOffset.copy(e), t < -0.001 && this.wakeUp());
    }
    reset(t, e, i) {
      (this.position.set(t, e, i),
        this.vProp0_dir.set(0, 0, 0),
        (this.vProp0_sq = 0),
        this.acc.copy(l),
        this.v.set(0, 0, 0),
        this.w.set(0, 0, 0),
        (this.__vStateDirty = !0),
        (this.vProp_dirty = !0),
        (this.wProp_dirty = !0),
        this.wakeUp());
    }
    updateVProps() {
      ((this.vProp_dirty = !1), (this.vProp_sq = this.v.lengthSq()));
      let t = this.vProp_dir;
      this.vProp_sq < o
        ? ((this.vProp_sq = 0), t.set(0, 0, 0), this.v.set(0, 0, 0))
        : t.scaleVector(1 / Math.sqrt(this.vProp_sq), this.v);
    }
    updateVState() {
      this.__vStateDirty = !1;
      const t = RigidBody.vStates;
      let e = this.vSq;
      return 0 === e
        ? void (this.__vState = t.ZERO)
        : e > this.vProp0_sq
          ? void (this.__vState = t.FASTER)
          : void (this.__vState = 1 - o > this.vDir.dot(this.vProp0_dir) ? t.DIR_CHANGE : t.SLOWER);
    }
    getMotion() {
      return this.vSq + this.wSq;
    }
  }
  ((RigidBody.baseSleepBias = 0.3),
    (RigidBody.minEnergy = NaN),
    (RigidBody.maxEnergy = NaN),
    (RigidBody.wakeUpEnergy = NaN),
    (RigidBody.vStates = { ZERO: 0, SLOWER: 1, FASTER: 2, DIR_CHANGE: 3 }),
    (module.exports = RigidBody));
}
