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
  justPressed: { talk: boolean; pause: boolean; howl: boolean };
  setMoveStick: (x: number, y: number) => void;
  setLookStick: (x: number, y: number) => void;
  setHowl: (v: boolean) => void;
  setTalkHeld: (v: boolean) => void;
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
  const prev = { talk: false, pause: false, howl: false };
  const actions = empty();
  const justPressed = { talk: false, pause: false, howl: false };

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
  ]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat && (e.code === "Space" || e.code === "KeyH")) { e.preventDefault(); return; }
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

      justPressed.talk = actions.talk && !prev.talk;
      justPressed.pause = actions.pause && !prev.pause;
      justPressed.howl = actions.howl && !prev.howl;
      prev.talk = actions.talk;
      prev.pause = actions.pause;
      prev.howl = actions.howl;

      void target;
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", visHide);
    },
  };

  return handle;
}
