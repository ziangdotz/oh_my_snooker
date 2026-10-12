import test from 'node:test';
import assert from 'node:assert/strict';
import { factoryContext } from '../helpers/composition-fixture.mjs';

function documentFixture() {
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.dataset = {};
      this.attributes = {};
      this.listeners = new Map();
      this.style = {
        removeProperty(name) {
          delete this[name];
        },
      };
      this.className = '';
      this.classList = {
        add: (...names) => {
          this.className = [
            ...new Set([...this.className.split(' ').filter(Boolean), ...names]),
          ].join(' ');
        },
        remove: (...names) => {
          this.className = this.className
            .split(' ')
            .filter((name) => !names.includes(name))
            .join(' ');
        },
        toggle: (name, on) => {
          this.classList[on ? 'add' : 'remove'](name);
        },
      };
    }
    get firstChild() {
      return this.children[0] || null;
    }
    append(...elements) {
      elements.forEach((element) => this.appendChild(element));
    }
    appendChild(element) {
      element.parentNode?.removeChild(element);
      element.parentNode = this;
      this.children.push(element);
      return element;
    }
    insertBefore(element, before) {
      if (!before) {
        return this.appendChild(element);
      }
      element.parentNode?.removeChild(element);
      element.parentNode = this;
      this.children.splice(this.children.indexOf(before), 0, element);
      return element;
    }
    removeChild(element) {
      this.children.splice(this.children.indexOf(element), 1);
      element.parentNode = null;
      return element;
    }
    replaceChildren(...elements) {
      for (const child of [...this.children]) {
        this.removeChild(child);
      }
      this.append(...elements);
    }
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
    addEventListener(name, callback) {
      if (!this.listeners.has(name)) {
        this.listeners.set(name, new Set());
      }
      this.listeners.get(name).add(callback);
    }
    removeEventListener(name, callback) {
      this.listeners.get(name)?.delete(callback);
    }
    fire(name, event = {}) {
      for (const callback of this.listeners.get(name) || []) {
        callback({ currentTarget: this, target: this, ...event });
      }
    }
    querySelector(selector) {
      for (const child of this.children) {
        const matches = selector.startsWith('.')
          ? child.className.split(' ').includes(selector.slice(1))
          : selector === '[aria-pressed="true"]'
            ? child.attributes['aria-pressed'] === 'true'
            : child.tagName === selector.toUpperCase();
        if (matches) {
          return child;
        }
        const nested = child.querySelector(selector);
        if (nested) {
          return nested;
        }
      }
      return null;
    }
    contains(element) {
      return element === this || this.children.some((child) => child.contains(element));
    }
    getBoundingClientRect() {
      return { width: 100, height: 40, top: 0, bottom: 40 };
    }
    focus() {
      document.activeElement = this;
    }
  }
  const document = new Element('document');
  document.createElement = (tag) => new Element(tag);
  return document;
}

function fixture() {
  const document = documentFixture();
  const globals = { document, window: { matchMedia: () => ({ matches: false }) } };
  const emitter = { exports: {} };
  factoryContext('src/shared/events/event-emitter.js', globals)(emitter, emitter.exports);
  const EventEmitter = { a: emitter.exports };
  const linear = (value) => value;
  const Easing = {
    defaultEase: linear,
    Power1: { easeOut: linear, easeInOut: linear },
    Power3: { easeOut: linear },
  };
  const Tween = factoryContext(
    'src/presentation/animation/tween.js',
    globals,
  )({ EventEmitter, Easing, tweenPrecision: 1e-6 });
  const ValueTween = factoryContext(
    'src/presentation/animation/value-tween.js',
    globals,
  )({ Tween });
  const PropertyTween = factoryContext(
    'src/presentation/animation/property-tween.js',
    globals,
  )({ ValueTween });
  const TweenGroup = factoryContext(
    'src/presentation/animation/tween-group.js',
    globals,
  )({ Tween });
  const dependencies = { EventEmitter, Easing, PropertyTween, TweenGroup, ValueTween };
  const compose = factoryContext('src/application/composition/compose-ui.js', globals);
  return { ui: compose(dependencies), document };
}

test('basic UI assembly shares base types, event identity and content message contracts', () => {
  const { ui } = fixture();
  assert.equal(Object.getPrototypeOf(ui.dialogEvents), null);
  assert.equal(ui.dialogEvents.USER_CLOSE, 'u_close');
  assert.equal(ui.dialogEvents.CLOSE, 'close');
  assert.equal(ui.dialogEvents.ITEM_CLICK, 'i_click');
  assert.equal(ui.dialogEvents.CONFIRM, 'confirm');
  assert.equal(Object.getPrototypeOf(ui.BaseDialog.prototype), ui.UiComponent.prototype);
  assert.equal(Object.getPrototypeOf(ui.PreservedActionDialog.prototype), ui.BaseDialog.prototype);
  assert.equal(
    Object.getPrototypeOf(ui.MoreThingsDialog.prototype),
    ui.InteriorDesignDialog.prototype,
  );
  const panel = new ui.ContentPanel();
  panel.message('warning', ui.MessageKind.WARNING);
  assert.equal(panel.container.firstChild.innerHTML, 'warning');
  assert.equal(panel.container.firstChild.className, 'box-body-copy warning-copy');
  panel.message('success', ui.MessageKind.SUCCESS);
  assert.equal(panel.container.firstChild.className, 'box-body-copy success-copy');
});

test('action dialog preserves close timing, delegated actions and repeated listener cleanup', () => {
  const { ui, document } = fixture();
  const dialog = new ui.PreservedActionDialog('actions');
  const panel = dialog._createBody(true);
  assert.ok(panel instanceof ui.ContentPanel);
  const section = document.createElement('section');
  section.dataset.sid = 'menu';
  const button = document.createElement('button');
  button.dataset.action = 'start';
  section.append(button);
  panel.pushContent(section);
  let closes = 0;
  let userCloses = 0;
  const actions = [];
  dialog.on(ui.dialogEvents.CLOSE, (closed) => {
    assert.equal(closed, dialog);
    closes++;
  });
  dialog.on(ui.dialogEvents.USER_CLOSE, () => {
    userCloses++;
  });
  dialog.on(ui.dialogEvents.ITEM_CLICK, (...args) => actions.push(args));
  for (let index = 0; index < 3; index++) {
    dialog.activate(true).activate(true);
    dialog._closeBn.fire('click');
    assert.equal(dialog.isActive, true);
    panel.container.fire('click', { target: button });
    dialog.deactivate(true).deactivate(true);
    assert.equal(dialog._closeBn.listeners.get('click').size, 0);
    assert.equal(panel.container.listeners.get('click').size, 0);
  }
  assert.equal(closes, 3);
  assert.equal(userCloses, 3);
  assert.deepEqual(actions, [
    ['menu', 'start'],
    ['menu', 'start'],
    ['menu', 'start'],
  ]);
  dialog.blocked = true;
  assert.equal(dialog._closeBn.disabled, true);
  dialog.blocked = false;
  assert.equal(dialog._closeBn.disabled, false);
});

test('venue drawer reads shared events live and emits close only after its reverse motion completes', () => {
  const { ui, document } = fixture();
  const dialog = new ui.InteriorDesignDialog('venue');
  dialog.data({ designs: [], currentId: 'original' });
  dialog.blocked = false;
  ui.dialogEvents.USER_CLOSE = 'live-close';
  let requested = 0;
  let closed = 0;
  dialog.on('live-close', () => {
    requested++;
  });
  dialog.on(ui.dialogEvents.CLOSE, () => {
    closed++;
  });
  for (let index = 0; index < 3; index++) {
    dialog.activate(true);
    dialog.update(0);
    assert.equal(document.activeElement, dialog._closeButton);
    dialog._closeButton.fire('click');
    dialog.deactivate();
    assert.equal(closed, index);
    for (let frame = 0; frame < 60; frame++) {
      dialog.update(1 / 60);
    }
    assert.equal(closed, index + 1);
    assert.equal(document.listeners.get('keydown').size, 0);
  }
  assert.equal(requested, 3);
});

test('home menu preserves action indices, selection lifecycle and venue/about return focus', () => {
  const { ui, document } = fixture();
  const menu = new ui.SideMenu('home');
  assert.ok(menu instanceof ui.UiComponent);
  assert.deepEqual(
    Array.from(menu._bns, (button) => button.index),
    [0, 4, 1, 3, 2],
  );
  for (let index = 0; index < 3; index++) {
    menu.activate(true);
    const practice = menu._bns.find((button) => button.index === 1);
    menu.element.fire('click', { target: practice.element });
    assert.equal(menu.clickedIndex, 1);
    assert.equal(menu.isActive, false);
    assert.equal(menu.element.listeners.get('click').size, 0);
  }
  menu.activate(true);
  assert.equal(menu.clickedIndex, -1);
  assert.ok(menu._bns.every((button) => button.selected === 0));
  menu.focusInterior();
  assert.equal(document.activeElement, menu._interiorItem.element);
  menu.focusAbout();
  assert.equal(document.activeElement, menu._aboutItem.element);
});
