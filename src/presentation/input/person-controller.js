// Explicit live dependencies preserve initialization and shared state.
export default function createPersonController(dependencies) {
  return class PersonController extends dependencies.PlayerControl {
    get bodyPosition() {
      return this._bodyPosition;
    }
    get lockedTarget() {
      return this._lockedTarget;
    }
    get state() {
      return this._state;
    }
    get azimuth() {
      return this._azimuth;
    }
    get stateRatio() {
      return this._stateTransitionTween.uneaseRenderedRatio;
    }
    set strokePower(t) {
      (t > 1 ? (t = 1) : t < 0 && (t = 0),
        t !== this._strokePower &&
          ((this._strokePower = t), this.nPhysicsChanged++, this._onStrokePowerChanged()));
    }
    get strokePower() {
      return this._strokePower;
    }
    get stickCtl() {
      return this._stickCtl;
    }
    constructor() {
      (super(),
        (this.needsUpdate = 0),
        (this._bodyPosition = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this._lockedTarget = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this._state = dependencies.PersonState.STATE_STAND),
        (this._stateTransitionTween = new dependencies.Tween()
          .resetBase(dependencies.Easing.Power1.easeInOut, 1.2)
          .onUpdateRequired(() => (this.needsUpdate |= dependencies.PersonDirtyFlags.TRANSTION))),
        (this._horizonCtl = new dependencies.OrbitController(
          this,
          dependencies.PersonDirtyFlags.HORIZON,
        )),
        (this._verticalCtl = new dependencies.StanceController(
          this,
          dependencies.PersonDirtyFlags.VERTICAL,
        )),
        (this._lookAtCtl = new dependencies.LookController(
          this,
          dependencies.PersonDirtyFlags.LOOKAT,
        )),
        (this._headCtl = new dependencies.AimCameraController(
          this,
          dependencies.PersonDirtyFlags.HEAD,
        )),
        (this._azimuth = new dependencies.HeadingController()),
        (this._stickCtl = new dependencies.CueMotionController()),
        (this._strokeVars = new Float32Array(8)),
        (this.nPhysicsChanged = 0),
        this._stickCtl.onKissPropsChanged((t, e, i, s, n, r) => {
          this.nPhysicsChanged++;
          const a = this._strokeVars;
          ((a[0] = t), (a[1] = e), (a[2] = i), (a[3] = s), (a[4] = n), (a[5] = r));
        }),
        (this._strokePower = 0));
    }
    reset(t, e, i, s, n) {
      if ((super.reset(t, e, i, s, n), this._stickName)) {
        let i = t.requireStick(this._stickName),
          s = i.specs.tipRadius;
        (this._stickCtl.reset(i, e.getBalls(), t.cushionBody), (this._strokeVars[7] = s));
      }
    }
    syncEnter(t, e) {
      const i = t.innerTrackRadius,
        s = t.eyeStandHeight,
        n = t.eyeSquatHeight,
        r = this._gView.playArea.position,
        a = this._gView.playArea.size,
        o = this._gView.trackInfo,
        l = this._gView.ballRadius;
      (this._horizonCtl.reset(r.x, r.z, o.radius, o.scaleX, i, 0, e),
        this._verticalCtl.reset(s, n),
        this._lookAtCtl.reset(r.x, r.y, r.z, a.w, a.h, l),
        this._headCtl.reset(i),
        this.gotoState0(!0));
    }
    release() {
      (this._stickCtl.release(), super.release());
    }
    activate() {
      super.activate();
      const t = this._simulator.getCueBallPosition();
      return (
        this._horizonCtl.resetInnerCenter(t.x, t.z),
        this._stickCtl.resetAimPoint(t),
        this._stickCtl.clearTip(!1),
        this._stickCtl.setAngleV(0),
        this._headCtl.resetAimPoint(t),
        (this.strokePower = 0.5),
        this
      );
    }
    _onActive() {
      (super._onActive(), this.markForceUpdate());
    }
    markForceUpdate() {
      this.needsUpdate |= dependencies.PersonDirtyFlags.FORCE;
    }
    gotoState0(t) {
      if (this._state !== dependencies.PersonState.STATE_STAND) {
        this._state = dependencies.PersonState.STATE_STAND;
        let e = this._stateTransitionTween;
        (e.needsUpdate || this.emit(dependencies.PersonEvents.STATE_CHANGE_START),
          t ? e.pause(0) : e.reverse());
      } else t && !this._stateTransitionTween.isComplete(!0) && this._stateTransitionTween.pause(0);
      return this;
    }
    gotoState1(t) {
      if (this._state !== dependencies.PersonState.STATE_AIM) {
        this._state = dependencies.PersonState.STATE_AIM;
        let e = this._horizonCtl.getAimPoint(),
          i = this._stateTransitionTween;
        (i.needsUpdate || this.emit(dependencies.PersonEvents.STATE_CHANGE_START),
          t
            ? (i.end(), this._lookAtCtl.lookTo(e.x, e.y, !0), this._headCtl.resetSideLookAt(!0))
            : (i.play(), this._lookAtCtl.lookTo(e.x, e.y, !1), this._headCtl.resetSideLookAt(!1)));
      } else if (t && !this._stateTransitionTween.isComplete()) {
        let t = this._horizonCtl.getAimPoint();
        (this._stateTransitionTween.end(),
          this._lookAtCtl.lookTo(t.x, t.y, !0),
          this._headCtl.resetSideLookAt(!0));
      }
      return this;
    }
    lookTo(t, e, i) {
      this._lookAtCtl.lookTo(t, e, i);
    }
    follow(t) {
      return this._lookAtCtl.follow(t);
    }
    get isFollowing() {
      return this._lookAtCtl._isFollowing;
    }
    get followingTarget() {
      return this._lookAtCtl._followingTarget;
    }
    unfollow() {
      return this._lookAtCtl.unfollow();
    }
    squatDown() {
      this._verticalCtl.squatDown();
    }
    standUp() {
      this._verticalCtl.standUp();
    }
    orbit(t, e) {
      this._horizonCtl.orbit(t, e);
    }
    moveLookAt(t, e) {
      this._state === dependencies.PersonState.STATE_AIM
        ? this._headCtl.moveSideLookAt(t, e)
        : this._lookAtCtl.moveLookAt(t, e, this._azimuth);
    }
    resetLookAt() {
      this._state === dependencies.PersonState.STATE_AIM
        ? this._headCtl.resetSideLookAt()
        : this._lookAtCtl.resetLookAt();
    }
    resetWithKissDir(t, e) {
      this._horizonCtl.resetWithKissDir(t, e, this._bodyPosition, this._stateTransitionTween);
    }
    syncTipMotion(t) {
      this._stickCtl.leadingSpace = t.length;
    }
    getKissPoint() {
      return this._stickCtl.kissPoint;
    }
    getKissDir() {
      return this._stickCtl.kissDir;
    }
    moveStickTip(t, e) {
      return this._stickCtl.moveLocTip(t, e);
    }
    clearStickTip(t) {
      return this._stickCtl.clearTip(t);
    }
    moveStickAngleV(t) {
      this._stickCtl.moveAngleV(t);
    }
    isReadyToStroke() {
      return this._state === dependencies.PersonState.STATE_AIM && this._stickCtl.isReadyToStroke();
    }
    getStrokeVars() {
      const t = this._strokeVars;
      return ((t[6] = this._stickCtl.getStrokeSpdWithPower(this._strokePower)), t);
    }
    getStickTouchSpd() {
      return this._stickCtl.getTouchSpdWithPower(this._strokePower);
    }
    getStickSlowDownDistance(t) {
      return this._stickCtl.getSlowDownDistance(this._strokePower, t);
    }
    getTipRadius() {
      return this._strokeVars[7];
    }
    shouldUpdate() {
      return this._active && (0 !== this.needsUpdate || this._stickCtl.needsUpdate);
    }
    update(t) {
      const e = this._stateTransitionTween;
      let i = this.needsUpdate,
        s = this._bodyPosition,
        n = this._lockedTarget,
        r = this._azimuth,
        a = this._headCtl;
      if (((this.needsUpdate = 0), i & dependencies.PersonDirtyFlags.BODY)) {
        let a = !1;
        (i & dependencies.PersonDirtyFlags.TRANSTION &&
          ((i |= dependencies.PersonDirtyFlags.HORIZON_VERTICAL),
          e.update(t) ||
            ((i &= ~dependencies.PersonDirtyFlags.TRANSTION),
            this.emit(dependencies.PersonEvents.STATE_CHANGE_END))),
          i & dependencies.PersonDirtyFlags.HORIZON &&
            (this._horizonCtl.update(this._state, e, s) ||
              (i &= ~dependencies.PersonDirtyFlags.HORIZON),
            (a = !0)),
          i & dependencies.PersonDirtyFlags.VERTICAL &&
            (this._verticalCtl.update(t, e.renderedRatio, s) ||
              (i &= ~dependencies.PersonDirtyFlags.VERTICAL)),
          i & dependencies.PersonDirtyFlags.LOOKAT &&
            (this._lookAtCtl.update(t, n) || (i &= ~dependencies.PersonDirtyFlags.LOOKAT),
            (a = !0)),
          a && r.setSlope(n.x - s.x, n.z - s.z),
          this._stickCtl.syncPersonCtl(this));
      }
      return (
        (this._stickCtl.needsUpdate || i & dependencies.PersonDirtyFlags.FORCE) &&
          (this._stickCtl.update(),
          a.setAngles(this._stickCtl.angleH1, this._stickCtl.rotationZ1) &&
            (i |= dependencies.PersonDirtyFlags.HEAD),
          this._active && (this._stickCtl.render(this._activeStickMesh), this._onStickRendered())),
        i & dependencies.PersonDirtyFlags.HEAD &&
          !a.update() &&
          (i &= ~dependencies.PersonDirtyFlags.HEAD),
        (i &= ~dependencies.PersonDirtyFlags.FORCE),
        (this.needsUpdate |= i),
        !0
      );
    }
    _onStickRendered() {}
    _onStrokePowerChanged() {}
  };
}
