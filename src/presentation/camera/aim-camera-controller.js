// Explicit live dependencies preserve initialization and shared state.
export default function createAimCameraController(dependencies) {
  return class AimCameraController {
    constructor(t, e) {
      ((this._weakParent = t),
        (this._dirtyFlag = e),
        (this._localDirtyFlag = 0),
        (this._angleH = 0),
        (this._angleV = 0),
        (this._translate = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this._transform = new Float32Array(16)),
        (this._transform[0] = 1),
        (this._transform[5] = 1),
        (this._transform[10] = 1),
        (this._transform[15] = 1),
        (this._locOrigX = 0),
        (this._locOrigY = 0.12),
        (this._locOrigZ = 0),
        (this._locX = this._locOrigX),
        (this._locY = this._locOrigY),
        (this._locZ = this._locOrigZ),
        (this._locLookAtOffset = [
          new dependencies.LinearController(0.4, 0.25, 0.5, 0.001),
          new dependencies.LinearController(0.4, 0.25, 0.5, 0.001),
        ]),
        (this._lookAtSpd = new dependencies.PropertyTween((t) => {
          let e = this._locLookAtOffset;
          ((e[0].gain = t.gain), (e[1].gain = t.gain));
        })
          .reset({ gain: 0.01 }, { gain: 0.25 }, dependencies.Easing.Power1.easeIn, 0.5)
          .end()));
      const i = () => {
        this._markDirty(dependencies.AimCameraDirtyFlags.LOOKAT);
      };
      for (let t = 0, e = this._locLookAtOffset.length; t !== e; ++t)
        this._locLookAtOffset[t].onUpdateRequired(i);
      (this._locLookAtOffset[0].clamp(0.7 * -Math.PI, 0.7 * Math.PI),
        (this.position = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this.lookAtOffset = new dependencies.Babylon.Vector3(0, 0, 0)));
    }
    _markDirty(t) {
      ((this._localDirtyFlag |= t), (this._weakParent.needsUpdate |= this._dirtyFlag));
    }
    reset(t) {
      ((this._locOrigX = -t),
        this._locLookAtOffset[1].clamp(0.3 * t, 1).reset(t),
        this._markDirty(dependencies.AimCameraDirtyFlags.LOCPOSITION),
        this._lookAtSpd.end());
    }
    resetAimPoint(t) {
      this._translate.equalsWithEpsilon(t, 1e-6) ||
        (this._translate.copyFrom(t), this._markDirty(dependencies.AimCameraDirtyFlags.TRANSFORM));
    }
    moveSideLookAt(t, e) {
      (this._locLookAtOffset[0].to(this._locLookAtOffset[0].tgt + 0.5 * t),
        this._locLookAtOffset[1].to(this._locLookAtOffset[1].tgt + 0.5 * e));
    }
    resetSideLookAt(t) {
      if (t)
        (this._locLookAtOffset[0].reset(0),
          this._locLookAtOffset[1].reset(-this._locOrigX),
          this._lookAtSpd.end());
      else {
        (this._locLookAtOffset[0].to(0), this._locLookAtOffset[1].to(-this._locOrigX));
        let t = 1 - Math.abs(this._locLookAtOffset[0].crt) / this._locLookAtOffset[0].clampMax;
        this._lookAtSpd.play(t * t * this._lookAtSpd.duration);
      }
    }
    setAngles(t, e) {
      let i = !1;
      return (
        Math.abs(this._angleH - t) > dependencies.Oi &&
          ((this._angleH = t),
          (this._localDirtyFlag |= dependencies.AimCameraDirtyFlags.TRANSFORM),
          (i = !0)),
        Math.abs(this._angleV - e) > dependencies.Oi &&
          ((this._angleV = e),
          (this._localDirtyFlag |=
            dependencies.AimCameraDirtyFlags.TRANSFORM |
            dependencies.AimCameraDirtyFlags.LOCPOSITION),
          (i = !0)),
        i
      );
    }
    _updateLocs(t) {
      let e = t / dependencies.wi;
      (e > 1 ? (e = 1) : e < 0 && (e = 0),
        (this._locX = this._locOrigX + dependencies.Ri * e),
        (this._locY = this._locOrigY),
        (this._locZ = this._locOrigZ),
        (this.lookAtOffset.y = 0),
        e > dependencies.Li &&
          ((e -= dependencies.Li),
          (this._locY += dependencies.Pi * e),
          (this._locZ += dependencies.ki * e),
          (this.lookAtOffset.y = dependencies.Di * e)));
    }
    update() {
      const t = this._transform,
        e = this._locLookAtOffset;
      let i = this._localDirtyFlag;
      this._localDirtyFlag = 0;
      let s = !1,
        n = !1,
        r = !1;
      if (i & dependencies.AimCameraDirtyFlags.TRANSFORM) {
        let e = Math.cos(this._angleH),
          i = Math.sin(this._angleH),
          s = Math.cos(this._angleV),
          a = Math.sin(this._angleV);
        ((t[0] = e * s),
          (t[1] = a),
          (t[2] = -s * i),
          (t[3] = 0),
          (t[4] = -e * a),
          (t[5] = s),
          (t[6] = a * i),
          (t[7] = 0),
          (t[8] = i),
          (t[9] = 0),
          (t[10] = e),
          (t[11] = 0),
          (t[12] = this._translate.x),
          (t[13] = this._translate.y),
          (t[14] = this._translate.z),
          (t[15] = 1),
          (n = !0),
          (r = !0));
      }
      if (
        (i & dependencies.AimCameraDirtyFlags.LOCPOSITION &&
          (this._updateLocs(this._angleV), (n = !0)),
        i & dependencies.AimCameraDirtyFlags.LOOKAT)
      ) {
        this._lookAtSpd.needsUpdate && this._lookAtSpd.update(0.016);
        for (let t = 0, i = e.length; t !== i; ++t)
          e[t].update() &&
            ((this._localDirtyFlag |= dependencies.AimCameraDirtyFlags.LOOKAT), (s = !0));
        r = !0;
      }
      if (n) {
        let e = this._locX,
          i = this._locY,
          s = this._locZ,
          n = e * t[0] + i * t[4] + s * t[8] + t[12],
          r = e * t[1] + i * t[5] + s * t[9] + t[13],
          a = e * t[2] + i * t[6] + s * t[10] + t[14],
          o = e * t[3] + i * t[7] + s * t[11] + t[15];
        ((this.position.x = n / o), (this.position.y = r / o), (this.position.z = a / o));
      }
      if (r) {
        let i = e[0].crt,
          s = e[1].crt,
          n = Math.cos(i) * s + this._locOrigX,
          r = Math.sin(i) * s;
        ((this.lookAtOffset.x = n * t[0] + r * t[8]), (this.lookAtOffset.z = n * t[2] + r * t[10]));
      }
      return s;
    }
  };
}
