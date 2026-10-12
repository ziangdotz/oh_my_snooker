// Explicit live dependencies preserve initialization and shared state.
export default function createGameView(dependencies) {
  return class GameView extends dependencies.EventEmitter.a {
    get camera() {
      return this._defCamera;
    }
    get playArea() {
      return this._playArea;
    }
    get state() {
      return this._state;
    }
    get canvas() {
      return this._canvas;
    }
    get trackInfo() {
      return this._trackInfo;
    }
    get respotIcon() {
      return this._respotIcon1;
    }
    get ballMeshes() {
      return this._ballMeshes;
    }
    get ballRadius() {
      return this._syncList.ballRadius;
    }
    get cushionBody() {
      return this._cushionBody;
    }
    get powerUI() {
      return this._powerUI;
    }
    get gunsight() {
      return this._gunsight;
    }
    get sceneId() {
      return this._sceneId;
    }
    constructor(t, e) {
      (super(),
        (this._engine = t),
        (this._canvas = e),
        (this._syncList = Object.create(null)),
        (this._syncList.sceneId = ''),
        (this._syncList.ballSet = []),
        (this._syncList.ballRadius = 0),
        (this._state = dependencies.ViewState.NO_SCENE),
        (this._nRenderRequired = 0),
        (this._isHidding = !0),
        (this._showHideTween = new dependencies.ValueTween(e.style)
          .reset({ opacity: 0 }, { opacity: 1 }, dependencies.Easing.Power1.easeIn, 0.45)
          .requireUpdate()),
        (this._sceneId = ''),
        (this._scene = null),
        (this._defCamera = null),
        (this._playArea = new dependencies.TableTrack()),
        (this._trackInfo = Object.create(null)),
        (this._sharedTextures = Object.create(null)),
        (this._lightProbeManager = null),
        (this._cushionBody = null),
        (this._tableView = null),
        (this._powerUI = null),
        (this._gunsight = null),
        (this._respotIcon0 = dependencies.PlaneBatch.createPlane(
          'respot0',
          !0,
          0.11,
          0.11,
          dependencies.UiColors.WHITE[0],
          dependencies.UiColors.WHITE[1],
          dependencies.UiColors.WHITE[2],
        )),
        (this._respotIcon1 = dependencies.PlaneBatch.createPlane('respot1', !1, 0.08, 0.08)),
        (this._respotIcon0.alpha = 0),
        (this._respotIcon1.alpha = 0),
        (this._respotIcon0.zIndex = -10),
        (this._respotIcon1.zIndex = -10),
        (this._icon0Angle = 0),
        (this._ballMeshes = []),
        (this._ballMaterials = Object.create(null)),
        (this.ballSyncEvolution = -1),
        (this._stickManager = new dependencies.CueMeshManager()),
        (this._mouseCameraRay = dependencies.Babylon.Ray.Zero()));
    }
    sync(t) {
      let e = !1;
      if (
        (void 0 !== t.sceneId && ((this._syncList.sceneId = t.sceneId), (e = !0)),
        void 0 !== t.ballSet)
      ) {
        for (let e = 0, i = t.ballSet.length; e !== i; ++e)
          this._syncList.ballSet[e] = t.ballSet[e];
        ((this._syncList.ballSet.length = t.ballSet.length), (e = !0));
      }
      (void 0 !== t.ballRadius && ((this._syncList.ballRadius = t.ballRadius), (e = !0)),
        (this._syncList.stickName = t.stickName),
        void 0 !== this._syncList.stickName && (e = !0),
        e
          ? this._state !== dependencies.ViewState.LOADING && this._checkSyncList()
          : this._state === dependencies.ViewState.READY &&
            this.emit(dependencies.ViewEvents.READY));
    }
    requireRender(t = 1) {
      this._nRenderRequired < t && (this._nRenderRequired = t);
    }
    syncBalls(t, e) {
      this.ballSyncEvolution = e;
      const i = this._playArea.position.y,
        s = this._ballMeshes;
      let n, r;
      for (let e = 0, a = t.length; e !== a; ++e)
        ((n = s[e]),
          (r = t[e]).active
            ? ((n.isVisible = !0),
              n.position.copyFrom(r.states.position),
              n.rotationQuaternion.copyFrom(r.states.orientation),
              r.position.y < i
                ? (n.shadow.alpha = 0)
                : ((n.shadow.alpha = n.shadow.displayAlpha),
                  n.shadow.copyPositionXYZ(n.position.x, 0, n.position.z)))
            : n.isVisible && ((n.isVisible = !1), (n.shadow.alpha = 0)));
      this.requireRender();
    }
    requireStick(t) {
      return this._stickManager.requireStick(t);
    }
    markStickAsUnused(t) {
      return this._stickManager.markStickMeshAsUnused(t);
    }
    cancelStickPendingCheck() {
      return this._stickManager.cancelPendingCheck();
    }
    update(t) {
      const e = this._showHideTween,
        i = this._tableView;
      if (
        (this._nRenderRequired > 0 && ((t = !0), this._nRenderRequired--),
        this._state >= dependencies.ViewState.SYNCHRONIZED)
      ) {
        const e = this._gunsight;
        (this._respotIcon0.alpha > 0 &&
          ((this._icon0Angle += 0.06),
          this._respotIcon0.setOrientation2D(
            Math.sin(this._icon0Angle),
            Math.cos(this._icon0Angle),
            !0,
          )),
          e.needsUpdate && e.update(),
          i.needsUpdate && (i.updateChildren(), (t = !0)),
          this._powerUI.needsUpdate && (this._powerUI.updateUI(), (t = !0)),
          t && this._scene.render());
      }
      if (e.needsUpdate) {
        e.update(0.016);
        let t = e.target;
        t.visibility = t.opacity > 0 ? 'inherit' : 'hidden';
      }
    }
    freezeMaterials() {
      let t,
        e,
        i,
        s = this._scene.materials;
      for (t = 0, e = s.length; t !== e; ++t) (i = s[t]).doNotFreeze || i.freeze();
    }
    showRespotIcons(t) {
      (this._respotIcon0.copyPositionXYZ(t.x, 0, t.z), (this._respotIcon0.alpha = 0.75));
    }
    hideRespotIcons() {
      ((this._respotIcon0.alpha = 0), (this._respotIcon1.alpha = 0));
    }
    mouseCameraRay(t, e) {
      return (
        this._scene.createPickingRayToRef(t, e, null, this._mouseCameraRay, null),
        this._mouseCameraRay
      );
    }
    show(t) {
      this._isHidding &&
        ((this._isHidding = !1), t ? this._showHideTween.end() : this._showHideTween.play());
    }
    hide(t) {
      this._isHidding ||
        ((this._isHidding = !0), t ? this._showHideTween.pause(0) : this._showHideTween.reverse());
    }
    _checkSyncList() {
      const t = this._syncList;
      if (t.sceneId !== this._sceneId) {
        (this._unload(), this.hide());
        const e = dependencies.scenes[t.sceneId];
        if (!e) return void (this._state = dependencies.ViewState.ERROR);
        ((this._sceneId = t.sceneId), (this._state = dependencies.ViewState.LOADING));
        let i = e.manifest.model.split('/'),
          n = i.pop();
        return void dependencies.Babylon.SceneLoader.Load(
          i.join('/') + '/',
          n,
          this._engine,
          (t) => {
            ((this._scene = t),
              (this._state = dependencies.ViewState.READY_TO_BUILD),
              this._checkSyncList());
          },
          void 0,
          (t, e, i) => {
            if (((this._state = dependencies.ViewState.ERROR), e && console.error(e), i)) throw i;
          },
        );
      }
      (this._state === dependencies.ViewState.READY_TO_BUILD &&
        (this._buildScene(), this.emit(dependencies.ViewEvents.LOADED)),
        (this._state = dependencies.ViewState.ERROR));
      let e,
        i,
        n = this._ballMeshes,
        r = t.ballSet,
        a = !1,
        o = 0;
      n.length > 0 && t.ballRadius !== n[0].radius && this._unloadAllBallMeshes();
      for (let t = 0, s = r.length / 3; t !== s; ++t) {
        if (((e = r[3 * t]), !(i = n[t]))) {
          if (!(i = this._smartCreateBallMesh('b_' + t, e))) return;
          ((n[t] = i), (a = !0));
        }
        (i.number !== e && ((i.number = e), (i.material = this._getBallMaterial(e)), (a = !0)),
          o++);
      }
      for (let t = n.length - 1; t >= o; --t)
        (this._disposeBallMesh(n[t]),
          n.splice(t, 1),
          (a = !0),
          console.error('\t\t- remove balls: YES index[' + t + ']'));
      if (a) {
        this._gunsight.setRadius(t.ballRadius);
        for (let t = 0, e = n.length; t !== e; ++t)
          (n[t].position.copyFromFloats(
            r[3 * t + 1],
            this._playArea.position.y + n[t].radius,
            r[3 * t + 2],
          ),
            n[t].shadow.copyPositionXYZ(r[3 * t + 1], 0, r[3 * t + 2]),
            (n[t].shadow.alpha = n[t].shadow.displayAlpha));
      }
      for (let t = 0, e = n.length; t !== e; ++t)
        if (!n[t]._fp_)
          throw (
            console.error('logic error: no fingerprint found in ball [' + t + ']:', n),
            new Error('logic error: no fingerprint found in ball')
          );
      if (((this._state = dependencies.ViewState.SYNCHRONIZED), this._syncList.stickName)) {
        if (Array.isArray(this._syncList.stickName)) {
          let t = this._syncList.stickName;
          for (let e = 0, i = t.length; e !== i; ++e) this._stickManager.requireStick(t[e]);
        } else this._stickManager.requireStick(this._syncList.stickName);
        if (this._stickManager.pendingCount > 0)
          return void this._stickManager.on(dependencies.CueEvents.READY, () => {
            (this._stickManager.removeAllListeners(dependencies.CueEvents.READY),
              this._scene.executeWhenReady(() => {
                ((this._state = dependencies.ViewState.READY),
                  this.emit(dependencies.ViewEvents.READY));
              }));
          });
      }
      this._scene.executeWhenReady(() => {
        ((this._state = dependencies.ViewState.READY), this.emit(dependencies.ViewEvents.READY));
      });
    }
    _smartCreateBallMesh(t, e) {
      const i = this._scene.meshes,
        n = 0 === e ? 'high' : 'low';
      let r, a, o;
      for (let e = 0, s = i.length; e !== s; ++e)
        if ((r = i[e])._fp_ === n) {
          o = r.clone(t, void 0, !0);
          break;
        }
      if (!o) {
        if ((a = 2 * this._syncList.ballRadius) <= 1e-6)
          throw (
            console.error(
              'failed to create ball, error ballRadius: "' + this._syncList.ballRadius + '"',
            ),
            new Error(
              'failed to create ball, error ballRadius: "' + this._syncList.ballRadius + '"',
            )
          );
        o = dependencies.Babylon.MeshBuilder.CreateSphere(
          t,
          { segments: dependencies.ballMeshResolution[n], diameter: a },
          this._scene,
        );
      }
      if (
        ((o.radius = this._syncList.ballRadius),
        (o._fp_ = n),
        o.rotationQuaternion ||
          (o.rotationQuaternion = new dependencies.Babylon.Quaternion(0, 0, 0, 1)),
        !o.shadow)
      ) {
        const t = dependencies.scenes[this._sceneId];
        let e = dependencies.PlaneBatch.createPlane(
          'shadow',
          !1,
          2.6 * o.radius,
          2.6 * o.radius,
          0,
          0,
          0,
        );
        (t.customizeShadow(e), this._tableView.addChildb(e, !1), (o.shadow = e));
      }
      return o;
    }
    _getBallMaterial(t) {
      let e = t + '',
        i = this._ballMaterials[e];
      if (!i) {
        (i = dependencies.scenes[this._sceneId].createBallMaterial(
          t,
          this._scene,
          this._sharedTextures,
          this._lightProbeManager,
        )) && (this._ballMaterials[e] = i);
      }
      return i;
    }
    _buildScene() {
      const t = this._scene,
        e = this._sceneId,
        i = dependencies.scenes[e],
        n = i.playArea,
        r = i.camInitialPosition;
      let _a;
      for (; t.cameras.length; ) (_a = t.cameras[0]).dispose();
      (t.detachControl(),
        i.trackInfo
          ? ((this._trackInfo.radius = i.trackInfo.radius),
            (this._trackInfo.scaleX = i.trackInfo.scaleX))
          : ((this._trackInfo.radius = 2), (this._trackInfo.scaleX = 1.5)),
        this._playArea.reset(n.x, n.y, n.z, n.w, n.h),
        i.addSharedTextures(this._sharedTextures, t),
        i.beautify(t),
        (this._defCamera = new dependencies.Babylon.TargetCamera(
          'defCam',
          new dependencies.Babylon.Vector3(r.x, r.y, r.z),
          t,
        )),
        (this._defCamera.lockedTarget = new dependencies.Babylon.Vector3(n.x, n.y, n.z)),
        (this._lightProbeManager = i.createLightProbeManager(t)),
        (this._cushionBody = i.getCushionBody()),
        (this._tableView = new dependencies.PlaneBatch(
          'table2d',
          t,
          this._sharedTextures.tableUI,
          this._sharedTextures.tableMask,
          this._playArea,
        )),
        this._tableView.addChildb(this._respotIcon0),
        this._tableView.addChildb(this._respotIcon1),
        this._stickManager.resetScene(this._scene, this._lightProbeManager),
        (this._powerUI = new dependencies.PowerView('powerui', t, this._sharedTextures.tableUI)),
        (this._gunsight = new dependencies.AimGuide(this._tableView)),
        (this._gunsight.alpha = 0));
    }
    _unload() {
      let t;
      for (t in ((this._state = dependencies.ViewState.NO_SCENE),
      (this._sceneId = ''),
      this._stickManager.unload(),
      this._tableView && (this._tableView.dispose(), (this._tableView = null)),
      this._gunsight && (this._gunsight.dispose(), (this._gunsight = null)),
      (this._powerUI = null),
      this._unloadAllBallMeshes(),
      this._ballMaterials))
        delete this._ballMaterials[t];
      for (t in this._sharedTextures) delete this._sharedTextures[t];
      ((this._defCamera = null),
        this._lightProbeManager &&
          (this._lightProbeManager.dispose(), (this._lightProbeManager = null)),
        (this._cushionBody = null),
        this._scene && (this._scene.dispose(), (this._scene = null)));
    }
    _unloadAllBallMeshes() {
      let t = this._ballMeshes;
      for (let e = 0, i = t.length; e !== i; ++e) this._disposeBallMesh(t[e]);
      t.length = 0;
    }
    _disposeBallMesh(t) {
      (t.shadow && (t.shadow.dispose(), (t.shadow = null)), t.dispose());
    }
  };
}
