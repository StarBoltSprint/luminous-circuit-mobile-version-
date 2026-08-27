export type Actions = {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  howl: boolean;
  talk: boolean;
  sprint: boolean;
  pause: boolean;
};

export type InputHandle = {
  actions: Actions;
  justPressed: { talk: boolean; pause: boolean; howl: boolean; eye: boolean };
  setMoveStick: (x: number, y: number) => void;
  setLookStick: (x: number, y: number) => void;
  setHowl: (v: boolean) => void;
  setTalkHeld: (v: boolean) => void;
  setEye: () => void;
  beginFrame: () => void;
  dispose: () => void;
  keys: Set<string>;
};

const empty = (): Actions => ({
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  howl: false,
  talk: false,
  sprint: false,
  pause: false,
});

function radial(x: number, y: number, dz = 0.14) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = ((m - dz) / (1 - dz)) / m;
  const nx = x * scale;
  const ny = y * scale;
  const mag = Math.hypot(nx, ny);
  if (mag > 1) return { x: nx / mag, y: ny / mag };
  return { x: nx, y: ny };
}

export function createInput(target: HTMLElement): InputHandle {
  const keys = new Set<string>();
  const stickMove = { x: 0, y: 0 };
  const stickLook = { x: 0, y: 0 };
  let howlBtn = false;
  let talkBtn = false;
  let eyeBtn = false;
  const prev = { talk: false, pause: false, howl: false, eye: false };
  const actions = empty();
  const justPressed = { talk: false, pause: false, howl: false, eye: false };

  const GAME_KEYS = new Set([
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Space",
    "ShiftLeft",
    "ShiftRight",
    "KeyE",
    "KeyF",
    "KeyH",
    "KeyT",
    "KeyI",
    "Escape",
    "KeyP",
    "KeyM",
    "KeyL",
    "KeyJ",
    "KeyK",
    "KeyQ",
    "KeyU",
    "KeyO",
    "KeyR",
    "KeyG",
    "KeyB",
    "KeyN",
    "KeyC",
    "KeyV",
    "KeyX",
    "KeyZ",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Digit0",
    "Minus",
    "Equal",
    "BracketLeft",
    "BracketRight",
    "Backslash",
    "Semicolon",
    "Quote",
    "Comma",
    "Period",
    "KeyY",
    "Tab",
  ]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat && (e.code === "Space" || e.code === "KeyH" || e.code === "KeyP" || e.code === "Escape" || e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "KeyW" || e.code === "KeyA" || e.code === "KeyS" || e.code === "KeyD" || e.code === "KeyE" || e.code === "KeyF" || e.code === "KeyT" || e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyM" || e.code === "KeyL" || e.code === "KeyJ" || e.code === "Tab" || e.code === "KeyI" || e.code === "KeyK" || e.code === "KeyQ" || e.code === "KeyU" || e.code === "KeyO" || e.code === "KeyR" || e.code === "KeyG" || e.code === "KeyB" || e.code === "KeyN" || e.code === "KeyC" || e.code === "KeyV" || e.code === "KeyX" || e.code === "KeyZ" || e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3" || e.code === "Digit4" || e.code === "Digit5" || e.code === "Digit6" || e.code === "Digit7" || e.code === "Digit8" || e.code === "Digit9" || e.code === "Digit0" || e.code === "Minus" || e.code === "Equal" || e.code === "BracketLeft" || e.code === "BracketRight" || e.code === "Backslash" || e.code === "Semicolon" || e.code === "Quote" || e.code === "Comma" || e.code === "Period" || e.code === "KeyY")) { e.preventDefault(); return; }
    keys.add(e.code);
    if (GAME_KEYS.has(e.code)) e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };
  const clearKeys = () => keys.clear();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);
  const visHide = () => {
    if (document.hidden) clearKeys();
  };
  document.addEventListener("visibilitychange", visHide);
  window.addEventListener("pagehide", clearKeys);
  window.addEventListener("pageshow", clearKeys);
  window.addEventListener("offline", clearKeys);

  const handle: InputHandle = {
    actions,
    justPressed,
    keys,
    setMoveStick(x, y) {
      const r = radial(x, y);
      stickMove.x = r.x;
      stickMove.y = r.y;
    },
    setLookStick(x, y) {
      const r = radial(x, y, 0.08);
      stickLook.x = r.x;
      stickLook.y = r.y;
    },
    setHowl(v) {
      howlBtn = v;
    },
    setTalkHeld(v) {
      talkBtn = v;
    },
    setEye() {
      eyeBtn = true;
    },
    beginFrame() {
      // WASD = on-foot: W forward, S back, A left strafe, D right strafe
      let mx = stickMove.x;
      let my = stickMove.y;
      if (keys.has("KeyA")) mx -= 1;
      if (keys.has("KeyD")) mx += 1;
      if (keys.has("KeyW")) my += 1;
      if (keys.has("KeyS")) my -= 1;
      const mv = radial(mx, my, 0.02);
      actions.moveX = mv.x;
      actions.moveY = mv.y;

      // Arrows / right stick = look
      let lx = stickLook.x;
      let ly = stickLook.y;
      if (keys.has("ArrowLeft")) lx -= 1;
      if (keys.has("ArrowRight")) lx += 1;
      if (keys.has("ArrowUp")) ly += 1;
      if (keys.has("ArrowDown")) ly -= 1;
      const lk = radial(lx, ly, 0.02);
      actions.lookX = lk.x;
      actions.lookY = lk.y;

      actions.sprint =
        keys.has("ShiftLeft") || keys.has("ShiftRight") || Math.hypot(mv.x, mv.y) > 0.92;
      actions.howl = howlBtn || keys.has("Space") || keys.has("KeyH");
      actions.talk = talkBtn || keys.has("KeyE") || keys.has("KeyF") || keys.has("KeyT");
      actions.pause = keys.has("Escape") || keys.has("KeyP");
      const eyeHeld = eyeBtn || keys.has("KeyY");
      justPressed.talk = actions.talk && !prev.talk;
      justPressed.pause = actions.pause && !prev.pause;
      justPressed.howl = actions.howl && !prev.howl;
      justPressed.eye = eyeHeld && !prev.eye;
      prev.talk = actions.talk;
      prev.pause = actions.pause;
      prev.howl = actions.howl;
      prev.eye = eyeHeld;
      eyeBtn = false;

      void target;
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", visHide);
      window.removeEventListener("pagehide", clearKeys);
      window.removeEventListener("pageshow", clearKeys);
      window.removeEventListener("offline", clearKeys);
    },
  };

  return handle;
}
