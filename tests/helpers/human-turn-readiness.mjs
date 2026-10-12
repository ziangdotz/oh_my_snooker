/* global window: readonly */
/** Bound stalled turns while allowing an AI's legitimately judged scoring break. */
export async function waitForHumanTurn(page, { timeout = 180000, maxRounds = 64 } = {}) {
  const start = await page.evaluate(() =>
    window.__pcolTestGame._currentController._model.getContext('nRounds'),
  );
  let rounds = start;
  for (;;) {
    const handle = await page.waitForFunction(
      (previous) => {
        const controller = window.__pcolTestGame._currentController;
        const model = controller._model;
        const current = model.getContext('nRounds');
        const ready =
          model.gState === window.__pcolTestRequire('domain/game/game-state').READY &&
          model.getContext('playerIndex') === 0 &&
          !controller._paused &&
          ['gaming', 'inHand'].includes(controller._activeSubControl?.name);
        return ready || current > previous ? { ready, rounds: current } : false;
      },
      rounds,
      { timeout },
    );
    let state;
    try {
      state = await handle.jsonValue();
    } finally {
      await handle.dispose();
    }
    if (state.ready) {
      return;
    }
    if (state.rounds - start >= maxRounds) {
      throw new Error('AI turn exceeded the bounded judged-round limit: ' + maxRounds);
    }
    rounds = state.rounds;
  }
}
