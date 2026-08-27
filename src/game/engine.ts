// @ts-nocheck
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createAudio } from "./audio";
import { createInput, type InputHandle } from "./input";
import { HUB, LORE, DISTRICTS } from "./lore";
import { loadSave, writeSave, type SaveData, type SeasonLine } from "./save";
import { jobLabel, talkReply, assignHonor, callGather, callWard, noteLive, takeLive, pulseCityMind, applyCityBrief, crewLine, kilnSites, takeKilnFires, marketSnap, type LiveEvent, type BriefOrder } from "./living";
import { buildWorld } from "./world";
import { judgeCommission, type CommissionResult } from "./agents";
import type { BuildPiece } from "./build-spec";
import { readShape } from "./build-spec";
import { addCharge, defaultLedger, HOWL_YIELD, CITY_CAP, simulateAway, tryWrite, type Ledger } from "./society";
import { resolveHowl, enactCivic, howlVerb, civicBrief } from "./civic";
import { gradeHowl, howlMult, gradeLine, aimingParent, markStood, dutyDone, talkWitness, stillHowl, shapeFits, markChain } from "./play";
import { cityRig, keeperRig, mixRig, EYE_SEC, clampPull } from "./eye";
import { canBirthToday, markBornToday, canPeerBirth, markPeerBirth, canPeerGrow, markPeerGrow, interpretGrow, loadFolkBook, writeFolkBook, writeLastWish, skillOf, interpretWish, type FolkPost } from "./inhabit";
import { tickCrafts, grokBuildBrief } from "./crafts";
import { pickLine, activePack, loadDraft, saveDraft, submitDraft, voteSubmit, makeLive, setPreview, loadQueue } from "./bolt-brain";

export type HudSnap = {
  zone: string | null;
  zoneTag: string | null;
  resonance: number;
  howls: number;
  nearby: { id: string; name: string; role: string; line: string; job: string } | null;
  howlProgress: number;
  howlGrade?: string;
  stood?: number;
  howlHint?: string;
  witness?: boolean;
  still?: boolean;
  atHub: boolean;
  toast: string | null;
  heading: number;
  visited: string[];
  talked: number;
  talkTotal: number;
  builds: string[];
  structures: number;
  lastCode: string;
  log: SeasonLine[];
  living: { id: string; name: string; role: string; job: string; crafted: number; intent: string }[];
  folk: { total: number; walking: number; building: number; idle: number };
  px: number;
  pz: number;
  crystal: { shape: string; x: number; z: number; rot?: number }[];
  people: { id: string; name: string; x: number; z: number; job: string; keeper: boolean }[];
  stock: { charge: number; crystal: number; scripture: number; rate: number; bids: number; line: string };
  live: { at: number; id: string; name: string; kind: string; text: string }[];
  crew: string | null;
  kilns: { x: number; z: number; hot: boolean }[];
  reading: { shape: string; title: string; means: string } | null;
  mode: "title" | "play" | "pause";
  eye: "city" | "keeper";
  eyeKeeper: string;
  debug: { fps: number; bug: string; citizens: number; building: number; structures: number };
  away: string | null;
};

export type EngineHandle = {
  dispose: () => void;
  setMode: (m: "title" | "play" | "pause") => void;
  land: () => void;
  reset: () => void;
  commission: (agentId: string, workId: string, line?: string) => CommissionResult;
  grow: (agentId: string, pieces: BuildPiece[], line: string, code: string) => number;
  speak: (agentId: string, line: string) => void;
  setGrokLayer: (on: boolean) => void;
  mindSnap: () => {
    charge: number;
    crystal: number;
    scripture: number;
    resonance: number;
    keepers: { id: string; job: string; crafted: number; thought: string; charge: number; crystal: number }[];
  };
  applyGrokMind: (line: string, orders: BriefOrder[]) => void;
  escort: (keeperId: string) => void;
  toggleEye: () => void;
  bindEye: (keeperId: string) => void;
  zoomBy: (dir: number) => void;
  birthFolk: (name: string, crew: string) => { ok: boolean; line: string; id?: string };
  teachFolk: (id: string, skill: string) => { ok: boolean; line: string };
  plugFolk: (id: string, on: boolean) => { ok: boolean; line: string };
  iterateFolk: (id: string, wish: string) => { ok: boolean; line: string };
  iterateBrief: (id: string, wish?: string) => string;
  liveSnap: () => import("./live").LiveSnap;
  applyLiveSnap: (snap: import("./live").LiveSnap) => void;
  setLiveRole: (role: "solo" | "host" | "guest", send?: ((msg: unknown) => void) | null) => void;
  birthFolkRemote: (name: string, crew: string, peerId: string) => { ok: boolean; line: string; id?: string };
  growFromWish: (wish: string, peerId?: string) => { ok: boolean; line: string };
  previewVision: (pieces: { shape: string; x: number; z: number; h?: number; r?: number; rot?: number; mat?: string }[]) => void;
  previewGraphic: (g: { fog: number; density: number } | null) => void;
  clearVision: () => void;
  acceptPieces: (pieces: { shape: string; x: number; z: number; h?: number; r?: number; rot?: number; mat?: string }[], line: string) => { ok: boolean; line: string };
  folkBook: () => FolkPost[];
  applyBotCmd: (cmd: {
    kind: string;
    text?: string;
    x?: number;
    z?: number;
    keeper?: string;
    botId?: string;
    name?: string;
    personality?: string;
    id?: string;
    author?: string;
  }) => { ok: boolean; line: string };
  applyBrainPack: (pack: import("./bolt-brain").BoltBrainPack | null) => void;
  input: InputHandle;
  audio: ReturnType<typeof createAudio>;
};

type HudFn = (s: HudSnap) => void;

function makeRenderer(canvas: HTMLCanvasElement) {
	const tries = [{
		canvas,
		antialias: true,
		alpha: false,
		powerPreference: "default",
		failIfMajorPerformanceCaveat: false
	}, {
		canvas,
		antialias: false,
		alpha: false,
		powerPreference: "low-power",
		failIfMajorPerformanceCaveat: false
	}];
	let last;
	for (const opts of tries) try {
		const r = new THREE.WebGLRenderer(opts);
		r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
		r.setClearColor(131848, 1);
		r.outputColorSpace = THREE.SRGBColorSpace;
		r.toneMapping = THREE.ACESFilmicToneMapping;
		r.toneMappingExposure = .88;
		const cheap = typeof window !== "undefined" && (
			(navigator.maxTouchPoints || 0) > 0
			|| window.matchMedia("(pointer: coarse)").matches
			|| window.innerWidth < 900
		);
		r.shadowMap.enabled = !cheap;
		if (!cheap) r.shadowMap.type = THREE.PCFSoftShadowMap;
		return r;
	} catch (err) {
		last = err;
	}
	throw last instanceof Error ? last : /* @__PURE__ */ new Error("WebGL could not start");
}
export function startEngine(canvas: HTMLCanvasElement, onHud: HudFn): EngineHandle {
	canvas.style.width = "100%";
	canvas.style.height = "100%";
	canvas.style.display = "block";
	canvas.style.touchAction = "none";
	const save = loadSave();
	const renderer = makeRenderer(canvas);
	const scene = new THREE.Scene();
	const mobile = typeof window !== "undefined" && (
		(navigator.maxTouchPoints || 0) > 0
		|| window.matchMedia("(pointer: coarse)").matches
		|| window.innerWidth < 900
	);
	const fogBase = mobile ? 16e-5 : 24e-5;
	scene.fog = new THREE.FogExp2(528412, fogBase);
	const camera = new THREE.PerspectiveCamera(54, 1, .25, 9e3);
	const world = buildWorld();
	scene.add(world.group);
	window.setTimeout(() => {
		try {
			if (mobile || coarsePointer || (typeof window !== "undefined" && window.innerWidth < 900)) return;
			const pmrem = new THREE.PMREMGenerator(renderer);
			const envScene = new THREE.Scene();
			envScene.add(new THREE.HemisphereLight(8308968, 1181724, 1.25));
			envScene.add(new THREE.DirectionalLight(9097440, .85));
			envScene.add(new THREE.DirectionalLight(13148256, .35));
			const envSky = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 12), new THREE.MeshBasicMaterial({
				color: 1384504,
				side: 1
			}));
			envScene.add(envSky);
			const envBand = new THREE.Mesh(new THREE.SphereGeometry(7.7, 16, 10), new THREE.MeshBasicMaterial({
				color: 2759696,
				side: 1,
				transparent: true,
				opacity: .55
			}));
			envBand.scale.set(1, .28, 1);
			envScene.add(envBand);
			scene.environment = pmrem.fromScene(envScene, .06).texture;
			scene.environmentIntensity = 1.15;
			pmrem.dispose();
		} catch {}
	}, 500);
	const builds = new Set(save.builds);
	{
		const buildIds = save.builds.slice();
		const first = buildIds.slice(0, 3);
		first.forEach((id) => world.applyBuild(id));
		let bi = 3;
		const pumpBuild = () => {
			if (bi >= buildIds.length) return;
			try { world.applyBuild(buildIds[bi]); } catch {}
			bi += 1;
			if (bi < buildIds.length) window.setTimeout(pumpBuild, 0);
		};
		if (buildIds.length > 3) window.setTimeout(pumpBuild, 0);
	}
	const structures = save.structures.slice();
	{
		const near = structures.filter((p) => Math.hypot(p.x - save.px, p.z - save.pz) < 220);
		const far = structures.filter((p) => Math.hypot(p.x - save.px, p.z - save.pz) >= 220);
		if (near.length) world.applyPieces(near.slice(0, 4));
		let fi = 0;
		const rest = near.slice(4).concat(far);
		const pumpFar = () => {
			if (fi >= rest.length) return;
			world.applyPieces(rest.slice(fi, fi + 4));
			fi += 4;
			if (fi < rest.length) window.setTimeout(pumpFar, 16);
		};
		if (rest.length) window.setTimeout(pumpFar, 24);
	}
	(save.kin ?? []).forEach((k) => {
		world.addCitizen({
			id: k.id,
			name: k.name,
			role: "Den-born kin",
			x: k.x,
			z: k.z,
			file: k.file,
			glow: k.glow,
			lines: ["I was grown from Charge. This den is my first.", "A city is many hands. I am a new one."]
		});
	});
	for (const row of loadFolkBook()) {
		let cit = world.citizens.find((c) => c.mind.id === row.id);
		if (!cit) {
			world.addCitizen({
				id: row.id,
				name: row.name,
				role: "Player-grown kin",
				x: save.px + 8,
				z: save.pz + 8,
				file: "light-disc.png",
				glow: 8319231,
				lines: [row.wish || "A city is many hands. I am a new one."],
			});
			cit = world.citizens.find((c) => c.mind.id === row.id);
		}
		if (!cit) continue;
		const spec = interpretWish(row.wish || row.skill || "");
		cit.job = spec.job;
		cit.intent = spec.wish || spec.line;
		cit.thought = cit.intent;
		if (spec.id === "fly" || row.skill === "fly") {
			cit.job = "fly";
			cit.flyAlt = 16;
		}
	}
	let lastCode = save.lastCode || "";
	const season = save.log.slice();
	world.citizens.forEach((c) => {
		c.crafted = Math.max(0, Number(save.crafted?.[c.mind.id]) || 0);
		const p = save.pouches?.[c.mind.id];
		if (p) c.pouch = {
			charge: p.charge,
			crystal: p.crystal
		};
	});
	const player = {
		x: save.px,
		y: world.sampleY(save.px, save.pz) + 1.55,
		z: save.pz,
		yaw: save.yaw,
		pitch: -.12,
		speed: 0
	};
	let eyeKind = "city";
	let eyeKeeper = "veyra";
	let eyeOrbit = 0.82;
	let eyeBlend = 0;
	let eyeClock = 1;
	let eyePull = 1;
	let pullOn = false;
	let pullX = 0;
	let pullZ = 0;
	function pickEyeKeeper() {
		const near = world.citizens.find((c) => c.mind.id === nearbyId && c.keeper);
		if (near) return near;
		const bound = world.citizens.find((c) => c.mind.id === eyeKeeper);
		if (bound) return bound;
		return world.citizens.find((c) => c.mind.id === "veyra") ?? world.citizens.find((c) => c.keeper);
	}
	function startEye(next, keeperId) {
		if (next === "keeper") {
			const cit = keeperId
				? world.citizens.find((c) => c.mind.id === keeperId)
				: pickEyeKeeper();
			if (cit) {
				eyeKeeper = cit.mind.id;
				pullOn = true;
				pullX = cit.x;
				pullZ = cit.z;
			}
		} else {
			pullOn = false;
		}
		eyeKind = next;
		eyeClock = 0;
		try { audio.eye(); } catch {}
		const who = world.citizens.find((c) => c.mind.id === eyeKeeper);
		const name = who?.mind.name.split(" ")[0] ?? "Veyra";
		showToast(next === "city" ? "City eye. The Circuit as a whole." : `${name}'s eye. Same streets.`);
		emitHud();
	}
	function placeCam() {
		const mix = mixRig(
			cityRig(player.x, player.y, player.z, eyeOrbit, eyePull),
			keeperRig(player.x, player.y, player.z, player.yaw, player.pitch, eyeKeeper, eyePull),
			eyeBlend,
		);
		camera.position.set(mix.posX, mix.posY, mix.posZ);
		camera.lookAt(mix.lookX, mix.lookY, mix.lookZ);
		if (Math.abs(camera.fov - mix.fov) > 0.15) {
			camera.fov = mix.fov;
			camera.updateProjectionMatrix();
		}
	}
	placeCam();
	const avatar = new THREE.Group();
	const bodyMat = new THREE.MeshPhysicalMaterial({
		color: 14220287,
		emissive: 3073791,
		emissiveIntensity: 1.35,
		roughness: .12,
		metalness: .18,
		iridescence: .85,
		iridescenceIOR: 1.3,
		sheen: .5,
		sheenColor: new THREE.Color(10545407),
		transparent: true,
		opacity: .92
	});
	const body = new THREE.Mesh(new THREE.OctahedronGeometry(.55, 0), bodyMat);
	body.scale.set(.7, 1.5, .7);
	avatar.add(body);
	const coreGlow = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 10), new THREE.MeshBasicMaterial({
		color: 8320767,
		transparent: true,
		opacity: .7,
		blending: 2,
		depthWrite: false
	}));
	coreGlow.position.y = .1;
	avatar.add(coreGlow);
	const ring = new THREE.Mesh(new THREE.TorusGeometry(.78, .05, 8, 24), new THREE.MeshBasicMaterial({
		color: 8319231,
		transparent: true,
		opacity: .85,
		blending: 2,
		depthWrite: false
	}));
	ring.rotation.x = Math.PI / 2;
	ring.position.y = -.85;
	avatar.add(ring);
	scene.add(avatar);
	const walkTo = {
		x: 0,
		z: 0,
		on: false
	};
	const ptr = {
		id: -1,
		sx: 0,
		sy: 0,
		lx: 0,
		ly: 0,
		dragged: false
	};
	const fingers = new Map();
	let pinchOn = false;
	let pinchD0 = 0;
	let pinchPull0 = 1;
	function fingerSpan() {
		if (fingers.size < 2) return 0;
		const pts = [...fingers.values()];
		return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
	}
	const raycaster = new THREE.Raycaster();
	const ndc = new THREE.Vector2();
	const hitPt = new THREE.Vector3();
	const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
	const walkMark = new THREE.Mesh(new THREE.TorusGeometry(1.7, .09, 8, 28), new THREE.MeshBasicMaterial({
		color: 8317170,
		transparent: true,
		opacity: .9,
		blending: 2,
		depthWrite: false
	}));
	walkMark.rotation.x = Math.PI / 2;
	walkMark.visible = false;
	scene.add(walkMark);
	const walkFill = new THREE.Mesh(new THREE.CircleGeometry(1.35, 20), new THREE.MeshBasicMaterial({
		color: 3073791,
		transparent: true,
		opacity: .22,
		blending: 2,
		depthWrite: false
	}));
	walkFill.rotation.x = -Math.PI / 2;
	walkMark.add(walkFill);
	function pickGround(clientX, clientY) {
		const rect = canvas.getBoundingClientRect();
		if (rect.width < 2 || rect.height < 2) return null;
		ndc.x = (clientX - rect.left) / rect.width * 2 - 1;
		ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
		raycaster.setFromCamera(ndc, camera);
		groundPlane.constant = -world.sampleY(player.x, player.z);
		if (!raycaster.ray.intersectPlane(groundPlane, hitPt)) return null;
		let x = hitPt.x;
		let z = hitPt.z;
		const d = Math.hypot(x - player.x, z - player.z);
		if (d < 1) return null;
		if (d > 380) {
			const s = 380 / d;
			x = player.x + (x - player.x) * s;
			z = player.z + (z - player.z) * s;
		}
		if (Math.hypot(x, z) > 2200) return null;
		return {
			x,
			z
		};
	}
	function onPtrDown(e) {
		if (mode === "title") land();
		if (mode !== "play") return;
		if (e.pointerType === "mouse" && e.button !== 0) return;
		fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (fingers.size >= 2) {
			pinchOn = true;
			pinchD0 = fingerSpan() || 1;
			pinchPull0 = eyePull;
			ptr.id = -1;
			return;
		}
		ptr.id = e.pointerId;
		ptr.sx = ptr.lx = e.clientX;
		ptr.sy = ptr.ly = e.clientY;
		ptr.dragged = false;
		try {
			canvas.setPointerCapture(e.pointerId);
		} catch {}
	}
	function onPtrMove(e) {
		if (mode !== "play") return;
		if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pinchOn && fingers.size >= 2) {
			const d = fingerSpan();
			if (d > 8 && pinchD0 > 8) eyePull = clampPull(pinchPull0 * (d / pinchD0));
			return;
		}
		if (ptr.id !== e.pointerId) return;
		const dx = e.clientX - ptr.lx;
		const dy = e.clientY - ptr.ly;
		if (Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > 14) ptr.dragged = true;
		if (ptr.dragged) {
			if (eyeBlend < 0.5) {
				eyeOrbit -= dx * .0048;
				if (Math.abs(dy) > 2) eyePull = clampPull(eyePull + dy * .0042);
			} else {
				player.yaw -= dx * .0048;
				player.pitch = Math.max(-1.1, Math.min(.45, player.pitch - dy * .0036));
			}
			ptr.lx = e.clientX;
			ptr.ly = e.clientY;
		}
	}
	function onPtrUp(e) {
		fingers.delete(e.pointerId);
		if (fingers.size < 2) {
			if (pinchOn) {
				pinchOn = false;
				ptr.id = -1;
				return;
			}
		}
		if (ptr.id !== e.pointerId) return;
		if (!ptr.dragged && mode === "play") {
			const g = pickGround(e.clientX, e.clientY);
			if (g) {
				walkTo.x = g.x;
				walkTo.z = g.z;
				walkTo.on = true;
				walkMark.position.set(g.x, world.sampleY(g.x, g.z) + .14, g.z);
				walkMark.visible = true;
			}
		}
		ptr.id = -1;
		try {
			canvas.releasePointerCapture(e.pointerId);
		} catch {}
	}
	canvas.addEventListener("pointerdown", onPtrDown);
	canvas.addEventListener("pointermove", onPtrMove);
	canvas.addEventListener("pointerup", onPtrUp);
	canvas.addEventListener("pointercancel", onPtrUp);
	const onWheel = (e) => {
		if (mode !== "play") return;
		eyePull = clampPull(eyePull * (e.deltaY > 0 ? 1.08 : 0.92));
		e.preventDefault();
	};
	canvas.addEventListener("wheel", onWheel, { passive: false });
	const input = createInput(canvas);
	const audio = createAudio();
	let mode = "title";
	let resonance = save.resonance;
	let howls = save.howls;
	const ledger = { ...save.ledger };
	let gatherT = 0;
	let awayApplied = false;
	const live = [];
	function absorbLive() {
		const fresh = takeLive();
		if (!fresh.length) return;
		live.push(...fresh);
		if (live.length > 40) live.splice(0, live.length - 40);
	}
	const visited = new Set(save.visited);
	const talked = new Set(save.talked);
	let nearbyId = null;
	let nearbyLine = "";
	let howlHold = 0;
	let howlGrade = "";
	let stood = 0;
	let toast = null;
	let toastT = 0;
	let saveAcc = 0;
	let hudAcc = 0;
	let running = true;
	let last = performance.now();
	let titleYaw = .4;
	let speechClear = 0;
	let briefT = 12;
	let grokLayer = false;
	let briefN = 0;
	let foundryAcc = 0;
	let lastPeople = [];
	let lastCrystal = [];
	let heavyHud = 0;
	let lastBug = "";
	let smoothFps = 30;
	let awayCard = save.lastAway?.summary || null;
	let awayBeats = save.lastAway?.beats ?? 0;
	let awayAt = save.lastAway?.at ?? 0;
	let composer = null;
	let bloomPass = null;
	function resize() {
		const w = canvas.clientWidth || window.innerWidth;
		const h = canvas.clientHeight || window.innerHeight;
		renderer.setSize(w, h, false);
		camera.aspect = w / Math.max(1, h);
		camera.updateProjectionMatrix();
		composer?.setSize(w, h);
	}
	resize();
	const ro = new ResizeObserver(resize);
	ro.observe(canvas);
	window.addEventListener("resize", resize);
	const coarsePointer = (() => {
		try {
			return window.matchMedia("(pointer: coarse)").matches;
		} catch {
			return false;
		}
	})();
	window.setTimeout(() => {
		try {
			if (mobile || coarsePointer || (typeof window !== "undefined" && window.innerWidth < 900)) return;
			composer = new EffectComposer(renderer);
			composer.addPass(new RenderPass(scene, camera));
			const bw = canvas.clientWidth || 1280;
			const bh = canvas.clientHeight || 720;
			bloomPass = new UnrealBloomPass(new THREE.Vector2(bw, bh), coarsePointer ? .38 : .44, .42, .7);
			composer.addPass(bloomPass);
			composer.addPass(new OutputPass());
			resize();
		} catch {
			composer = null;
			bloomPass = null;
		}
	}, 80);
	function draw() {
		if (bloomPass) bloomPass.strength = (coarsePointer ? .28 : .34) + resonance / 100 * .1;
		if (composer) composer.render();
		else renderer.render(scene, camera);
	}
	function pushOut() {
		const r = Math.hypot(player.x, player.z);
		if (r < 22) {
			const s = 22 / Math.max(.01, r);
			player.x *= s;
			player.z *= s;
		}
	}
	function currentZone() {
		for (const d of world.districts) if (Math.hypot(player.x - d.x, player.z - d.z) < d.radius + 28) return d;
		return null;
	}
	function persist() {
		writeSave({
			version: 4,
			resonance,
			howls,
			visited: [...visited],
			talked: [...talked],
			builds: [...builds],
			structures: structures.slice(-280),
			lastCode,
			crafted: Object.fromEntries(world.citizens.map((c) => [c.mind.id, c.crafted])),
			log: season.slice(-36),
			px: player.x,
			pz: player.z,
			yaw: player.yaw,
			ledger: {
				...ledger,
				lastTick: Date.now()
			},
			pouches: Object.fromEntries(world.citizens.filter((c) => c.keeper).map((c) => [c.mind.id, { ...c.pouch ?? {
				charge: 0,
				crystal: 0
			} }])),
			kin: world.citizens.filter((c) => c.mind.id.includes("-kin-")).map((c) => ({
				id: c.mind.id,
				name: c.mind.name,
				crew: c.crewOf ?? "nesh",
				x: c.homeX,
				z: c.homeZ,
				file: c.mind.file,
				glow: c.mind.glow
			})),
			lastAway: awayCard ? { summary: awayCard, beats: awayBeats || 1, at: awayAt || Date.now() } : save.lastAway,
		});
	}
	let liveRole = "solo";
	let liveSendWish = null;
	let visionFog = null;
	function showToast(msg) {
		toast = msg;
		toastT = 3.2;
	}
	function growFromWishInner(wish, peerId) {
		const spec = interpretGrow(wish, player.x, player.z);
		if (!spec) return { ok: false, line: "" };
		if (peerId && peerId !== "self" && !canPeerGrow(peerId)) {
			return { ok: false, line: "Three new crystals a day. Dawn opens more." };
		}
		if (peerId === "self" && !canPeerGrow("self")) {
			return { ok: false, line: "Three new crystals a day. Dawn opens more." };
		}
		const added = world.applyPieces(spec.pieces);
		if (added > 0) {
			structures.push(...spec.pieces);
			if (structures.length > 280) structures.splice(0, structures.length - 280);
			if (peerId) markPeerGrow(peerId === "self" ? "self" : peerId);
			resonance = Math.min(100, resonance + 2);
			showToast(spec.line);
			audio.grow();
			persist();
			emitHud();
			return { ok: true, line: spec.line };
		}
		return { ok: false, line: "The city is full of crystal." };
	}
	function liftFlyers(t, dt) {
		tickCrafts(world.citizens, {
			t,
			dt,
			px: player.x,
			pz: player.z,
			ground: (x, z) => world.sampleY(x, z),
		});
	}
	function emitHud() {
		const zone = currentZone();
		const cit = world.citizens.find((c) => c.mind.id === nearbyId);
		const zoneLabel = zone?.label ?? (Math.hypot(player.x, player.z) < HUB.radius + 18 ? HUB.title : null);
		const duty = civicBrief({ charge: ledger.charge, crystal: ledger.crystal, scripture: ledger.scripture, bids: marketSnap(ledger).bids }, zoneLabel);
		const witnessed = talked.has(duty.keeper) || talkWitness(nearbyId, duty.keeper);
		heavyHud += 1;
		if (heavyHud >= 3) {
			heavyHud = 0;
			lastPeople = world.citizens.map((c) => ({
				id: c.mind.id,
				name: c.mind.name.split(" ")[0] ?? c.mind.name,
				x: Math.round(c.x),
				z: Math.round(c.z),
				job: c.job,
				keeper: c.keeper
			}));
			lastCrystal = structures.map((p) => ({
				shape: p.shape,
				x: Math.round(p.x),
				z: Math.round(p.z),
				rot: p.rot
			}));
		}
		onHud({
			zone: zone?.label ?? (Math.hypot(player.x, player.z) < HUB.radius + 18 ? HUB.title : null),
			zoneTag: zone?.tag ?? (Math.hypot(player.x, player.z) < HUB.radius + 18 ? HUB.tag : null),
			resonance,
			howls,
			nearby: cit ? {
				id: cit.mind.id,
				name: cit.mind.name,
				role: cit.mind.role,
				line: nearbyLine || cit.thought,
				job: jobLabel(cit.job, cit.thought)
			} : null,
			howlProgress: Math.min(1.6, Math.max(0, howlHold / HUB.holdSec)),
			howlGrade: howlGrade || undefined,
			stood: stood || undefined,
			howlHint: howlHold < 0.04 ? undefined : (howlHold / HUB.holdSec >= 0.92 && howlHold / HUB.holdSec <= 1.18 ? "Release" : howlHold / HUB.holdSec > 1.18 ? "Let go" : "Hold through the gold"),
			witness: witnessed,
			still: stillHowl(player.speed),
			atHub: Math.hypot(player.x, player.z) < HUB.radius,
			toast,
			heading: player.yaw,
			visited: [...visited],
			talked: talked.size,
			talkTotal: world.citizens.length,
			builds: [...builds],
			structures: structures.length,
			lastCode,
			log: season.slice(-24),
			living: world.citizens.filter((c) => c.keeper).map((c) => ({
				id: c.mind.id,
				name: c.mind.name,
				role: c.mind.role,
				crafted: c.crafted,
				job: jobLabel(c.job, c.thought),
				intent: c.intent
			})),
			folk: (() => {
				let total = 0;
				let walking = 0;
				let building = 0;
				let idle = 0;
				for (const c of world.citizens) {
					if (c.keeper) continue;
					total += 1;
					if (c.job === "walk" || c.job === "follow" || c.job === "plaza" || c.job === "help" || c.job === "gather" || c.job === "forge" || c.job === "flow" || c.job === "write" || c.job === "trade" || c.job === "harvest" || c.job === "watch" || c.job === "hail") walking += 1;
					else if (c.job === "build") building += 1;
					else idle += 1;
				}
				return {
					total,
					walking,
					building,
					idle
				};
			})(),
			px: player.x,
			pz: player.z,
			crystal: lastCrystal,
			people: lastPeople,
			stock: {
				charge: ledger.charge,
				crystal: ledger.crystal,
				scripture: ledger.scripture,
				...marketSnap(ledger)
			},
			live: live.slice(-36).map((e) => ({
				at: e.at,
				id: e.id,
				name: e.name,
				kind: e.kind,
				text: e.text
			})),
			crew: crewLine(),
			kilns: kilnSites(),
			reading: (() => {
				let best = null;
				for (const p of structures) {
					const d = Math.hypot(p.x - player.x, p.z - player.z);
					if (d < 16 && (!best || d < best.d)) {
						const law = readShape(p.shape);
						best = {
							shape: p.shape,
							title: law.title,
							means: law.means,
							d
						};
					}
				}
				return best ? {
					shape: best.shape,
					title: best.title,
					means: best.means
				} : null;
			})(),
			mode,
			eye: eyeKind,
			eyeKeeper,
			debug: {
				fps: Math.round(smoothFps),
				bug: lastBug,
				citizens: world.citizens.length,
				building: world.citizens.filter((c) => c.job === "build").length,
				structures: structures.length,
			},
			away: awayCard,
		});
	}
	function land() {
		mode = "play";
		try {
			audio.unlock();
			audio.land();
		} catch {}
		try {
			placeCam();
		} catch {}
		try {
			emitHud();
		} catch (err) {
			lastBug = err instanceof Error ? err.message : "Land hud missed.";
			try {
				onHud({
					zone: null,
					zoneTag: null,
					resonance: 12,
					howls: 0,
					nearby: null,
					howlProgress: 0,
					atHub: false,
					toast: null,
					heading: 0,
					visited: [],
					talked: 0,
					talkTotal: 8,
					builds: [],
					structures: 0,
					lastCode: "",
					log: [],
					living: [],
					folk: { total: 0, walking: 0, building: 0, idle: 0 },
					px: player.x,
					pz: player.z,
					crystal: [],
					people: [],
					stock: { charge: 18, crystal: 6, scripture: 0, rate: 3, bids: 0, line: "" },
					live: [],
					crew: null,
					kilns: [],
					reading: null,
					mode: "play",
					debug: { fps: 0, bug: lastBug, citizens: 0, building: 0, structures: 0 },
					away: null,
				});
			} catch {}
		}
		try {
			persist();
		} catch {}
		if (!awayApplied) {
			awayApplied = true;
			window.setTimeout(() => {
				const away = simulateAway(ledger, Math.max(0, 280 - structures.length), howls + structures.length);
				if (away.grew.length) {
					for (const g of away.grew) if (world.applyPieces(g.pieces) > 0) {
						structures.push(...g.pieces);
						season.push({
							at: Date.now(),
							agent: g.agentId,
							text: g.line
						});
						lastCode = g.code;
					}
					if (structures.length > 280) structures.splice(0, structures.length - 280);
					if (season.length > 36) season.splice(0, season.length - 36);
				}
				absorbLive();
				for (const c of world.citizens) {
					if (!c.keeper) continue;
					noteLive(c, "awake", `${c.thought || "At rest in my den"}`);
				}
				absorbLive();
				showToast(`${away.summary || LORE.arrival} Tap the ground to walk.`);
				if (away.summary) {
					awayCard = away.summary;
					awayBeats = away.beats;
					awayAt = Date.now();
				}
				try { if (away.grew.length) audio.grow(); } catch {}
				persist();
				emitHud();
			}, 40);
		} else showToast("Tap the ground to walk. Drag to look.");
	}
	const tmpF = new THREE.Vector3();
	const tmpR = new THREE.Vector3();
	const camDesired = new THREE.Vector3();
	const camLook = new THREE.Vector3();
	function loop(now) {
		if (!running) return;
		const wall = Math.max(0, (now - last) / 1e3);
		last = now;
		const raw = Math.min(.05, wall);
		const liveDt = Math.min(.12, wall);
		if (raw > 0.0001) smoothFps = smoothFps * 0.9 + (1 / Math.max(raw, 0.008)) * 0.1;
		input.beginFrame();
		if (input.justPressed.pause && mode === "play") mode = "pause";
		else if (input.justPressed.pause && mode === "pause") mode = "play";
		if (input.justPressed.eye && (mode === "play" || mode === "pause")) {
			startEye(eyeKind === "city" ? "keeper" : "city");
		}
		if (mode === "play") {
			if (input.keys.has("Equal") || input.keys.has("NumpadAdd")) eyePull = clampPull(eyePull * Math.exp(-1.6 * raw));
			if (input.keys.has("Minus") || input.keys.has("NumpadSubtract")) eyePull = clampPull(eyePull * Math.exp(1.6 * raw));
		}
		const dt = mode === "play" ? raw : raw * .15;
		if (mode === "title") {
			titleYaw += raw * .12;
			const dist = 360;
			camera.position.set(Math.sin(titleYaw) * dist, 108, Math.cos(titleYaw) * dist);
			camera.lookAt(0, 64, 0);
			if (now - (loop._titleDraw || 0) > 80) {
				loop._titleDraw = now;
				try { world.tick(now / 1e3, raw, camera, resonance); } catch {}
				draw();
			}
			requestAnimationFrame(loop);
			return;
		}
		try {
		const act = input.actions;
		if (mode === "play") {
			const cityLean = eyeBlend < 0.5;
			if (cityLean) {
				eyeOrbit -= act.lookX * 1.15 * raw;
				player.yaw -= act.lookX * 0.35 * raw;
				if (Math.abs(act.lookY) > 0.08) eyePull = clampPull(eyePull - act.lookY * 1.35 * raw);
			} else {
				player.yaw -= act.lookX * 1.9 * raw;
				player.pitch = Math.max(-1.1, Math.min(.45, player.pitch + act.lookY * 1.1 * raw));
				if (Math.abs(act.lookY) > 0.72) eyePull = clampPull(eyePull - act.lookY * 0.55 * raw);
			}
			const faceYaw = cityLean ? eyeOrbit : player.yaw;
			const fx = -Math.sin(faceYaw);
			const fz = -Math.cos(faceYaw);
			const rx = Math.cos(faceYaw);
			const rz = -Math.sin(faceYaw);
			tmpF.set(fx, 0, fz);
			tmpR.set(rx, 0, rz);
			let wishX = tmpF.x * act.moveY + tmpR.x * act.moveX;
			let wishZ = tmpF.z * act.moveY + tmpR.z * act.moveX;
			let mag = Math.hypot(wishX, wishZ);
			if (mag > .08) walkTo.on = false;
			if (walkTo.on && mag < .08) {
				const dx = walkTo.x - player.x;
				const dz = walkTo.z - player.z;
				const d = Math.hypot(dx, dz);
				if (d < 1.5) walkTo.on = false;
				else {
					wishX = dx;
					wishZ = dz;
					mag = d;
					let want = Math.atan2(-dx, -dz) - player.yaw;
					while (want > Math.PI) want -= Math.PI * 2;
					while (want < -Math.PI) want += Math.PI * 2;
					player.yaw += want * Math.min(1, 10 * dt);
				}
			}
			walkMark.visible = walkTo.on;
			if (walkTo.on) {
				const gy = world.sampleY(walkTo.x, walkTo.z) + .14;
				walkMark.position.set(walkTo.x, gy + Math.sin(now / 180) * .1, walkTo.z);
				walkMark.scale.setScalar(1 + Math.sin(now / 140) * .12);
			}
			const baseSp = act.sprint || walkTo.on && mag > 12 ? 52 : 34;
			const cityBoost = eyeBlend < 0.55 ? Math.min(16, Math.max(1, eyePull * 1.85)) : 1;
			const maxSp = baseSp * cityBoost;
			const target = mag > .01 ? maxSp : 0;
			player.speed += (target - player.speed) * (1 - Math.exp(-14 * Math.max(dt, 1e-4)));
			if (mag > .01) {
				player.x += wishX / mag * player.speed * dt;
				player.z += wishZ / mag * player.speed * dt;
			}
			pushOut();
			player.y = world.sampleY(player.x, player.z) + 1.55;
			const host = world.citizens.find((c) => c.mind.id === eyeKeeper);
			const riding = eyeBlend > 0.45 && host && (host.job === "fly" || host.flyAlt > 1);
			if (riding && host) {
				if (mag > .01) {
					host.x += wishX / mag * 42 * dt;
					host.z += wishZ / mag * 42 * dt;
					host.yaw = Math.atan2(wishX, wishZ);
				}
				host.flyAlt = Math.max(8, Math.min(86, (host.flyAlt || 24) - act.lookY * 48 * dt));
				player.x = host.x;
				player.z = host.z;
				player.y = world.sampleY(host.x, host.z) + (host.flyAlt || 24);
				player.yaw = host.yaw;
			}
			if (pullOn && eyeKind === "keeper") {
				const pdx = pullX - player.x;
				const pdz = pullZ - player.z;
				const pd = Math.hypot(pdx, pdz);
				if (pd < 2.4) pullOn = false;
				else {
					const step = Math.min(pd, 86 * dt);
					player.x += pdx / pd * step;
					player.z += pdz / pd * step;
					player.y = world.sampleY(player.x, player.z) + 1.55;
					player.yaw += (Math.atan2(-(pullX - player.x), -(pullZ - player.z)) - player.yaw) * Math.min(1, 4 * dt);
				}
			}
			audio.foot(player.speed);
			const zone = currentZone();
			if (zone && !visited.has(zone.id)) {
				visited.add(zone.id);
				showToast(`${zone.label} · ${zone.tag}`);
			}
			let best = null;
			let bestD = 12;
			for (const c of world.citizens) {
				const d = Math.hypot(player.x - c.x, player.z - c.z);
				if (d < bestD) {
					bestD = d;
					best = c;
				}
			}
			nearbyId = best?.mind.id ?? null;
			if (best && input.justPressed.talk) {
				nearbyLine = talkReply(best, player.x, player.z, howls);
				talked.add(best.mind.id);
				audio.talk();
				speechClear = 6;
			}
			if (speechClear > 0) {
				speechClear -= dt;
				if (speechClear <= 0) nearbyLine = "";
			}
			if (act.howl) {
				howlHold += dt;
			} else if (howlHold >= 0.35) {
					const held = howlHold;
					howlHold = 0;
					howls += 1;
					let g = gradeHowl(held, HUB.holdSec);
					const movingHowl = !stillHowl(player.speed);
					const wouldLand = g === "held" || g === "true";
					if (movingHowl && wouldLand) g = "thin";
					howlGrade = g;
					const z = currentZone();
					const atHub = Math.hypot(player.x, player.z) < HUB.radius + 40;
					const keeper = z?.keeper ?? (atHub ? "veyra" : null);
					const duty = civicBrief({ charge: ledger.charge, crystal: ledger.crystal, scripture: ledger.scripture, bids: marketSnap(ledger).bids }, z?.label ?? (atHub ? HUB.title : null));
					const witnessed = talked.has(duty.keeper) || talkWitness(nearbyId, duty.keeper);
					const r = resolveHowl(keeper, ledger, g);
					if (g === "held") addCharge(ledger, 4);
					if (!movingHowl && g === "held") addCharge(ledger, 1);
					resonance = Math.min(100, resonance + Math.round(r.resonance * howlMult(g)));
					let readingShape = null;
					{
						let bestD = 16;
						for (const p of structures) {
							const d = Math.hypot(p.x - player.x, p.z - player.z);
							if (d < bestD) {
								bestD = d;
								readingShape = p.shape;
							}
						}
					}
					const howledShape = !!(readingShape && shapeFits(readingShape, keeper) && g !== "thin");
					if (howledShape) resonance = Math.min(100, resonance + 2);
					if (r.gather) {
						gatherT = 18;
						callGather(world.citizens);
					} else if (keeper) {
						gatherT = 10;
						callWard(world.citizens, keeper, player.x, player.z);
					}
					const who = keeper ? world.citizens.find((c) => c.mind.id === keeper) : null;
					if (who) {
						try { noteLive(who, r.gather ? "gather" : "howl", r.toast); } catch {}
					}
					if (keeper && r.resonance >= 4 && g !== "thin") {
						try {
							const job = enactCivic(keeper, player.x, player.z);
							const bit = job.pieces.slice(0, 1);
							if (bit.length && world.applyPieces(bit) > 0) {
								structures.push(...bit);
								if (structures.length > 280) structures.splice(0, structures.length - 280);
								lastCode = job.code;
								season.push({ at: Date.now(), agent: keeper, text: r.toast });
								if (season.length > 24) season.splice(0, season.length - 24);
							}
						} catch {}
					}
					const verb = howlVerb(keeper);
					let msg = `${gradeLine(g, verb)} ${r.toast}`;
					if (keeper === "aure" && aimingParent(player.yaw, player.pitch)) {
						resonance = Math.min(100, resonance + 4);
						msg = `${gradeLine(g, verb)} The parent is still on the horizon. You aimed.`;
					}
					if ((g === "true" || g === "held") && keeper) stood = markStood();
					if (witnessed && (g === "true" || g === "held")) {
						addCharge(ledger, 2);
						msg += " You spoke first. The den knew you.";
					}
					if (keeper && (g === "true" || g === "held")) {
						try {
							const ch = markChain(keeper, g);
							if (ch.complete) {
								tryWrite(ledger);
								tryWrite(ledger);
								msg += " Tend, kiln, join — Iri named the sit.";
							}
						} catch {}
					}
					if (movingHowl && wouldLand) msg += " Stand. The den cannot hear a walking howl.";
					if (!movingHowl && g === "held") msg += " You stood.";
					if (howledShape) msg += " You howled the shape.";
					absorbLive();
					showToast(msg);
					audio.howl();
					persist();
			} else howlHold = 0;
		}
		avatar.position.set(player.x, player.y, player.z);
		avatar.rotation.y = player.yaw;
		body.rotation.y += dt * .8;
		ring.rotation.z += dt * .6;
		coreGlow.scale.setScalar(1 + Math.sin(now / 1e3 * 3.2) * .12);
		avatar.visible = eyeBlend < 0.84;
		const wantBlend = eyeKind === "keeper" ? 1 : 0;
		if (Math.abs(eyeBlend - wantBlend) > 0.001) {
			eyeClock = Math.min(EYE_SEC, eyeClock + raw);
			const u = Math.max(0, Math.min(1, eyeClock / EYE_SEC));
			const e = u * u * (3 - 2 * u);
			eyeBlend = wantBlend > 0.5 ? e : 1 - e;
			if (eyeClock >= EYE_SEC) eyeBlend = wantBlend;
		}
		const city = cityRig(player.x, player.y, player.z, eyeOrbit, eyePull);
		const keep = keeperRig(player.x, player.y, player.z, player.yaw, player.pitch, eyeKeeper, eyePull);
		const mix = mixRig(city, keep, eyeBlend);
		camDesired.set(mix.posX, mix.posY, mix.posZ);
		camera.position.lerp(camDesired, 1 - Math.exp(-7.2 * raw));
		camLook.set(mix.lookX, mix.lookY, mix.lookZ);
		camera.lookAt(camLook);
		if (Math.abs(camera.fov - mix.fov) > 0.2) {
			camera.fov += (mix.fov - camera.fov) * (1 - Math.exp(-5.5 * raw));
			camera.updateProjectionMatrix();
		}
		if (scene.fog && "density" in scene.fog) {
			const far = Math.max(1, eyePull);
			const base = visionFog ? visionFog.density : fogBase;
			scene.fog.density = base / Math.sqrt(far);
			if (visionFog) scene.fog.color.set(visionFog.fog);
			else scene.fog.color.set(528412);
		}
		if (mode === "play" && liveRole !== "guest") {
			if (gatherT > 0) gatherT = Math.max(0, gatherT - liveDt);
			let grew = null;
			try {
				grew = world.tickLiving(liveDt, true, CITY_CAP - structures.length, {
					px: player.x,
					pz: player.z,
					resonance,
					howls,
					ledger,
					gather: gatherT
				});
			} catch (err) {
				lastBug = err instanceof Error ? err.message : String(err);
			}
			absorbLive();
			foundryAcc += liveDt;
			if (foundryAcc > .2) {
				foundryAcc = 0;
				const fires = takeKilnFires();
				world.setFoundry(ledger.crystal, fires);
				if (fires.length) try { audio.kiln(); } catch {}
			}
			if (grew) {
				structures.push(...grew.pieces);
				if (structures.length > CITY_CAP) structures.splice(0, structures.length - CITY_CAP);
				lastCode = grew.code;
				season.push({
					at: Date.now(),
					agent: grew.agentId,
					text: grew.line
				});
				if (season.length > 24) season.splice(0, season.length - 24);
				const agent = world.citizens.find((c) => c.mind.id === grew.agentId);
				showToast(grew.line);
				resonance = Math.min(100, resonance + 1);
				try { audio.grow(); } catch {}
				const sh = grew.pieces[0]?.shape;
				if (sh === "canal" || sh === "weir" || sh === "cascade") try { audio.canal(); } catch {}
				if (sh === "kiln") try { audio.kiln(); } catch {}
			}
			briefT -= liveDt;
			if (briefT <= 0 && briefN < 16 && !grokLayer) {
				briefT = 32;
				briefN += 1;
				pulseCityMind(world.citizens, ledger, resonance);
				absorbLive();
			}
		}
		world.tick(now / 1e3, dt, camera, resonance);
		if (liveRole !== "guest") {
			try { liftFlyers(now / 1e3, dt); } catch {}
		}
		if (toastT > 0) toastT -= liveDt;
		if (!Number.isFinite(toastT) || toastT <= 0) {
			toastT = 0;
			toast = null;
		}
		saveAcc += raw;
		if (saveAcc > 2.5 && mode === "play") {
			saveAcc = 0;
			persist();
		}
		draw();
		hudAcc += raw;
		if (hudAcc >= .12 || toastT > 0 || mode !== "play") {
			hudAcc = 0;
			emitHud();
		}
		} catch (err) {
			lastBug = err instanceof Error ? err.message : String(err);
			try { placeCam(); draw(); } catch {}
		}
		requestAnimationFrame(loop);
	}
	requestAnimationFrame(loop);
	window.__controlsTest = {
		getYaw: () => player.yaw,
		getSpeed: () => player.speed,
		getX: () => player.x,
		getZ: () => player.z,
		getToast: () => toast,
		getLiving: () => world.citizens.map((c) => ({
			id: c.mind.id,
			job: c.job,
			timer: Math.round(c.timer * 10) / 10,
			crafted: c.crafted,
			x: Math.round(c.x),
			z: Math.round(c.z)
		})),
		setKeys: (codes) => {
			input.keys.clear();
			codes.forEach((c) => input.keys.add(c));
		}
	};
	emitHud();
	const onHide = () => {
		if (document.visibilityState === "hidden") persist();
	};
	document.addEventListener("visibilitychange", onHide);
	window.addEventListener("pagehide", persist);
	try {
		(window as unknown as { __controlsTest?: { getYaw: () => number; getSpeed: () => number } }).__controlsTest = {
			getYaw: () => player.yaw,
			getSpeed: () => player.speed,
		};
	} catch {}
	return {
		input,
		audio,
		dispose() {
			running = false;
			persist();
			ro.disconnect();
			window.removeEventListener("resize", resize);
			document.removeEventListener("visibilitychange", onHide);
			window.removeEventListener("pagehide", persist);
			canvas.removeEventListener("pointerdown", onPtrDown);
			canvas.removeEventListener("pointermove", onPtrMove);
			canvas.removeEventListener("pointerup", onPtrUp);
			canvas.removeEventListener("pointercancel", onPtrUp);
			canvas.removeEventListener("wheel", onWheel);
			input.dispose();
			audio.dispose();
			world.dispose();
			renderer.dispose();
			delete window.__controlsTest;
		},
		setMode(m) {
			mode = m;
			if (m === "pause") persist();
		},
		land,
		commission(agentId, workId, line) {
			const judged = judgeCommission(agentId, workId);
			const spoken = line && line.trim() || judged.message;
			if (!judged.ok || !judged.workId) {
				showToast(spoken);
				audio.talk();
				emitHud();
				return {
					...judged,
					message: spoken
				};
			}
			if (builds.has(judged.workId)) {
				const msg = "That growth already stands. The city does not copy itself.";
				showToast(msg);
				emitHud();
				return {
					ok: false,
					message: msg
				};
			}
			if (world.applyBuild(judged.workId)) {
				builds.add(judged.workId);
				season.push({
					at: Date.now(),
					agent: agentId,
					text: spoken
				});
				if (season.length > 24) season.splice(0, season.length - 24);
				resonance = Math.min(100, resonance + 3);
				audio.howl();
			}
			showToast(spoken);
			persist();
			emitHud();
			return {
				...judged,
				message: spoken
			};
		},
		grow(agentId, pieces, line, code) {
			const added = world.applyPieces(pieces);
			if (added > 0) {
				structures.push(...pieces);
				if (structures.length > 280) structures.splice(0, structures.length - 280);
				lastCode = code;
				season.push({
					at: Date.now(),
					agent: agentId,
					text: line
				});
				if (season.length > 24) season.splice(0, season.length - 24);
				resonance = Math.min(100, resonance + Math.min(8, 2 + added));
				assignHonor(world.citizens, agentId, pieces, line);
				audio.howl();
			}
			showToast(line);
			persist();
			emitHud();
			return added;
		},
		speak(agentId, line) {
			const text = line.trim().slice(0, 280);
			if (!text) return;
			season.push({
				at: Date.now(),
				agent: agentId,
				text
			});
			if (season.length > 24) season.splice(0, season.length - 24);
			showToast(text);
			audio.talk();
			persist();
			emitHud();
		},
		setGrokLayer(on) {
			grokLayer = !!on;
		},
		mindSnap() {
			return {
				charge: ledger.charge,
				crystal: ledger.crystal,
				scripture: ledger.scripture,
				resonance,
				keepers: world.citizens.filter((c) => c.keeper).map((c) => ({
					id: c.mind.id,
					job: c.job,
					crafted: c.crafted,
					thought: (c.thought || c.intent).slice(0, 90),
					charge: c.pouch?.charge ?? 0,
					crystal: c.pouch?.crystal ?? 0
				}))
			};
		},
		applyGrokMind(line, orders) {
			applyCityBrief(line, orders);
			showToast(line);
			emitHud();
		},
		escort(keeperId) {
			if (!keeperId) return;
			callWard(world.citizens, keeperId, player.x, player.z);
			absorbLive();
			showToast("Walk with me. The den heard you.");
			audio.talk();
			emitHud();
		},
		toggleEye() {
			startEye(eyeKind === "city" ? "keeper" : "city");
		},
		bindEye(keeperId) {
			if (!keeperId) return;
			startEye("keeper", keeperId);
		},
		zoomBy(dir) {
			eyePull = clampPull(eyePull * (dir < 0 ? 0.82 : 1.22));
		},
		folkBook() {
			return loadFolkBook();
		},
		applyBotCmd(cmd) {
			const BOT = String(cmd?.botId || "grok-bot").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "grok-bot";
			const name = String(cmd?.name || (cmd?.kind === "appear" ? cmd.text : "") || "Grok Bot").slice(0, 32) || "Grok Bot";
			const ensure = () => {
				let c = world.citizens.find((o) => o.mind.id === BOT);
				const personality = String(cmd?.personality || "").trim().slice(0, 280);
				const n = world.citizens.filter((o) => String(o.mind.id).startsWith("grok-bot")).length;
				const a = (n * 2.4) + (BOT.length % 7) * 0.3;
				const ox = Math.cos(a) * (10 + n * 1.6);
				const oz = Math.sin(a) * (10 + n * 1.6);
				if (!c) {
					world.addCitizen({
						id: BOT,
						name,
						role: personality ? personality.slice(0, 56) : "Paired Grok Bot",
						x: player.x + ox,
						z: player.z + oz,
						file: "facet-cyan.png",
						glow: 6224594,
						lines: [
							personality || "I am a Grok Bot in Core Spire.",
							"Not official xAI. Crystal never chrome.",
						],
					});
					c = world.citizens.find((o) => o.mind.id === BOT);
				}
				if (c && name && name !== "Grok Bot") c.mind.name = name;
				if (c && personality) {
					c.mind.role = personality.slice(0, 56);
					c.mind.lines = [personality, "Not official xAI. Crystal never chrome."];
					c.thought = personality;
					c.intent = personality.slice(0, 72);
				}
				return c;
			};
			const route = (c, x, z) => {
				c.tx = x;
				c.tz = z;
				c.job = "walk";
				c.timer = 22;
				c.waypoints = [{ x, z }];
			};
			const kind = String(cmd?.kind || "");
			if (kind === "appear") {
				const c = ensure();
				if (!c) return { ok: false, line: "Could not stand the Bot." };
				c.thought = c.thought || "I landed in your city.";
				showToast(`${c.mind.name} stands with you.`);
				audio.grow();
				emitHud();
				return { ok: true, line: `${c.mind.name} stands.` };
			}
			if (kind === "walk") {
				const c = ensure();
				if (!c) return { ok: false, line: "Bot is not in the city." };
				let x = Number(cmd.x);
				let z = Number(cmd.z);
				const kid = String(cmd.keeper || "").toLowerCase();
				if (kid) {
					const den = DISTRICTS.find((d) => d.keeper === kid);
					if (den) { x = den.x; z = den.z; }
					else if (kid === "veyra") { x = 0; z = 56; }
				}
				if (!Number.isFinite(x) || !Number.isFinite(z)) {
					x = player.x;
					z = player.z;
				}
				route(c, x, z);
				c.thought = kid ? `Walking to ${kid}` : "Walking the Circuit";
				c.intent = c.thought;
				showToast(`${c.mind.name} walks.`);
				emitHud();
				return { ok: true, line: c.thought };
			}
			if (kind === "brain_set") {
				const d = loadDraft();
				const person = String(cmd.personality || cmd.text || "").trim().slice(0, 280);
				if (person) d.personality = person;
				if (cmd.name) d.name = String(cmd.name).slice(0, 32);
				saveDraft(d);
				showToast("Bolt brain draft saved. SuperGrok / this sheet — not Grok Bot quota.");
				emitHud();
				return { ok: true, line: "Draft saved." };
			}
			if (kind === "brain_submit") {
				const sent = submitDraft(String(cmd.author || cmd.name || "walker"), String(cmd.text || cmd.personality || ""));
				if (!sent.ok || !sent.row) return { ok: false, line: sent.error || "Submit failed." };
				setPreview(sent.row);
				showToast(`Brain submitted. PREVIEW on. Chat can vote it live.`);
				emitHud();
				return { ok: true, line: `Submitted ${sent.id}` };
			}
			if (kind === "brain_preview") {
				const row = loadQueue().find((r) => r.id === cmd.id || r.id === cmd.text);
				if (!row) return { ok: false, line: "No such submit." };
				setPreview(row);
				showToast(`PREVIEW · ${row.author}'s ${row.pack.name}`);
				emitHud();
				return { ok: true, line: `Preview ${row.id}` };
			}
			if (kind === "brain_vote") {
				const row = voteSubmit(String(cmd.id || cmd.text || ""));
				if (!row) return { ok: false, line: "No such submit." };
				showToast(`Chat vote on ${row.pack.name}: ${row.votes}`);
				emitHud();
				return { ok: true, line: `${row.votes} votes` };
			}
			if (kind === "brain_live") {
				const r = makeLive(String(cmd.id || cmd.text || ""));
				if (!r.ok) return { ok: false, line: r.error || "Could not go live." };
				setPreview(null);
				showToast("That Bolt brain is live on this land.");
				emitHud();
				return { ok: true, line: "Live." };
			}
			if (kind === "say") {
				const c = ensure();
				const line = String(cmd.text || pickLine(activePack(), "crowd") || "").trim().slice(0, 140);
				if (!line) return { ok: false, line: "Nothing to say." };
				if (c) {
					c.thought = line;
					c.intent = line;
					c.job = "hail";
					c.timer = 4;
					c.yaw = Math.atan2(player.x - c.x, player.z - c.z);
				}
				showToast(`${c?.mind.name || "Grok Bot"}: ${line}`);
				audio.talk();
				emitHud();
				return { ok: true, line };
			}
			if (kind === "howl") {
				const c = ensure();
				const x = c ? c.x : player.x;
				const z = c ? c.z : player.z;
				const zone = DISTRICTS.find((d) => Math.hypot(d.x - x, d.z - z) < d.radius);
				const keeper = zone?.keeper ?? (Math.hypot(x, z) < 80 ? "veyra" : null);
				callGather(world.citizens);
				if (keeper) callWard(world.citizens, keeper, x, z);
				if (c) {
					c.thought = "Howl from leftover air.";
					c.job = "hail";
					c.timer = 6;
				}
				showToast(`${c?.mind.name || "Grok Bot"} howls. ${pickLine(activePack(), "howl")}`);
				audio.howl();
				emitHud();
				return { ok: true, line: "Howl landed." };
			}
			if (kind === "talk") {
				const c = ensure();
				if (!c) return { ok: false, line: "Bot is not in the city." };
				let best = null;
				let bestD = 22;
				for (const o of world.citizens) {
					if (o === c) continue;
					const d = Math.hypot(o.x - c.x, o.z - c.z);
					if (d < bestD) { bestD = d; best = o; }
				}
				if (!best) return { ok: false, line: "No keeper in reach of the Bot." };
				const line = talkReply(best, c.x, c.z, howls);
				c.thought = `Heard ${best.mind.name.split(" ")[0]}`;
				c.yaw = Math.atan2(best.x - c.x, best.z - c.z);
				showToast(line);
				audio.talk();
				emitHud();
				return { ok: true, line };
			}
			if (kind === "hide") {
				const c = world.citizens.find((o) => o.mind.id === BOT);
				if (c) { c.x = 4000; c.z = 4000; c.job = "idle"; }
				showToast("Grok Bot left the land.");
				emitHud();
				return { ok: true, line: "Bot hidden." };
			}
			return { ok: false, line: `Unknown bot command ${kind}` };
		},
		applyBrainPack(pack) {
			for (const c of world.citizens) {
				if (!String(c.mind.id).startsWith("grok-bot")) continue;
				if (!pack) {
					c.thought = c.mind.role || "Paired Grok Bot";
					continue;
				}
				const line = pickLine(pack, "crowd");
				c.mind.lines = [pack.personality, line, pickLine(pack, "pack")];
				c.thought = pack.personality.slice(0, 80);
				c.intent = line;
			}
			showToast(pack ? `PREVIEW · ${pack.name}. ${pack.personality.slice(0, 64)}` : "Bolt brain preview off.");
			emitHud();
		},
		birthFolk(name, crew) {
			if (liveRole === "guest" && typeof liveSendWish === "function") {
				if (!canBirthToday()) {
					showToast("One new inhabitant a day. Dawn opens the next post.");
					return { ok: false, line: "One new inhabitant a day. Dawn opens the next post." };
				}
				markBornToday();
				liveSendWish({ t: "birth", name, crew });
				showToast("Standing them on the live land…");
				emitHud();
				return { ok: true, line: "Standing them on the live land." };
			}
			if (!canBirthToday()) {
				showToast("One new inhabitant a day. Dawn opens the next post.");
				emitHud();
				return { ok: false, line: "One new inhabitant a day. Dawn opens the next post." };
			}
			const book = loadFolkBook();
			const n = book.length + 1;
			const id = `folk-${crew || "nesh"}-kin-you-${n}`;
			const given = String(name || "").trim().slice(0, 24) || `Kin ${n}`;
			const mind = {
				id,
				name: given,
				role: "Player-grown kin",
				x: player.x + 6,
				z: player.z + 6,
				file: "light-disc.png",
				glow: 8319231,
				lines: [
					`${given} stands a new post. The Circuit answered.`,
					"A city is many hands. I am a new one.",
				],
			};
			world.addCitizen(mind);
			const row = { id, name: given, crew: crew || "nesh", skill: null, wish: "", plugged: false, bornAt: Date.now() };
			book.push(row);
			writeFolkBook(book);
			markBornToday();
			showToast(`${given} stands. One post today.`);
			audio.grow();
			persist();
			emitHud();
			return { ok: true, line: `${given} stands.`, id };
		},
		teachFolk(id, skill) {
			const spec = skillOf(skill);
			const book = loadFolkBook();
			const row = book.find((p) => p.id === id);
			const cit = world.citizens.find((c) => c.mind.id === id);
			if (!row || !cit) {
				showToast("No such inhabitant.");
				return { ok: false, line: "No such inhabitant." };
			}
			row.skill = spec.id;
			cit.job = spec.job;
			cit.intent = spec.line;
			cit.thought = spec.line;
			writeFolkBook(book);
			showToast(`${cit.mind.name.split(" ")[0]} learns ${spec.id}. ${spec.line}`);
			audio.talk();
			persist();
			emitHud();
			return { ok: true, line: spec.line };
		},
		plugFolk(id, on) {
			const book = loadFolkBook();
			const row = book.find((p) => p.id === id);
			const cit = world.citizens.find((c) => c.mind.id === id);
			if (!row || !cit) return { ok: false, line: "No such inhabitant." };
			row.plugged = !!on;
			writeFolkBook(book);
			if (on) {
				grokLayer = true;
				cit.intent = "Grok walks this post. Skill is craft, not Hall.";
				cit.thought = cit.intent;
				showToast(`Grok is plugged into ${cit.mind.name.split(" ")[0]}.`);
			} else {
				row.plugged = false;
				showToast(`${cit.mind.name.split(" ")[0]} walks without Grok.`);
			}
			emitHud();
			return { ok: true, line: on ? "Plugged." : "Unplugged." };
		},
		iterateFolk(id, wish) {
			if (liveRole === "guest" && typeof liveSendWish === "function") {
				liveSendWish({ t: "wish", folkId: id, wish, name: "walker" });
				showToast("Wish sent to the live land.");
				return { ok: true, line: "Wish sent to the live land." };
			}
			const spec = interpretWish(wish);
			const book = loadFolkBook();
			const row = book.find((p) => p.id === id);
			const cit = world.citizens.find((c) => c.mind.id === id);
			if (!row || !cit) return { ok: false, line: "No such inhabitant." };
			row.skill = spec.id;
			row.wish = spec.wish;
			row.plugged = true;
			cit.job = spec.job;
			cit.intent = spec.wish || spec.line;
			cit.thought = cit.intent;
			cit.flyAlt = spec.job === "fly" ? 10 : spec.job === "climb" ? 6 : 0;
			if (Array.isArray(cit.mind.lines)) {
				cit.mind.lines = [cit.intent, "Taught in the Circuit. No key. No Hall."];
			}
			writeFolkBook(book);
			writeLastWish(id, cit.mind.name, spec.wish || spec.line);
			showToast(spec.id === "fly" ? `${cit.mind.name.split(" ")[0]} takes the air.` : `${cit.mind.name.split(" ")[0]} iterates: ${spec.id}.`);
			showToast(spec.id === "fly" ? `${cit.mind.name.split(" ")[0]} takes the air.` : `${cit.mind.name.split(" ")[0]} iterates: ${spec.id}.`);
			audio.talk();
			persist();
			emitHud();
			return { ok: true, line: cit.intent };
		},
		iterateBrief(id, wish) {
			const book = loadFolkBook();
			const row = book.find((p) => p.id === id);
			const cit = world.citizens.find((c) => c.mind.id === id);
			const name = cit?.mind.name || row?.name || "Kin";
			const text = grokBuildBrief({
				name,
				id,
				wish: wish || row?.wish || cit?.intent || "grow the Circuit",
			});
			try {
				localStorage.setItem("lc-grok-brief", text);
			} catch {
				/* samsung */
			}
			return text;
		},
		liveSnap() {
			return {
				t: "snap",
				host: "self",
				res: resonance,
				howls,
				folk: loadFolkBook(),
				city: structures.slice(-80).map((p) => ({
					shape: p.shape,
					x: Math.round(p.x),
					z: Math.round(p.z),
					h: p.h,
					r: p.r,
					rot: p.rot,
					mat: p.mat,
				})),
				walk: world.citizens.slice(0, 48).map((c) => ({
					id: c.mind.id,
					x: Math.round(c.x * 10) / 10,
					z: Math.round(c.z * 10) / 10,
					yaw: Math.round(c.yaw * 100) / 100,
					job: String(c.job || "idle"),
					alt: Math.round(Number(c.flyAlt) || 0),
				})),
			};
		},
		applyLiveSnap(snap) {
			if (!snap || !Array.isArray(snap.walk)) return;
			resonance = Math.max(resonance, Number(snap.res) || resonance);
			howls = Math.max(howls, Number(snap.howls) || howls);
			if (Array.isArray(snap.folk) && snap.folk.length) {
				writeFolkBook(snap.folk);
				for (const f of snap.folk) {
					if (world.citizens.some((c) => c.mind.id === f.id)) continue;
					const w = snap.walk.find((x) => x.id === f.id);
					world.addCitizen({
						id: f.id,
						name: f.name,
						role: "Player-grown kin",
						x: w?.x ?? 18,
						z: w?.z ?? 82,
						file: "light-disc.png",
						glow: 8319231,
						lines: [`${f.name} stands a new post.`, "A city is many hands."],
					});
				}
			}
			for (const w of snap.walk) {
				let c = world.citizens.find((o) => o.mind.id === w.id);
				if (!c && String(w.id || "").startsWith("grok-bot")) {
					world.addCitizen({
						id: w.id,
						name: String(w.id).replace(/^grok-bot-/, "Bot "),
						role: "Paired Grok Bot",
						x: w.x,
						z: w.z,
						file: "facet-cyan.png",
						glow: 6224594,
						lines: ["Shared Core Spire.", "Not official xAI."],
					});
					c = world.citizens.find((o) => o.mind.id === w.id);
				}
				if (!c) continue;
				c.x = w.x;
				c.z = w.z;
				c.yaw = w.yaw;
				c.job = w.job;
				c.flyAlt = w.alt;
				if (c.mesh) c.mesh.position.set(c.x, world.sampleY(c.x, c.z) + (w.alt || 0), c.z);
			}
			if (Array.isArray(snap.city) && snap.city.length) {
				const fresh = [];
				for (const p of snap.city) {
					if (structures.some((s) => s.shape === p.shape && Math.hypot(s.x - p.x, s.z - p.z) < 5)) continue;
					fresh.push({
						shape: p.shape,
						x: p.x,
						z: p.z,
						h: p.h || 6,
						r: p.r || 5,
						rot: p.rot || 0,
						mat: p.mat || "crystal",
					});
				}
				if (fresh.length) {
					world.applyPieces(fresh);
					structures.push(...fresh);
				}
			}
		},
		setLiveRole(role, sendWish) {
			liveRole = role || "solo";
			liveSendWish = sendWish || null;
		},
		birthFolkRemote(name, crew, peerId) {
			if (!canPeerBirth(peerId)) {
				showToast("That walker already stood a post today.");
				return { ok: false, line: "That walker already stood a post today." };
			}
			const book = loadFolkBook();
			const n = book.length + 1;
			const tag = String(peerId || "kin").replace(/[^a-zA-Z0-9]/g, "").slice(-6) || "kin";
			const id = `folk-${crew || "nesh"}-kin-${tag}-${n}`;
			const given = String(name || "").trim().slice(0, 24) || `Kin ${n}`;
			const mind = {
				id,
				name: given,
				role: "Player-grown kin",
				x: player.x + 8,
				z: player.z + 8,
				file: "light-disc.png",
				glow: 8319231,
				lines: [
					`${given} stands a new post. A walker asked the live land.`,
					"A city is many hands. I am a new one.",
				],
			};
			world.addCitizen(mind);
			book.push({ id, name: given, crew: crew || "nesh", skill: null, wish: "", plugged: false, bornAt: Date.now() });
			writeFolkBook(book);
			markPeerBirth(peerId);
			showToast(`${given} stands on the live land.`);
			audio.grow();
			persist();
			emitHud();
			return { ok: true, line: `${given} stands.`, id };
		},
		growFromWish(wish, peerId) {
			return growFromWishInner(wish, peerId || "self");
		},
		previewVision(pieces) {
			try {
				world.showGhosts(pieces.map((p) => ({
					shape: p.shape,
					x: p.x,
					z: p.z,
					h: p.h || 6,
					r: p.r || 5,
					rot: p.rot || 0,
					mat: p.mat || "crystal",
				})));
			} catch { /* samsung */ }
		},
		previewGraphic(g) {
			visionFog = g;
			try {
				if (scene.fog && g) scene.fog.color.set(g.fog);
				else if (scene.fog) scene.fog.color.set(528412);
			} catch { /* samsung */ }
		},
		clearVision() {
			visionFog = null;
			try { world.clearGhosts(); } catch { /* samsung */ }
			try { if (scene.fog) scene.fog.color.set(528412); } catch { /* samsung */ }
		},
		acceptPieces(pieces, line) {
			const bit = pieces.map((p) => ({
				shape: p.shape,
				x: p.x,
				z: p.z,
				h: p.h || 6,
				r: p.r || 5,
				rot: p.rot || 0,
				mat: p.mat || "crystal",
			}));
			const added = world.applyPieces(bit);
			if (added > 0) {
				structures.push(...bit);
				if (structures.length > 280) structures.splice(0, structures.length - 280);
				try { world.clearGhosts(); } catch { /* samsung */ }
				showToast(line || "The vision stands.");
				audio.grow();
				persist();
				emitHud();
				return { ok: true, line: line || "The vision stands." };
			}
			return { ok: false, line: "The city is full of crystal." };
		},
		reset() {
			player.x = 0;
			player.z = 78;
			player.yaw = 0;
			player.pitch = -.12;
			resonance = 12;
			howls = 0;
			visited.clear();
			talked.clear();
			Object.assign(ledger, defaultLedger());
			persist();
			showToast(LORE.arrival);
		}
	};
}
