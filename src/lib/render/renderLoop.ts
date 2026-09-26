/**
 * A requestAnimationFrame loop that can be started / stopped by its owner
 * and automatically pauses while the page (tab) is hidden.
 *
 * `start()` / `stop()` express whether the owner WANTS frames; the loop only
 * runs when that is true AND the document is visible.
 */
export type RenderLoop = {
  start: () => void;
  stop: () => void;
  readonly running: boolean;
  dispose: () => void;
};

export function createRenderLoop(
  frame: (now: number) => void,
  hooks: { onResume?: () => void; onPause?: () => void } = {},
): RenderLoop {
  let raf = 0;
  let running = false;
  let wanted = false;
  let disposed = false;
  // Driven by visibilitychange events only. Browsers already suspend rAF in
  // background tabs; trusting the initial `document.hidden` would leave the
  // scene black in embedded webviews that misreport it while painting.
  let pageHidden = false;

  const loop = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    frame(now);
  };

  const onVisibility = () => {
    pageHidden = document.visibilityState === "hidden";
    sync();
  };

  const sync = () => {
    const should = wanted && !disposed && !pageHidden;
    if (should && !running) {
      running = true;
      hooks.onResume?.();
      raf = requestAnimationFrame(loop);
    } else if (!should && running) {
      running = false;
      cancelAnimationFrame(raf);
      hooks.onPause?.();
    }
  };

  document.addEventListener("visibilitychange", onVisibility);

  return {
    start() {
      wanted = true;
      sync();
    },
    stop() {
      wanted = false;
      sync();
    },
    get running() {
      return running;
    },
    dispose() {
      disposed = true;
      sync();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
