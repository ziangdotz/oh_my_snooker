import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function waitForCamera(page) {
  await page.waitForFunction(() => {
    const view = window.__pcolTestGame?._gView;
    const camera = view?._scene?.activeCamera;
    if (!camera || !view._scene.isReady()) {
      return false;
    }
    const key = JSON.stringify([camera.position.asArray(), camera.lockedTarget.asArray()]);
    const previous = window.__pcolTestCamera;
    const frames = previous?.key === key ? previous.frames + 1 : 0;
    window.__pcolTestCamera = { key, frames };
    return frames >= 8 && document.querySelector('#game-view')?.style.opacity === '1';
  });
}

// Paused scenes skip drawing, but the engine's update loop continues.
export async function observeFrames(page, frames = 8) {
  await page.evaluate(() => {
    window.__pcolTestObservedFrames = 0;
    const engine = window.__pcolTestGame._engine;
    window.__pcolTestObserver = engine.onBeginFrameObservable.add(() => {
      window.__pcolTestObservedFrames++;
    });
  });
  try {
    await page.waitForFunction((count) => window.__pcolTestObservedFrames >= count, frames);
  } finally {
    await page.evaluate(() => {
      window.__pcolTestGame._engine.onBeginFrameObservable.remove(window.__pcolTestObserver);
      delete window.__pcolTestObserver;
      delete window.__pcolTestObservedFrames;
    });
  }
}

export async function captureFailure(entries, directory, prefix, error, phase) {
  const diagnostics = { phase, error: error.stack || String(error), pages: [] };
  for (const [index, entry] of entries.entries()) {
    if (entry.page.isClosed()) {
      continue;
    }
    const item = { route: entry.routeName, observations: entry.observations };
    const screenshot = `${prefix}-failure-${index}.png`;
    try {
      await entry.page.screenshot({ path: path.join(directory, screenshot), timeout: 5000 });
      item.screenshot = screenshot;
    } catch (failure) {
      item.screenshotError = failure.message;
    }
    try {
      item.state = await entry.page.evaluate(() => {
        const game = window.__pcolTestGame;
        const controller = game?._currentController;
        const clip = controller?._movieClip;
        const camera = game?._gView?._scene?.activeCamera;
        return {
          url: window.location.href,
          body: document.body?.innerText,
          controller: controller?._name,
          controllerState: controller?._state,
          activeControl: controller?._activeSubControl?.constructor.name,
          gameContext: controller?._model && { ...controller._model._gContext },
          players: controller?._model?.players?.map((player) => ({
            pts: player.pts,
            brk: player.brk,
            maxbrk: player.maxbrk,
            penalty: player.penalty,
            shootingCount: player.shootingCount,
            scoreCount: player.scoreCount,
          })),
          refereeResult: controller?._model && { ...controller._model._refResult },
          simulationResult: controller?._simulator && { ...controller._simulator.result },
          playerControls: controller?._playerCtls?.map((player) => ({
            state: player.state,
            active: player.active,
            strokePower: player.strokePower,
            readyToStroke: player.isReadyToStroke(),
          })),
          compatibility: window.PCOLCompatibility?.diagnostics,
          replay: clip && { state: clip.state, head: clip.playHead, duration: clip.duration },
          camera: camera && {
            position: camera.position.asArray(),
            target: camera.lockedTarget?.asArray(),
          },
          balls: controller?._simulator?._world?.balls.map((ball) => ({
            active: ball.active,
            position: [ball.position.x, ball.position.y, ball.position.z],
            velocity: [ball.v.x, ball.v.y, ball.v.z],
          })),
        };
      });
    } catch (failure) {
      item.stateError = failure.message;
    }
    diagnostics.pages.push(item);
  }
  const filename = `${prefix}-failure.json`;
  await writeFile(path.join(directory, filename), JSON.stringify(diagnostics, null, 2) + '\n');
  return filename;
}
