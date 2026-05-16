/**
 * LocalStorage helpers für den Learning-Layer.
 *
 * Jede ExplainerBox merkt sich "schon mal gesehen" pro Schlüssel, damit
 * sie beim ersten Besuch aufgeklappt erscheint und danach standardmäßig
 * kollabiert ist. State liegt in localStorage unter dem Prefix
 * `climbr:learning:`.
 *
 * Diese Funktionen sind SSR-/Test-sicher: wenn `window` nicht existiert
 * (Node-Umgebung in Vitest), werden sie zu No-Ops.
 */

const PREFIX = "climbr:learning:";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Returns whether the user has previously interacted with this explainer.
 * "Seen" = true means: collapse by default. "Seen" = false means: this is
 * a first encounter — open it for the user.
 */
export function hasSeenExplainer(key: string): boolean {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(PREFIX + key) === "1";
}

export function markExplainerSeen(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(PREFIX + key, "1");
}

/**
 * Test helper — clears all learning-layer keys. Not exposed to the UI.
 */
export function _clearLearningState(): void {
  const storage = getStorage();
  if (!storage) return;
  const toDelete: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(PREFIX)) toDelete.push(k);
  }
  for (const k of toDelete) storage.removeItem(k);
}
