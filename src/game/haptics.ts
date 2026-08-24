/** Samsung-safe civic buzz. No throw. Mute follows audio. */

let muted = false;

const PATTERNS: Record<string, number[]> = {
  howl: [40, 30, 80],
  land: [18, 40, 18],
  grow: [12],
  walk: [8],
  talk: [8],
  hail: [14, 24, 14],
  gate: [16, 20, 16],
  kiln: [20, 16, 20],
};

export function setHapticMuted(m: boolean) {
  muted = m;
}

export function buzz(kind: keyof typeof PATTERNS | string) {
  if (muted) return;
  try {
    const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    if (typeof nav.vibrate !== "function") return;
    nav.vibrate(PATTERNS[kind] ?? [10]);
  } catch {
    /* Samsung / denied vibration */
  }
}
