export function createFrameScheduler(callback, { settle = 0 } = {}) {
  let frame = 0;
  let settleFrame = 0;
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
  schedule.cancel = () => {
    if (frame) cancelAnimationFrame(frame);
    if (settleFrame) cancelAnimationFrame(settleFrame);
    frame = 0;
    settleFrame = 0;
  };
  return schedule;
}
