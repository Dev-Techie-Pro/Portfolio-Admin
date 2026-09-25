/**
 * StateStore — small reactive state container.
 *
 * Replaces scattered globals (`let PROJECTS = []`, `let searchQuery = ''`, …)
 * with one object per module, wrapped in a `Proxy` so mutations trigger
 * subscriber callbacks automatically — no manual `renderXGrid()` calls
 * sprinkled after every mutation.
 *
 * Batching: multiple synchronous mutations inside `store.batch(fn)` collapse
 * into a single notification, fired on the next microtask. This avoids
 * re-rendering a grid 9 times when seeding 9 projects, for example.
 *
 * @example
 *   const state = new StateStore({ items: [], query: '', page: 1 });
 *   state.subscribe((next, prev, changedKeys) => renderGrid(next));
 *   state.set('query', 'traveler');       // triggers one notification
 *   state.batch(() => {                    // triggers exactly one notification
 *     state.set('items', [...]);
 *     state.set('page', 1);
 *   });
 */
export class StateStore {
  /**
   * @param {object} initialState
   */
  constructor(initialState = {}) {
    this._subscribers = new Set();
    this._batching = false;
    this._dirtyKeys = new Set();
    this._scheduled = false;
    this._raw = { ...initialState };

    this.state = new Proxy(this._raw, {
      set: (target, key, value) => {
        if (target[key] === value) return true;
        const prev = target[key];
        target[key] = value;
        this._dirtyKeys.add(key);
        this._scheduleNotify(prev);
        return true;
      },
      deleteProperty: (target, key) => {
        if (!(key in target)) return true;
        delete target[key];
        this._dirtyKeys.add(key);
        this._scheduleNotify();
        return true;
      },
    });
  }

  get(key) {
    return this._raw[key];
  }

  set(key, value) {
    this.state[key] = value;
    return this;
  }

  update(patch) {
    this.batch(() => {
      Object.entries(patch).forEach(([k, v]) => { this.state[k] = v; });
    });
    return this;
  }

  /**
   * Run `fn` with notifications suppressed until it returns, then fire once.
   * Nested batches are safe — only the outermost flushes.
   * @param {() => void} fn
   */
  batch(fn) {
    const alreadyBatching = this._batching;
    this._batching = true;
    try {
      fn();
    } finally {
      if (!alreadyBatching) {
        this._batching = false;
        this._flush();
      }
    }
  }

  /**
   * Subscribe to state changes.
   * @param {(state: object, changedKeys: string[]) => void} fn
   * @returns {() => void} unsubscribe
   */
  subscribe(fn) {
    this._subscribers.add(fn);
    return () => this._subscribers.delete(fn);
  }

  _scheduleNotify() {
    if (this._batching) return;
    if (this._scheduled) return;
    this._scheduled = true;
    Promise.resolve().then(() => this._flush());
  }

  _flush() {
    this._scheduled = false;
    if (this._dirtyKeys.size === 0) return;
    const changed = Array.from(this._dirtyKeys);
    this._dirtyKeys.clear();
    this._subscribers.forEach((fn) => {
      try {
        fn(this._raw, changed);
      } catch (err) {
        console.error('[StateStore] subscriber threw:', err);
      }
    });
  }
}
