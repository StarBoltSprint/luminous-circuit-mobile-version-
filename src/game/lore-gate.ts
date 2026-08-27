/** Civic fence for visions. Any change may be proposed if it keeps leftover Charge. */

const FORBIDDEN = /\b(hall|chrome|toll|paywall|nft|token-gate|kill|scoreboard|leaderboard|ads?|casino|gun|blood)\b/i;
const NEEDLE = /\b(leftover|howl|charge|crystal|den|span|hail|canal|kiln|witness|circuit|lore|light|fog|sky|palette|craft)\b/i;

export type VisionKind = "crystal" | "graphic" | "law";

export function loreCheck(raw: string): { ok: boolean; reason: string } {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (text.length < 8) return { ok: false, reason: "Say the change. A short law is enough." };
  if (FORBIDDEN.test(text)) return { ok: false, reason: "That breaks leftover Charge. No Hall. No chrome. No toll." };
  return { ok: true, reason: "The den can hear this." };
}

export function visionKind(raw: string): VisionKind {
  const low = String(raw || "").toLowerCase();
  if (/\b(fog|sky|light|bloom|palette|color|colour|dusk|dawn|night|gold hour|texture|shader|glow)\b/.test(low)) return "graphic";
  if (/\b(kiln|canal|span|bridge|den|house|grove|orchard|lamp|tablet|weir|arch)\b/.test(low)) return "crystal";
  if (/\b(brain|personality|bolt brain|lines\.json|speak\.py)\b/.test(low)) return "law";
  return "law";
}

export function graphicPreview(raw: string): { fog: number; density: number } {
  const low = String(raw || "").toLowerCase();
  if (/\b(night|dusk|dark)\b/.test(low)) return { fog: 0x07091c, density: 0.00028 };
  if (/\b(gold|dawn|warm)\b/.test(low)) return { fog: 0x1a1408, density: 0.00018 };
  if (/\b(cyan|cool|river)\b/.test(low)) return { fog: 0x04141c, density: 0.00016 };
  if (/\b(bright|clear|noon)\b/.test(low)) return { fog: 0x10141c, density: 0.00008 };
  return { fog: 0x0c1020, density: 0.0002 };
}

export { NEEDLE };
