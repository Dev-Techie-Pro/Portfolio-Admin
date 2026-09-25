export function debounce(fn, wait) {
  let t;
  return function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

export function throttle(fn, wait) {
  let last = 0;
  let pendingArgs = null;
  let timer = null;
  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    pendingArgs = args;
    if (remaining <= 0) {
      last = now;
      fn.apply(this, pendingArgs);
      pendingArgs = null;
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        if (pendingArgs) fn.apply(this, pendingArgs);
        pendingArgs = null;
      }, remaining);
    }
  };
}

export function rafScheduler(fn) {
  let scheduled = false;
  return function schedule(...args) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      fn.apply(this, args);
    });
  };
}
