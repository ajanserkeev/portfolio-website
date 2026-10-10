import type { TierSignals } from './tiers';

interface NavigatorHints {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Reads what the browser can do. Creates and immediately releases a probe WebGL2 context. */
export function readTierSignals(win: Window): Omit<TierSignals, 'override'> {
  const nav = win.navigator as Navigator & NavigatorHints;
  let webgl2 = false;
  let gpu: string | null = null;
  try {
    const gl = win.document.createElement('canvas').getContext('webgl2');
    if (gl) {
      webgl2 = true;
      const basic = String(gl.getParameter(gl.RENDERER));
      const info = /webkit webgl|mozilla/i.test(basic)
        ? gl.getExtension('WEBGL_debug_renderer_info')
        : null;
      gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : basic;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    webgl2 = false;
  }
  return {
    webgl2,
    gpu,
    saveData: nav.connection?.saveData === true,
    deviceMemoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
  };
}
