class EventBus {
  constructor() {
    this._listeners = /* @__PURE__ */ new Map();
    this._owners = /* @__PURE__ */ new Map();
  }
  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {(payload:any)=>void} handler
   * @param {object} [opts]
   * @param {any} [opts.owner] Optional owner token for bulk unsubscribe.
   * @returns {() => void} unsubscribe function
   */
  on(event, handler, opts = {}) {
    if (typeof handler !== "function") {
      throw new TypeError(`EventBus.on("${event}") requires a function handler`);
    }
    if (!this._listeners.has(event)) this._listeners.set(event, /* @__PURE__ */ new Set());
    this._listeners.get(event).add(handler);
    if (opts.owner) {
      if (!this._owners.has(opts.owner)) this._owners.set(opts.owner, /* @__PURE__ */ new Set());
      this._owners.get(opts.owner).add(() => this.off(event, handler));
    }
    return () => this.off(event, handler);
  }
  /**
   * Subscribe for exactly one invocation.
   * @param {string} event
   * @param {(payload:any)=>void} handler
   * @param {object} [opts]
   */
  once(event, handler, opts = {}) {
    const wrapped = (payload) => {
      this.off(event, wrapped);
      handler(payload);
    };
    return this.on(event, wrapped, opts);
  }
  /**
   * Unsubscribe a specific handler.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    this._listeners.get(event)?.delete(handler);
  }
  /**
   * Emit an event to all subscribers. Handler errors are caught and logged
   * individually so one bad listener can't break the others.
   * @param {string} event
   * @param {any} [payload]
   */
  emit(event, payload) {
    const set = this._listeners.get(event);
    if (!set || set.size === 0) return;
    for (const handler of Array.from(set)) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] listener for "${event}" threw:`, err);
      }
    }
  }
  /**
   * Remove every listener registered with a given owner token.
   * Call this from a Module's `destroy()` for automatic cleanup.
   * @param {any} owner
   */
  unsubscribeAll(owner) {
    const cleaners = this._owners.get(owner);
    if (!cleaners) return;
    cleaners.forEach((cleanup) => cleanup());
    this._owners.delete(owner);
  }
  clear() {
    this._listeners.clear();
    this._owners.clear();
  }
}
const eventBus = new EventBus();
export {
  EventBus,
  eventBus
};
