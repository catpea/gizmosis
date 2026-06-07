/** Generic browser-resource helpers for generated Gizmo components. */
export function createDisposables() {
  const callbacks = new Set();
  return {
    add(callback) {
      if (typeof callback === 'function') callbacks.add(callback);
      return callback;
    },
    dispose() {
      for (const callback of Array.from(callbacks).reverse()) {
        try { callback(); } finally { callbacks.delete(callback); }
      }
    }
  };
}

export function listen(target, eventName, handler, options, disposables) {
  if (!target) return () => {};
  target.addEventListener(eventName, handler, options);
  const dispose = () => target.removeEventListener(eventName, handler, options);
  disposables?.add(dispose);
  return dispose;
}

export function observeResize(target, callback, disposables) {
  if (!target || typeof ResizeObserver === 'undefined') return () => {};
  const observer = new ResizeObserver(callback);
  observer.observe(target);
  const dispose = () => observer.disconnect();
  disposables?.add(dispose);
  return dispose;
}

export function createFrameScheduler(callback, { settle = 0 } = {}) {
  let frame = 0;
  let settleFrame = 0;
  const cancel = () => {
    if (frame) cancelAnimationFrame(frame);
    if (settleFrame) cancelAnimationFrame(settleFrame);
    frame = 0;
    settleFrame = 0;
  };
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      callback();
      if (settle > 0) {
        if (settleFrame) cancelAnimationFrame(settleFrame);
        settleFrame = requestAnimationFrame(() => {
          settleFrame = 0;
          callback();
        });
      }
    });
  };
  schedule.cancel = cancel;
  return schedule;
}
