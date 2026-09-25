import { eventBus } from './EventBus.js';

let __componentUid = 0;

/**
 * Component — base class for a piece of UI bound to one DOM container.
 *
 * Lifecycle: `beforeMount -> afterMount -> [beforeUpdate -> afterUpdate]* -> beforeUnmount`.
 *
 * @example
 *   class Toast extends Component {
 *     template({ items }) {
 *       return items.map(i => `<div class="toast">${i}</div>`).join('');
 *     }
 *   }
 *   const toast = new Toast(document.getElementById('paToastWrap'));
 *   toast.setState({ items: [] });
 */
export class Component {
  /**
   * @param {HTMLElement} el Mount point. Its innerHTML is fully owned by this component.
   * @param {object} [props]
   */
  constructor(el, props = {}) {
    if (!el) throw new Error('Component requires a mount element');
    this.el = el;
    this.props = props;
    this.state = {};
    this.uid = `c${++__componentUid}`;
    this._mounted = false;
    this._delegatedEvents = new Map(); 
    this._busUnsubs = [];
  }

  template(/* state */) {
    return '';
  }

  beforeMount() {}
  afterMount() {}
  beforeUpdate() {}
  afterUpdate() {}
  beforeUnmount() {}

  setState(patch) {
    this.state = { ...this.state, ...patch };
    if (!this._mounted) {
      this.mount();
    } else {
      this.beforeUpdate();
      this._paint();
      this.afterUpdate();
    }
  }

  mount() {
    if (this._mounted) return;
    this.beforeMount();
    this._paint();
    this._mounted = true;
    this.afterMount();
  }

  _paint() {
    this.el.innerHTML = this.template(this.state);
  }

  /**
   * Attach a single delegated listener on the container for `type`, filtered
   * by `selector`. Re-renders don't require re-binding since the listener
   * lives on `this.el`, not on the (replaced) children.
   * @param {string} type
   * @param {string} selector
   * @param {(e: Event, target: HTMLElement) => void} handler
   */
  on(type, selector, handler) {
    const listener = (e) => {
      const target = e.target.closest(selector);
      if (target && this.el.contains(target)) handler(e, target);
    };
    this.el.addEventListener(type, listener);
    if (!this._delegatedEvents.has(type)) this._delegatedEvents.set(type, []);
    this._delegatedEvents.get(type).push(listener);
  }

  onBus(event, handler) {
    this._busUnsubs.push(eventBus.on(event, handler));
  }

  unmount() {
    if (!this._mounted) return;
    this.beforeUnmount();
    this._delegatedEvents.forEach((listeners, type) => {
      listeners.forEach((l) => this.el.removeEventListener(type, l));
    });
    this._delegatedEvents.clear();
    this._busUnsubs.forEach((unsub) => unsub());
    this._busUnsubs = [];
    this.el.innerHTML = '';
    this._mounted = false;
  }
}
