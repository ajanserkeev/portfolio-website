import { type AnimationAction, type AnimationClip, AnimationMixer, type Object3D } from 'three';

export interface ActorOptions {
  clip: string;
  /** Playback rate, 1 = as authored. */
  speed: number;
  /** Seconds into the clip to start at, so a crowd does not move in lockstep. */
  phase: number;
}

export interface Actor {
  readonly root: Object3D;
  readonly clip: string;
  update(dtSeconds: number): void;
  /** Cross-fades to another clip; unknown names fall back to 'idle'. */
  play(clip: string, fadeSeconds?: number): void;
  dispose(): void;
}

/** One person from the cast: an AnimationMixer over a cloned skeleton. */
export function createActor(
  root: Object3D,
  clips: ReadonlyMap<string, AnimationClip>,
  options: ActorOptions,
): Actor {
  const mixer = new AnimationMixer(root);
  mixer.timeScale = options.speed;
  let disposed = false;
  let name = '';
  let action: AnimationAction | null = null;

  const resolve = (clip: string) => (clips.has(clip) ? clip : 'idle');

  function play(clip: string, fadeSeconds = 0): void {
    const next = resolve(clip);
    const source = clips.get(next);
    if (disposed || !source || next === name) return;
    const incoming = mixer.clipAction(source).reset().play();
    if (action && fadeSeconds > 0) action.crossFadeTo(incoming, fadeSeconds, false);
    else action?.stop();
    action = incoming;
    name = next;
  }

  play(options.clip);
  // Pose the first frame now: until the floor animates (or forever with reduced motion) the
  // person stands in a pose instead of the rig's T-pose. (play() assigned `action`.)
  const first = action as AnimationAction | null;
  if (first) first.time = options.phase;
  mixer.update(0);

  return {
    root,
    get clip() {
      return name;
    },
    update(dtSeconds: number): void {
      if (!disposed) mixer.update(dtSeconds);
    },
    play,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}
