import { showToast } from '../modules/shell/toast.js';

/**
 * Wrap a function so thrown errors are caught, logged with module context,
 * and surfaced as a toast instead of propagating and breaking other modules.
 * @param {string} moduleName
 * @param {string} actionName
 * @param {Function} fn
 */
export function guarded(moduleName, actionName, fn) {
  return function guardedFn(...args) {
    try {
      return fn.apply(this, args);
    } catch (err) {
      console.error(`[${moduleName}] ${actionName} failed:`, err);
      showToast(`Something went wrong in ${moduleName} (${actionName}).`, 'danger');
      return undefined;
    }
  };
}

export function guardedAsync(moduleName, actionName, fn) {
  return async function guardedAsyncFn(...args) {
    try {
      return await fn.apply(this, args);
    } catch (err) {
      console.error(`[${moduleName}] ${actionName} failed:`, err);
      showToast(`Something went wrong in ${moduleName} (${actionName}).`, 'danger');
      return undefined;
    }
  };
}
