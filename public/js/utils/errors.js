import { showToast } from "../modules/shell/toast.js";
function guarded(moduleName, actionName, fn) {
  return function guardedFn(...args) {
    try {
      return fn.apply(this, args);
    } catch (err) {
      console.error(`[${moduleName}] ${actionName} failed:`, err);
      showToast(`Something went wrong in ${moduleName} (${actionName}).`, "danger");
      return void 0;
    }
  };
}
function guardedAsync(moduleName, actionName, fn) {
  return async function guardedAsyncFn(...args) {
    try {
      return await fn.apply(this, args);
    } catch (err) {
      console.error(`[${moduleName}] ${actionName} failed:`, err);
      showToast(`Something went wrong in ${moduleName} (${actionName}).`, "danger");
      return void 0;
    }
  };
}
export {
  guarded,
  guardedAsync
};
