export interface PageHandlers {
  onScroll(): void;
  /** The stage element changed size (window resize, browser bars). */
  onStageResize(): void;
  /** The page content reflowed (rotation, fonts): lift travels need re-measuring. */
  onLayoutChange(): void;
  onVisibility(hidden: boolean): void;
  onContextLost(): void;
}

/** Window, document and canvas listeners the engine needs. Returns unbind. */
export function bindPage(
  doc: Document,
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
  handlers: PageHandlers,
): () => void {
  const win = doc.defaultView ?? window;
  const onVisibility = () => handlers.onVisibility(doc.hidden);
  const onContextLost = (event: Event) => {
    event.preventDefault();
    handlers.onContextLost();
  };
  const stageObserver = new ResizeObserver(() => handlers.onStageResize());
  const layoutObserver = new ResizeObserver(() => handlers.onLayoutChange());
  stageObserver.observe(stage);
  const main = doc.querySelector('main.tower');
  if (main) layoutObserver.observe(main);
  win.addEventListener('scroll', handlers.onScroll, { passive: true });
  doc.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onContextLost);
  return () => {
    stageObserver.disconnect();
    layoutObserver.disconnect();
    win.removeEventListener('scroll', handlers.onScroll);
    doc.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onContextLost);
  };
}
