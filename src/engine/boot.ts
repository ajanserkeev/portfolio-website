import { bus } from './events';
import { readTierSignals } from './signals';
import { decideTier, motionPolicy, parseTierOverride, type Tier } from './tiers';

const MODE_KEY = 'tower:mode';

/** The visitor's explicit choice: 'static' = no 3D, 'live' = 3D even where we would pick static. */
export type StoredMode = 'static' | 'live';

type ModeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function safeLocalStorage(): ModeStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredMode(storage: ModeStorage | null): StoredMode | null {
  try {
    const value = storage?.getItem(MODE_KEY);
    return value === 'static' || value === 'live' ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredMode(storage: ModeStorage | null, mode: StoredMode): void {
  try {
    storage?.setItem(MODE_KEY, mode);
  } catch {
    // Storage blocked: the choice still survives reloads through the ?tier= parameter.
  }
}

/** URL beats the stored choice; a stored 'live' only matters where we would pick static. */
export function resolveOverride(
  forced: Tier | null,
  stored: StoredMode | null,
  auto: Tier,
): Tier | null {
  if (forced) return forced;
  if (stored === 'static') return 'static';
  if (stored === 'live' && auto === 'static') return 'lite';
  return null;
}

function setTier(tier: Tier): void {
  document.documentElement.dataset.tier = tier;
  bus.emit({ type: 'tier:changed', tier });
}

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => resolve(), { timeout: 1200 });
    } else {
      window.setTimeout(resolve, 200);
    }
  });
}

function wireModeToggle(
  tier: Tier,
  auto: Tier,
  webgl2: boolean,
  storage: ModeStorage | null,
): void {
  const button = document.querySelector<HTMLButtonElement>('[data-mode-toggle]');
  if (!button) return;
  if (!webgl2) {
    button.hidden = true;
    return;
  }
  const isStatic = tier === 'static';
  button.textContent =
    (isStatic ? button.dataset.labelLive : button.dataset.labelStatic) ?? button.textContent;
  button.setAttribute('aria-pressed', String(isStatic));
  button.addEventListener('click', () => {
    const next: StoredMode = isStatic ? 'live' : 'static';
    writeStoredMode(storage, next);
    // Mirror the choice in the URL so it also works when storage is blocked.
    const url = new URL(window.location.href);
    if (next === 'static') url.searchParams.set('tier', 'static');
    else if (auto === 'static') url.searchParams.set('tier', 'lite');
    else url.searchParams.delete('tier');
    window.location.replace(url.toString());
  });
}

export async function boot(): Promise<void> {
  const stage = document.getElementById('stage');
  const storage = safeLocalStorage();
  const params = new URLSearchParams(window.location.search);
  const forced = parseTierOverride(window.location.search);
  const signals = readTierSignals(window);
  const auto = decideTier({ ...signals, override: null });
  const tier = decideTier({
    ...signals,
    override: resolveOverride(forced, readStoredMode(storage), auto),
  });
  const motion = motionPolicy(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  document.documentElement.dataset.motion = motion.camera === 'cut' ? 'reduced' : 'full';
  setTier(tier);
  wireModeToggle(tier, auto, signals.webgl2, storage);
  if (tier === 'static' || !stage) return;

  await whenIdle();
  try {
    const { startTower } = await import('./app');
    let handle: { destroy(): void } | null = null;
    handle = await startTower({
      stage,
      tier,
      motion,
      probeFps: forced === null,
      debug: params.has('debug'),
      onFallback: () => {
        handle?.destroy();
        setTier('static');
      },
    });
  } catch (error) {
    console.warn('[tower] 3D could not start; staying in static mode', error);
    setTier('static');
  }
}
