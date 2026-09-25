import { eventBus } from './EventBus.js';
import { storage } from './StorageService.js';
import { StateStore } from './StateStore.js';
import { $, $all } from '../utils/dom.js';
import { showToast, showStatusToast } from '../modules/shell/toast.js';
import { addNotification } from '../modules/shell/notifications.js';

export type ModuleOptions = {
  name?: string;
  storageKey?: string | null;
  initialState?: Record<string, unknown>;
};

/**
 * Module — base class every feature module (Projects, Categories, …) extends.
 *
 * Standardizes:
 *  - `storageKey` -> automatic load/save through {@link StorageService}.
 *  - a {@link StateStore} instance (`this.store`) for reactive local state.
 *  - DOM helpers scoped to `document` (`$`, `$all`) plus `on()` for listener
 *    registration that is auto-removed in `destroy()`.
 *  - `init() -> load() -> render() -> bindEvents()` as the standard startup
 *    sequence, invoked by the router in `main.js`.
 *  - `destroy()` for SPA-style teardown (unsubscribes bus + DOM listeners).
 *
 * Subclasses typically override: `seedData()`, `render()`, `bindEvents()`,
 * and any CRUD-specific methods.
 */
export class Module {
  name: string;
  storageKey: string | null;
  store: StateStore;
  _domListeners: Array<{
    el: EventTarget;
    type: string;
    handler: EventListener;
    options?: boolean | AddEventListenerOptions;
  }>;
  _destroyed: boolean;

  constructor({ name, storageKey = null, initialState = {} }: ModuleOptions = {}) {
    this.name = name || this.constructor.name;
    this.storageKey = storageKey;
    this.store = new StateStore(initialState);
    this._domListeners = [];
    this._destroyed = false;
    this.log(`constructed`);
  }

  async init() {
    this.log('init');
    await this.load();
    this.render();
    this.bindEvents();
  }

  async load() {}

  render() {}
  bindEvents() {}
  destroy() {
    if (this._destroyed) return;
    this._domListeners.forEach(({ el, type, handler, options }) => {
      el.removeEventListener(type, handler, options);
    });
    this._domListeners = [];
    eventBus.unsubscribeAll(this);
    this._destroyed = true;
    this.log('destroyed');
  }

  /**
   * Load this module's records from storage, falling back to `seedFn()`
   * (typically a function returning a copy of seed/demo data) when nothing
   * is persisted yet.
   * @param {() => any} seedFn
   */
  async loadRecords(seedFn) {
    if (!this.storageKey) throw new Error(`${this.name}: loadRecords() requires storageKey`);
    const value = await storage.get(this.storageKey, null);
    if (value !== null) return value;
    return seedFn();
  }

  async saveRecords(data, { feedback = true } = {}) {
    if (!this.storageKey) throw new Error(`${this.name}: saveRecords() requires storageKey`);
    if (feedback) showStatusToast('Saving changes…', 'info', 120000);
    try {
      await storage.set(this.storageKey, data);
      storage.invalidate('pa_recent_activities');
      storage.invalidate('pa_notifications');
    } catch (err) {
      this.logError('save failed', err);
      showStatusToast(err?.message || `Could not save ${this.name.toLowerCase()}. Please try again.`, 'danger');
      throw err;
    }
  }

  $(selector, scope = document) {
    return $(selector, scope);
  }

  $all(selector, scope = document) {
    return $all(selector, scope);
  }

  /**
   * Add a DOM listener that is automatically removed in `destroy()`.
   * @param {EventTarget|null} el
   * @param {string} type
   * @param {Function} handler
   * @param {boolean|AddEventListenerOptions} [options]
   */
  on(
    el: EventTarget | null,
    type: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (!el) return;
    el.addEventListener(type, handler, options);
    this._domListeners.push({ el, type, handler, options });
  }

  onBus(event, handler) {
    eventBus.on(event, handler, { owner: this });
  }

  emit(event, payload) {
    eventBus.emit(event, payload);
  }

  toast(msg, type = 'info', duration) {
    showToast(msg, type, duration);
  }

  statusToast(msg, type = 'info', duration) {
    showStatusToast(msg, type, duration);
  }

  notify(text, icon, options) {
    void addNotification(text, icon, options);
  }

  log(...args) {
  }

  logError(...args) {
    console.error(`[${this.name}]`, ...args);
  }
}
