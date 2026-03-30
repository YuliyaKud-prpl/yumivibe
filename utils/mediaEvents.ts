type MediaCommand = 'play' | 'pause' | 'next' | 'previous' | 'mute' | 'unmute';
type MediaTarget = 'youtube' | 'spotify' | 'all';
type MediaCallback = (command: MediaCommand) => void;

const listeners = new Map<MediaTarget, Set<MediaCallback>>();

export function subscribeMedia(
  target: MediaTarget,
  callback: MediaCallback
): () => void {
  if (!listeners.has(target)) {
    listeners.set(target, new Set());
  }
  const targetListeners = listeners.get(target)!;
  targetListeners.add(callback);

  return () => {
    targetListeners.delete(callback);
    if (targetListeners.size === 0) {
      listeners.delete(target);
    }
  };
}

export function publishMedia(
  target: MediaTarget,
  command: MediaCommand
): void {
  if (target === 'all') {
    listeners.forEach((cbs) => cbs.forEach((cb) => cb(command)));
    return;
  }
  const targetListeners = listeners.get(target);
  if (!targetListeners) return;
  targetListeners.forEach((cb) => cb(command));
}
