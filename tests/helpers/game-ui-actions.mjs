/* global window, document */
import assert from 'node:assert/strict';

/** An active guide may still await its first animated frame; do not send play input then. */
export async function waitForActiveBasicGuide(page) {
  const guide = page.locator('.controls-guide-box').filter({ hasText: 'BASIC CONTROLS' });
  const active = await page.evaluate(
    () => window.__pcolTestGame?._uiLayer?._registeredBox?.controlsNaviBox?.isActive === true,
  );
  if (active && (await guide.count())) {
    await guide.waitFor({ state: 'visible' });
  }
}

/** Keep frozen legacy and maintained semantic controls in the same behavior tests. */
export async function confirmGameAction(page, action) {
  if (await page.locator('.confirm-box.game-ui-panel').count()) {
    const dialog = page.locator('.confirm-box.game-ui-panel');
    await page.waitForFunction(() => {
      const box = window.__pcolTestGame._uiLayer._registeredBox.confirm;
      return box.isActive && !box.needsUpdate && !box.blocked;
    });
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'CANCEL');
    await dialog
      .getByRole('button', {
        name: action === 'quit' ? 'QUIT TO MENU' : /^RESTART (?:PRACTICE|GAME)$/,
        exact: true,
      })
      .click();
  } else {
    await page.getByText(`Are you sure to ${action} the game?`, { exact: true }).waitFor();
    await page.getByRole('button', { name: 'YES', exact: true }).click();
  }
}
