// @ts-nocheck
import * as THREE from "three";
import { CITIZENS, DISTRICTS, type CitizenMind, type District } from "./lore";
import type { BuildPiece, Mat, Shape } from "./build-spec";
import { denOf } from "./build-spec";
import {
  MAX_CRAFTED,
  FOLK_MAX,
  crewOf,
  isKeeper,
  makeFolk,
  rememberSite,
  stepLiving,
  takeKin,
  type CitySense,
  type PlanStep,
} from "./living";
import { emptyPouch, CITY_CAP } from "./society";
import { growWilds } from "./wilds";
import { growAtmos } from "./atmos";
import { growGrounds } from "./grounds";
import { growPulse } from "./pulse";
import { growSpans } from "./spans";
import { growFacets } from "./facets";
import { growWater } from "./water";
import { growHeat } from "./heat";
import { growMist } from "./mist";
import { growTrails } from "./trails";
import { growBeam } from "./beam";
import { growDiscs } from "./discs";
import { growCisterns } from "./cisterns";
import { growFruit } from "./fruit";
import { growRails } from "./rails";
import { growSmoke } from "./smoke";
import { growNotice } from "./notice";
import { growPier } from "./pier";
import { growGates } from "./gates";
import { growStall } from "./stall";
import { growShelves } from "./shelves";
import { growSteps } from "./steps";
import { growFountain } from "./fountain";
import { growLens } from "./lens";
import { growChorus } from "./chorus";
import { growSeat } from "./seat";
import { growCascade } from "./cascade";
import { growVeins } from "./veins";
import { growLamps } from "./lamps";
import { growCradle } from "./cradle";
import { growBanners } from "./banners";
import { growAnvil } from "./anvil";
import { growMosaic } from "./mosaic";
import { growRest } from "./rest";
import { growHail } from "./hail";
import { growArches } from "./arches";
import { growChimney } from "./chimney";
import { growTablets } from "./tablets";
import { growVeil } from "./veil";
import { growRoots } from "./roots";
import { growFont } from "./font";
import { growBoughs } from "./boughs";
import { growBells } from "./bells";
import { growPylons } from "./pylons";
import { growForge } from "./forge";
import { growScales } from "./scales";
import { growPads } from "./pads";
import { growHearth } from "./hearth";
import { growLintel } from "./lintel";
import { growLedger } from "./ledger";
import { growSluice } from "./sluice";
import { growRims } from "./rims";
import { growPosts } from "./posts";
import { growPrism } from "./prism";
import { growLip } from "./lip";
import { growStaves } from "./staves";
import { growTrough } from "./trough";
import { growPool } from "./pool";
import { growWatch } from "./watch";
import { growCorona } from "./corona";
import { growVault } from "./vault";

const {
  Group, Vector2, LatheGeometry, BoxGeometry, CylinderGeometry, ConeGeometry,
  TorusGeometry, RepeatWrapping, SRGBColorSpace, MeshPhysicalMaterial, Color,
  Mesh, MeshBasicMaterial, AdditiveBlending, DoubleSide, DirectionalLight,
  InstancedMesh, Object3D, OctahedronGeometry, IcosahedronGeometry, CapsuleGeometry,
  SphereGeometry, TextureLoader, ShaderMaterial, CircleGeometry, PointLight,
  HemisphereLight,
} = THREE;

export type AgentJob =
  | "idle" | "walk" | "build" | "greet" | "follow" | "plaza" | "help"
  | "forge" | "flow" | "write" | "gather" | "trade" | "harvest" | "watch" | "hail";

export type GrowEvent = { agentId: string; pieces: BuildPiece[]; line: string; code: string };

export type CircuitWorld = {
  group: THREE.Group;
  sampleY: (x: number, z: number) => number;
  tick: (t: number, dt: number, cam: THREE.Camera, resonance: number) => void;
  tickLiving: (dt: number, live: boolean, room: number, sense: CitySense) => GrowEvent | null;
  citizens: any[];
  districts: District[];
  applyBuild: (workKey: string) => boolean;
  applyPieces: (pieces: BuildPiece[]) => number;
  setFoundry: (crystal: number, fires: { x: number; z: number }[]) => void;
  addCitizen: (mind: CitizenMind) => void;
  built: Set<string>;
  dispose: () => void;
};

const TEX = "/luminous-circuit";

function hash2(i, s) {
	const n = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
	return n - Math.floor(n);
}
function latheTower(kind) {
	const pts = kind === "house" ? [
		new Vector2(1, 0),
		new Vector2(.92, .35),
		new Vector2(.78, .72),
		new Vector2(.55, 1)
	] : kind === "ward" ? [
		new Vector2(1, 0),
		new Vector2(.94, .22),
		new Vector2(.72, .48),
		new Vector2(.58, .78),
		new Vector2(.28, 1)
	] : [
		new Vector2(.85, 0),
		new Vector2(.7, .3),
		new Vector2(.42, .62),
		new Vector2(.18, .88),
		new Vector2(.02, 1)
	];
	return new LatheGeometry(pts, 12);
}
function geoDenHouse() {
	return new BoxGeometry(1.15, .85, .95);
}
function geoDenHall() {
	return new CylinderGeometry(.55, .85, 1.15, 8);
}
function geoDenNeedle() {
	return new ConeGeometry(.32, 1.35, 6);
}
function geoDenArch() {
	return new TorusGeometry(.55, .1, 6, 16, Math.PI);
}
function loadMap(loader, url, repeat = 1) {
	const t = loader.load(url);
	t.colorSpace = SRGBColorSpace;
	t.wrapS = t.wrapT = RepeatWrapping;
	t.repeat.set(repeat, repeat);
	t.anisotropy = 8;
	return t;
}
export function buildWorld(): CircuitWorld {
	const group = new Group();
	group.name = "core-spire-city";
	const coarse = typeof window !== "undefined" && (() => {
		try {
			return window.matchMedia("(pointer: coarse)").matches;
		} catch {
			return false;
		}
	})();
	const loader = new TextureLoader();
	const floor = loadMap(loader, `${TEX}/plaza-floor.jpg`, 6);
	const wild = loadMap(loader, `${TEX}/wild-floor-v2.jpg`, 10);
	const facade = loadMap(loader, `${TEX}/crystal-facade.jpg`, 2);
	const windows = loadMap(loader, `${TEX}/spire-windows-v2.jpg`, 2.2);
	const facet = loadMap(loader, `${TEX}/spire-facet-tile.jpg`, 2);
	const gold = loadMap(loader, `${TEX}/gold-crystal.jpg`, 2);
	const canal = loadMap(loader, `${TEX}/canal-river.jpg`, 4);
	const heart = loadMap(loader, `${TEX}/spire-heart.jpg`, 1);
	const avenue = loadMap(loader, `${TEX}/avenue-living.jpg`, 8);
	loadMap(loader, `${TEX}/tower-cyan.jpg`, 1.6);
	loadMap(loader, `${TEX}/tower-amethyst.jpg`, 1.6);
	loadMap(loader, `${TEX}/sky-core-glow.jpg`, 1);
	loadMap(loader, `${TEX}/sky-veil.jpg`, 1);
	const energy = loadMap(loader, `${TEX}/energy-canal.jpg`, 6);
	const globe = loadMap(loader, `${TEX}/globe-surface.jpg`, 8);
	const kilnTex = loadMap(loader, `${TEX}/kiln-body.jpg`, 2);
	const groveTex = loadMap(loader, `${TEX}/orchard-canopy.jpg`, 2);
	const hailTex = loadMap(loader, `${TEX}/beacon-hail.jpg`, 2);
	const clocks = [];
	const later = [];
	let pulseTick = null;
	let waterTick = null;
	let heatTick = null;
	let beamTick = null;
	let discTick = null;
	let smokeTick = null;
	let fountainTick = null;
	let cascadeTick = null;
	let bannerTick = null;
	let hailTick = null;
	let chimneyTick = null;
	let veilTick = null;
	let bellTick = null;
	let forgeTick = null;
	let poolTick = null;
	let coronaTick = null;
	function laterOn(fn) {
		later.push(fn);
	}
	function pumpLater(n = 2) {
		let i = 0;
		while (later.length && i < n) {
			const job = later.shift();
			try {
				job?.();
			} catch {}
			i += 1;
		}
		return later.length;
	}
	const mk = (opts) => new MeshPhysicalMaterial({
		color: opts.color,
		roughness: opts.roughness ?? .26,
		metalness: opts.metalness ?? .52,
		emissive: opts.emissive ?? 0,
		emissiveIntensity: opts.emissiveIntensity ?? 0,
		envMapIntensity: 1.48,
		map: opts.map ?? null,
		transparent: !!opts.transparent,
		opacity: opts.opacity ?? 1,
		clearcoat: opts.coat ?? .7,
		clearcoatRoughness: .11,
		iridescence: opts.iri ?? .74,
		iridescenceIOR: 1.28,
		iridescenceThicknessRange: [70, 540],
		sheen: .5,
		sheenColor: new Color(opts.sheenHex ?? 8049904)
	});
	function addRim(mat, rim, str = .4) {
		mat.onBeforeCompile = (shader) => {
			shader.uniforms.uRimCol = { value: new Color(rim) };
			shader.uniforms.uRimStr = { value: str };
			shader.fragmentShader = `uniform vec3 uRimCol; uniform float uRimStr;\n` + shader.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
           float _rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.7);
           totalEmissiveRadiance += uRimCol * _rim * uRimStr;`);
		};
		mat.customProgramCacheKey = () => `rim-${rim}-${str}`;
	}
	const matDeck = mk({
		color: 6977696,
		roughness: .38,
		metalness: .42,
		emissive: 1054776,
		emissiveIntensity: .18,
		map: floor,
		iri: .32,
		coat: .55
	});
	const matViolet = mk({
		color: 8027336,
		roughness: .24,
		metalness: .46,
		emissive: 2363488,
		emissiveIntensity: .4,
		map: facade,
		iri: .76,
		coat: .62,
		sheenHex: 11571455
	});
	const matCyan = mk({
		color: 8042696,
		roughness: .2,
		metalness: .52,
		emissive: 678008,
		emissiveIntensity: .48,
		map: facade,
		iri: .8,
		coat: .66,
		sheenHex: 5953776
	});
	const matGold = mk({
		color: 13940856,
		roughness: .22,
		metalness: .64,
		emissive: 6965784,
		emissiveIntensity: .36,
		map: gold,
		iri: .48,
		coat: .7,
		sheenHex: 16765040
	});
	const matWild = mk({
		color: 2896968,
		roughness: .82,
		metalness: .1,
		emissive: 395284,
		emissiveIntensity: .1,
		map: globe,
		iri: .08,
		coat: .06
	});
	const matSlab = mk({
		color: 5925520,
		roughness: .44,
		metalness: .34,
		emissive: 792632,
		emissiveIntensity: .2,
		map: avenue,
		iri: .28,
		coat: .32
	});
	const matSpire = mk({
		color: 9082560,
		roughness: .18,
		metalness: .5,
		emissive: 1321040,
		emissiveIntensity: .44,
		map: windows,
		iri: .62,
		coat: .6
	});
	const matCrystal = new MeshPhysicalMaterial({
		color: 12103916,
		roughness: .08,
		metalness: .14,
		emissive: 2102352,
		emissiveIntensity: .4,
		envMapIntensity: 1.6,
		iridescence: 1,
		iridescenceIOR: 1.3,
		iridescenceThicknessRange: [50, 540],
		sheen: .65,
		sheenColor: new Color(8317176),
		clearcoat: .92,
		clearcoatRoughness: .07,
		map: facet
	});
	matCrystal.bumpMap = facet;
	matCrystal.bumpScale = .28;
	matCrystal.clearcoatNormalScale = new Vector2(.4, .4);
	matSpire.bumpMap = windows;
	matSpire.bumpScale = .18;
	matGold.bumpMap = gold;
	matGold.bumpScale = .16;
	matWild.bumpMap = wild;
	matWild.bumpScale = .45;
	const matHeart = new MeshPhysicalMaterial({
		color: 13168888,
		roughness: .06,
		metalness: .12,
		emissive: 1349808,
		emissiveIntensity: .78,
		envMapIntensity: 1.45,
		iridescence: 1,
		iridescenceIOR: 1.26,
		sheen: .62,
		sheenColor: new Color(5953776),
		clearcoat: .85,
		clearcoatRoughness: .1,
		map: heart
	});
	addRim(matViolet, 11571455, .36);
	addRim(matCyan, 5953776, .4);
	addRim(matGold, 16765040, .32);
	addRim(matSpire, 9097448, .34);
	addRim(matCrystal, 13166847, .52);
	addRim(matHeart, 8320767, .58);
	addRim(matDeck, 4890816, .18);
	addRim(matSlab, 4890816, .16);
	const matGlow = new MeshBasicMaterial({
		color: 3854568,
		transparent: true,
		opacity: .32,
		blending: 2,
		depthWrite: false,
		map: canal
	});
	const matGoldSoft = new MeshBasicMaterial({
		color: 14725216,
		transparent: true,
		opacity: .22,
		blending: 2,
		depthWrite: false
	});
	const matVeil = new MeshBasicMaterial({
		color: 8022208,
		transparent: true,
		opacity: .12,
		blending: 2,
		depthWrite: false,
		side: 2
	});
	const matPath = new MeshBasicMaterial({
		color: 1738920,
		transparent: true,
		opacity: .18,
		blending: 2,
		depthWrite: false
	});
	function flowMat(tex, hex, gain = .55) {
		const uTime = { value: 0 };
		clocks.push(uTime);
		return new ShaderMaterial({
			uniforms: {
				uTime,
				uMap: { value: tex },
				uColor: { value: new Color(hex) },
				uGain: { value: gain }
			},
			transparent: true,
			blending: 2,
			depthWrite: false,
			side: 2,
			vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
			fragmentShader: `
        varying vec2 vUv;
        varying vec3 vWorld;
        uniform float uTime;
        uniform sampler2D uMap;
        uniform vec3 uColor;
        uniform float uGain;
        void main() {
          vec2 uv = vUv;
          uv.x += uTime * 0.07;
          uv.y += sin(vUv.x * 10.0 + uTime * 1.6) * 0.04;
          vec3 tex = texture2D(uMap, uv).rgb;
          float foam = pow(0.5 + 0.5 * sin(vUv.x * 32.0 - uTime * 3.4), 8.0);
          float foam2 = pow(0.5 + 0.5 * sin(vUv.x * 18.0 + vUv.y * 22.0 - uTime * 2.1), 6.0);
          float edge = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          vec3 V = normalize(cameraPosition - vWorld);
          float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.4);
          vec3 col = mix(uColor, tex, 0.45) + foam * vec3(0.75, 0.96, 1.0) * 0.55;
          col += foam2 * vec3(0.95, 0.78, 0.35) * 0.22;
          col += vec3(0.55, 0.88, 1.0) * fres * 0.7;
          gl_FragColor = vec4(col * uGain * (0.75 + fres * 0.55) * edge, (0.5 + foam * 0.4 + fres * 0.22) * edge);
        }
      `
		});
	}
	const matRiver = flowMat(energy, 3854568, .62);
	const matRiverGold = flowMat(gold, 14725216, .42);
	const circuitTime = { value: 0 };
	clocks.push(circuitTime);
	const matCircuit = new ShaderMaterial({
		uniforms: { uTime: circuitTime },
		transparent: true,
		blending: 2,
		depthWrite: false,
		side: 2,
		vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
		fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float a = atan(p.y, p.x);
        if (r > 0.99) discard;
        float rings = abs(sin((r * 18.0 - uTime * 0.28) * 3.14159));
        float spokes = abs(sin(a * 10.0 + uTime * 0.12));
        float hex = abs(sin(p.x * 22.0 + uTime * 0.18) * sin(p.y * 22.0));
        float pulse = 0.55 + 0.45 * sin(r * 14.0 - uTime * 1.6);
        float line = smoothstep(0.14, 0.02, rings) * pulse + smoothstep(0.08, 0.018, spokes) * 0.5;
        line += smoothstep(0.055, 0.012, hex) * 0.28;
        float fade = 1.0 - smoothstep(0.48, 0.99, r);
        vec3 col = mix(vec3(0.18, 0.78, 0.92), vec3(0.92, 0.62, 0.18), smoothstep(0.12, 0.82, r));
        col += vec3(0.55, 0.85, 1.0) * smoothstep(0.22, 0.0, r) * 0.45;
        gl_FragColor = vec4(col * line * fade, line * fade * 0.68);
      }
    `
	});
	const matsToPulse = [
		matDeck,
		matViolet,
		matCyan,
		matGold,
		matSpire,
		matCrystal,
		matHeart,
		matSlab
	];
	const baseEmissive = matsToPulse.map((m) => m.emissiveIntensity);
	const crustGeo = new CircleGeometry(2200, 96);
	{
		const pos = crustGeo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const r = Math.hypot(x, y);
			const n = Math.sin(x * .006) * Math.cos(y * .0055) + Math.sin(r * .012);
			pos.setZ(i, n * 5.2 + Math.sin(x * .018 + y * .014) * 1.8);
		}
		crustGeo.computeVertexNormals();
	}
	const crust = new Mesh(crustGeo, matWild);
	crust.rotation.x = -Math.PI / 2;
	crust.position.y = .2;
	crust.receiveShadow = true;
	group.add(crust);
	const midGeo = new CircleGeometry(920, 72);
	{
		const pos = midGeo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			pos.setZ(i, Math.sin(x * .02) * Math.cos(y * .018) * .9);
		}
		midGeo.computeVertexNormals();
	}
	const midland = new Mesh(midGeo, matDeck);
	midland.rotation.x = -Math.PI / 2;
	midland.position.y = .42;
	midland.receiveShadow = true;
	group.add(midland);
	const inner = new Mesh(new CircleGeometry(420, 56), matSlab);
	inner.rotation.x = -Math.PI / 2;
	inner.position.y = .58;
	inner.receiveShadow = true;
	group.add(inner);
	const circuit = new Mesh(new CircleGeometry(400, 64), matCircuit);
	circuit.rotation.x = -Math.PI / 2;
	circuit.position.y = .72;
	group.add(circuit);
	const plaza = new Mesh(new CylinderGeometry(108, 118, 3.2, 40), matViolet);
	plaza.position.y = 1.5;
	plaza.receiveShadow = true;
	plaza.castShadow = true;
	group.add(plaza);
	const plazaHeart = new Mesh(new CylinderGeometry(46, 52, 1.2, 36), matHeart);
	plazaHeart.position.y = 3.4;
	plazaHeart.receiveShadow = true;
	group.add(plazaHeart);
	const mosaicTime = { value: 0 };
	clocks.push(mosaicTime);
	const mosaic = new Mesh(new CircleGeometry(104, 48), new ShaderMaterial({
		uniforms: { uTime: mosaicTime },
		transparent: true,
		blending: 2,
		depthWrite: false,
		vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
		fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          if (r > 0.98) discard;
          vec2 h = p * 18.0;
          float hex = abs(fract(h.x + h.y * 0.58) - 0.5) + abs(fract(h.y * 1.15) - 0.5);
          float cell = smoothstep(0.38, 0.14, hex);
          float pulse = 0.5 + 0.5 * sin(uTime * 1.4 + r * 12.0);
          vec3 col = mix(vec3(0.18, 0.72, 0.88), vec3(0.95, 0.7, 0.22), smoothstep(0.12, 0.88, r));
          col += vec3(0.7, 0.95, 1.0) * (1.0 - smoothstep(0.0, 0.28, r)) * 0.45;
          gl_FragColor = vec4(col * cell * pulse, cell * 0.48 * pulse);
        }
      `
	}));
	mosaic.rotation.x = -Math.PI / 2;
	mosaic.position.y = 4.12;
	group.add(mosaic);
	const causticTime = { value: 0 };
	clocks.push(causticTime);
	const caustics = new Mesh(new CircleGeometry(100, 48), new ShaderMaterial({
		uniforms: { uTime: causticTime },
		transparent: true,
		blending: 2,
		depthWrite: false,
		vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
		fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        float n(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float v(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = n(i);
          float b = n(i + vec2(1.0, 0.0));
          float c = n(i + vec2(0.0, 1.0));
          float d = n(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          if (r > 0.98) discard;
          vec2 q = p * 7.5 + vec2(uTime * 0.18, -uTime * 0.12);
          float c = v(q) * v(q * 1.7 + 4.0);
          c = pow(c, 3.2);
          float ring = smoothstep(0.2, 0.0, abs(r - 0.55));
          vec3 col = mix(vec3(0.15, 0.7, 0.85), vec3(0.9, 0.7, 0.25), r);
          gl_FragColor = vec4(col * (c * 1.4 + ring * 0.12), (c * 0.55 + ring * 0.08) * (1.0 - r * 0.4));
        }
      `
	}));
	caustics.rotation.x = -Math.PI / 2;
	caustics.position.y = 4.18;
	group.add(caustics);
	const plazaRing = new Mesh(new TorusGeometry(58, 1.1, 10, 48), matGlow);
	plazaRing.rotation.x = Math.PI / 2;
	plazaRing.position.y = 4.2;
	group.add(plazaRing);
	for (let r = 0; r < 4; r++) {
		const inlay = new Mesh(new TorusGeometry(22 + r * 14, .45, 8, 40), r % 2 ? matGoldSoft : matPath);
		inlay.rotation.x = Math.PI / 2;
		inlay.position.y = 4.05;
		group.add(inlay);
	}
	for (let i = 0; i < 18; i++) {
		const a = i / 18 * Math.PI * 2;
		const shard = new Mesh(new OctahedronGeometry(1.15, 0), i % 3 ? matCrystal : matHeart);
		shard.position.set(Math.cos(a) * 74, 4.6, Math.sin(a) * 74);
		shard.rotation.set(.4, a, .2);
		shard.scale.set(.7, 1.8 + i % 4 * .4, .7);
		group.add(shard);
	}
	for (let i = 0; i < 12; i++) {
		const a = i / 12 * Math.PI * 2;
		const vein = new Mesh(new BoxGeometry(6.4, .22, 220), i % 2 ? matRiver : matRiverGold);
		vein.position.set(Math.cos(a) * 128, 1.42, Math.sin(a) * 128);
		vein.rotation.y = a;
		group.add(vein);
	}
	const well = new Mesh(new TorusGeometry(92, 1.8, 10, 48), matGoldSoft);
	well.rotation.x = Math.PI / 2;
	well.position.y = 7.2;
	group.add(well);
	const well2 = new Mesh(new TorusGeometry(72, 1.2, 10, 44), matGlow);
	well2.rotation.x = Math.PI / 2;
	well2.position.y = 14.6;
	group.add(well2);
	const spire = new Group();
	spire.name = "resonance-hub";
	[
		{
			r0: 68,
			r1: 60,
			h: 4.4,
			y: 3.6
		},
		{
			r0: 58,
			r1: 50,
			h: 5,
			y: 8.2
		},
		{
			r0: 48,
			r1: 40,
			h: 5.2,
			y: 13.2
		},
		{
			r0: 38,
			r1: 30,
			h: 4.8,
			y: 18.2
		},
		{
			r0: 28,
			r1: 22,
			h: 4.2,
			y: 22.6
		}
	].forEach((T, i) => {
		const step = new Mesh(new CylinderGeometry(T.r1, T.r0, T.h, 24), i % 2 ? matSlab : matSpire);
		step.position.y = T.y;
		spire.add(step);
		const lip = new Mesh(new TorusGeometry(T.r1 + .4, .42, 6, 24), i % 2 ? matGoldSoft : matGlow);
		lip.rotation.x = Math.PI / 2;
		lip.position.y = T.y + T.h * .48;
		spire.add(lip);
	});
	const lowPts = [
		new Vector2(54, 18),
		new Vector2(48, 36),
		new Vector2(40, 58),
		new Vector2(32, 86),
		new Vector2(24, 112)
	];
	const low = new Mesh(new LatheGeometry(lowPts, 12), matSpire);
	spire.add(low);
	const upPts = [
		new Vector2(22, 112),
		new Vector2(18, 148),
		new Vector2(13, 188),
		new Vector2(8, 228),
		new Vector2(3.4, 262),
		new Vector2(.2, 286)
	];
	const up = new Mesh(new LatheGeometry(upPts, 12), matCrystal);
	spire.add(up);
	const shaft = new Mesh(new CylinderGeometry(8.2, 9.4, 52, 6), matHeart);
	shaft.position.y = 148;
	spire.add(shaft);
	const matInnerCore = new MeshPhysicalMaterial({
		color: 13172728,
		emissive: 1747144,
		emissiveIntensity: .92,
		roughness: .04,
		metalness: .08,
		transmission: .55,
		thickness: 3.4,
		ior: 1.5,
		iridescence: 1,
		iridescenceIOR: 1.32,
		iridescenceThicknessRange: [80, 480],
		clearcoat: 1,
		clearcoatRoughness: .03,
		transparent: true,
		opacity: .94,
		envMapIntensity: 1.75,
		sheen: .72,
		sheenColor: new Color(8320767),
		attenuationColor: new Color(4903144),
		attenuationDistance: 3.6
	});
	const innerCore = new Mesh(new OctahedronGeometry(5.2, 1), matInnerCore);
	innerCore.scale.set(.55, 2.6, .55);
	innerCore.position.y = 148;
	spire.add(innerCore);
	matsToPulse.push(matInnerCore);
	baseEmissive.push(matInnerCore.emissiveIntensity);
	const peak = new Mesh(new ConeGeometry(6.4, 28, 6), matHeart);
	peak.position.y = 292;
	spire.add(peak);
	const shaftGlow = new Mesh(new CylinderGeometry(11, 18, 260, 10, 1, true), new MeshBasicMaterial({
		color: 4903136,
		transparent: true,
		opacity: .06,
		blending: 2,
		depthWrite: false,
		side: 2
	}));
	shaftGlow.position.y = 150;
	spire.add(shaftGlow);
	const beam = new Mesh(new ConeGeometry(22, 420, 10, 1, true), new MeshBasicMaterial({
		color: 4905192,
		transparent: true,
		opacity: .05,
		blending: 2,
		depthWrite: false,
		side: 2
	}));
	beam.position.y = 210;
	spire.add(beam);
	const lattice = new Mesh(new IcosahedronGeometry(11, 1), new MeshBasicMaterial({
		color: 7006452,
		transparent: true,
		opacity: .18,
		wireframe: true,
		blending: 2,
		depthWrite: false
	}));
	lattice.position.y = 148;
	spire.add(lattice);
	const orbit = new Group();
	orbit.position.y = 78;
	for (let i = 0; i < 10; i++) {
		const a = i / 10 * Math.PI * 2;
		const shard = new Mesh(new OctahedronGeometry(2.1, 0), i % 2 ? matHeart : matCrystal);
		shard.position.set(Math.cos(a) * 42, Math.sin(i * 1.3) * 8, Math.sin(a) * 42);
		shard.scale.set(.55, 2.2, .55);
		shard.rotation.z = .4;
		orbit.add(shard);
	}
	spire.add(orbit);
	spire.scale.setScalar(1.18);
	spire.traverse((o) => {
		const m = o;
		if (m.isMesh) m.castShadow = true;
	});
	group.add(spire);
	group.add(new PointLight(3073791, 9, 620, 1.35));
	const hubLight = new PointLight(8313070, 6.5, 440, 1.3);
	hubLight.position.set(0, 210, 0);
	group.add(hubLight);
	const goldKiss = new PointLight(14725216, 3.6, 280, 1.5);
	goldKiss.position.set(50, 64, 36);
	group.add(goldKiss);
	const coreKiss = new DirectionalLight(8966376, .22);
	coreKiss.position.set(-2400, 620, 120);
	group.add(coreKiss);
	group.add(new HemisphereLight(6990020, 460302, .48));
	const sun = new DirectionalLight(13688556, .78);
	sun.position.set(280, 480, 220);
	sun.castShadow = true;
	sun.shadow.mapSize.set(1024, 1024);
	sun.shadow.camera.near = 10;
	sun.shadow.camera.far = 520;
	sun.shadow.camera.left = -95;
	sun.shadow.camera.right = 95;
	sun.shadow.camera.top = 95;
	sun.shadow.camera.bottom = -95;
	sun.shadow.bias = -4e-4;
	sun.shadow.normalBias = .035;
	sun.target.position.set(0, 0, 0);
	group.add(sun);
	group.add(sun.target);
	const fill = new DirectionalLight(6970016, .2);
	fill.position.set(-220, 90, -240);
	group.add(fill);
	const rim = new DirectionalLight(3854568, .14);
	rim.position.set(-80, 40, 200);
	group.add(rim);
	latheTower("house");
	const geoWard = latheTower("ward");
	const geoSpire = latheTower("spire");
	const geoDen = geoDenHouse();
	const geoHallBlock = geoDenHall();
	const geoNeedle = geoDenNeedle();
	const geoGate = geoDenArch();
	const geoKilnBody = new CylinderGeometry(3.8, 5.4, 12, 8);
	const geoKilnFlue = new CylinderGeometry(1.15, 1.9, 14, 6);
	const geoKilnMouth = new TorusGeometry(1.8, .45, 6, 12);
	const geoWeirStep = new BoxGeometry(16, 2.2, 6.5);
	const geoWeirSheet = new BoxGeometry(15, .45, 8);
	const geoWeirLip = new BoxGeometry(16.5, .7, 2.2);
	const geoNestBowl = new TorusGeometry(4.4, 1.05, 6, 14);
	const geoNestGem = new OctahedronGeometry(1.8, 0);
	const geoBoughTrunk = new CylinderGeometry(.9, 1.5, 9, 6);
	const geoBoughCanopy = new ConeGeometry(5.4, 13, 7);
	const geoBoughFruit = new OctahedronGeometry(1.15, 0);
	const geoBeaconPost = new CylinderGeometry(1.5, 2.6, 24, 6);
	const geoBeaconFlame = new OctahedronGeometry(2.4, 0);
	const geoOrbitRing = new TorusGeometry(5.5, .35, 6, 16);
	const geoOrbitShard = new OctahedronGeometry(2.2, 0);
	const geoMarketHex = new CylinderGeometry(5.8, 6.4, 1.4, 6);
	const geoMarketCanopy = new ConeGeometry(5.2, 4.2, 6);
	const geoVeinBar = new BoxGeometry(18, 1.1, 2.2);
	const geoHowlPillar = new CylinderGeometry(1.6, 2.4, 16, 8);
	const geoHowlRing = new TorusGeometry(4.8, .55, 6, 18);
	const geoGatePier = new BoxGeometry(2.4, 16, 2.4);
	const geoArchiveTab = new BoxGeometry(3.4, 16, .7);
	const geoArchiveRune = new BoxGeometry(1.8, 8, .2);
	const geoBridgeRib = new TorusGeometry(6.2, .55, 6, 16, Math.PI);
	function wardTint(kind) {
		switch (kind) {
			case "foundry": return mk({
				color: 14196816,
				roughness: .22,
				metalness: .64,
				emissive: 9058824,
				emissiveIntensity: .52,
				map: kilnTex,
				iri: .28,
				coat: .68,
				sheenHex: 16756800
			});
			case "canal": return mk({
				color: 7001320,
				roughness: .16,
				metalness: .38,
				emissive: 559272,
				emissiveIntensity: .55,
				map: facade,
				iri: .92,
				coat: .78,
				sheenHex: 6222079
			});
			case "terrace": return mk({
				color: 11049192,
				roughness: .2,
				metalness: .4,
				emissive: 3807352,
				emissiveIntensity: .46,
				map: facade,
				iri: .8,
				coat: .7,
				sheenHex: 13148415
			});
			case "gate": return mk({
				color: 9081032,
				roughness: .18,
				metalness: .48,
				emissive: 2627688,
				emissiveIntensity: .44,
				map: windows,
				iri: .7,
				coat: .72,
				sheenHex: 11571455
			});
			case "grove": return mk({
				color: 13152352,
				roughness: .28,
				metalness: .5,
				emissive: 5914640,
				emissiveIntensity: .42,
				map: groveTex,
				iri: .5,
				coat: .6,
				sheenHex: 15257712
			});
			case "beacon": return mk({
				color: 12110064,
				roughness: .12,
				metalness: .42,
				emissive: 4219080,
				emissiveIntensity: .62,
				map: hailTex,
				iri: .88,
				coat: .85,
				sheenHex: 13682943
			});
			case "overlook": return mk({
				color: 9490656,
				roughness: .14,
				metalness: .45,
				emissive: 684176,
				emissiveIntensity: .5,
				map: heart,
				iri: .85,
				coat: .8,
				sheenHex: 10545407
			});
			case "market": return mk({
				color: 14731384,
				roughness: .24,
				metalness: .55,
				emissive: 6965264,
				emissiveIntensity: .46,
				map: gold,
				iri: .4,
				coat: .65,
				sheenHex: 16769152
			});
			case "wild": return mk({
				color: 9488552,
				roughness: .32,
				metalness: .28,
				emissive: 1597504,
				emissiveIntensity: .4,
				map: facet,
				iri: .75,
				coat: .55,
				sheenHex: 8450240
			});
			case "ring": return mk({
				color: 9994448,
				roughness: .18,
				metalness: .46,
				emissive: 4200568,
				emissiveIntensity: .5,
				map: facade,
				iri: .82,
				coat: .74,
				sheenHex: 12620031
			});
			case "archive": return mk({
				color: 13154440,
				roughness: .2,
				metalness: .5,
				emissive: 5783576,
				emissiveIntensity: .4,
				map: gold,
				iri: .45,
				coat: .7,
				sheenHex: 16771232
			});
			default: return mk({
				color: 8042712,
				roughness: .16,
				metalness: .5,
				emissive: 1333368,
				emissiveIntensity: .48,
				map: facade,
				iri: .78,
				coat: .72,
				sheenHex: 7397631
			});
		}
	}
	function wardGlowHex(kind) {
		switch (kind) {
			case "foundry": return 16752704;
			case "grove": return 15257696;
			case "canal": return 3073791;
			case "overlook": return 8317176;
			case "market": return 15254890;
			case "beacon": return 13678847;
			case "gate": return 11571455;
			case "archive": return 16765040;
			case "wild": return 8450240;
			case "ring": return 12620031;
			case "terrace": return 13148415;
			default: return 5953776;
		}
	}
	DISTRICTS.forEach((D) => {
		laterOn(() => {
			const zg = new Group();
			zg.position.set(D.x, 0, D.z);
			const hMat = wardTint(D.kind);
			matsToPulse.push(hMat);
			baseEmissive.push(hMat.emissiveIntensity);
			const gHex = wardGlowHex(D.kind);
			const pad = new Mesh(new CylinderGeometry(88, 98, 5.2, 28), matDeck);
			pad.position.y = 2.6;
			pad.receiveShadow = true;
			pad.castShadow = true;
			zg.add(pad);
			const sigil = new Mesh(new TorusGeometry(44, 1.5, 6, 24), D.kind === "foundry" || D.kind === "grove" || D.kind === "market" ? matGoldSoft : matGlow);
			sigil.rotation.x = Math.PI / 2;
			sigil.position.y = 5.35;
			zg.add(sigil);
			let hall;
			if (D.kind === "foundry") {
				hall = new Mesh(geoHallBlock, hMat);
				hall.scale.set(28, 62, 28);
			} else if (D.kind === "market") {
				hall = new Mesh(geoHallBlock, hMat);
				hall.scale.set(22, 44, 22);
			} else if (D.kind === "beacon") {
				hall = new Mesh(geoSpire, hMat);
				hall.scale.set(14, 124, 14);
			} else if (D.kind === "overlook") {
				hall = new Mesh(geoSpire, hMat);
				hall.scale.set(16, 108, 16);
			} else if (D.kind === "wild") {
				hall = new Mesh(geoNeedle, hMat);
				hall.scale.set(14, 92, 14);
			} else if (D.kind === "canal") {
				hall = new Mesh(new BoxGeometry(1, 1, 1), hMat);
				hall.scale.set(52, 28, 22);
			} else if (D.kind === "ring") {
				hall = new Mesh(geoWard, hMat);
				hall.scale.set(28, 48, 28);
			} else if (D.kind === "terrace") {
				hall = new Mesh(geoWard, hMat);
				hall.scale.set(40, 64, 40);
			} else if (D.kind === "grove") {
				hall = new Mesh(geoWard, hMat);
				hall.scale.set(32, 78, 32);
			} else if (D.kind === "gate") {
				hall = new Mesh(geoWard, hMat);
				hall.scale.set(26, 86, 26);
			} else if (D.kind === "archive") {
				hall = new Mesh(geoWard, hMat);
				hall.scale.set(28, 100, 28);
			} else {
				hall = new Mesh(geoWard, hMat);
				hall.scale.set(34, 92, 34);
			}
			hall.position.y = 8;
			hall.castShadow = true;
			zg.add(hall);
			const lip = new Mesh(new TorusGeometry(D.kind === "beacon" || D.kind === "overlook" ? 12 : 20, .7, 8, 24), D.kind === "foundry" || D.kind === "grove" || D.kind === "market" ? matGoldSoft : matGlow);
			lip.rotation.x = Math.PI / 2;
			lip.position.y = D.kind === "beacon" ? 72 : D.kind === "canal" ? 28 : 42;
			zg.add(lip);
			const wardGlow = new Mesh(new SphereGeometry(D.kind === "beacon" ? 5.2 : 7.5, 12, 10), new MeshBasicMaterial({
				color: gHex,
				transparent: true,
				opacity: .46,
				blending: 2,
				depthWrite: false
			}));
			wardGlow.position.set(0, D.kind === "beacon" ? 88 : D.kind === "canal" ? 28 : 48, 0);
			zg.add(wardGlow);
			const door = new Mesh(new BoxGeometry(8, 14, 1.2), matGlow);
			door.position.set(0, 9, D.kind === "canal" ? 14 : 34);
			zg.add(door);
			for (let k = 0; k < 8; k++) {
				const a = k / 8 * Math.PI * 2;
				const px = Math.cos(a) * 52;
				const pz = Math.sin(a) * 52;
				if (D.kind === "foundry") {
					const kiln = new Mesh(geoKilnBody, hMat);
					kiln.position.set(px, 8.2, pz);
					kiln.rotation.y = a;
					zg.add(kiln);
					const flue = new Mesh(geoKilnFlue, matSpire);
					flue.position.set(px, 18.5, pz);
					zg.add(flue);
					const mouth = new Mesh(geoKilnMouth, matGoldSoft);
					mouth.position.set(px + Math.cos(a) * 4.2, 6.5, pz + Math.sin(a) * 4.2);
					mouth.rotation.y = a;
					mouth.rotation.z = Math.PI / 2;
					zg.add(mouth);
				} else if (D.kind === "canal") {
					const wall = new Mesh(geoWeirStep, hMat);
					wall.position.set(px, 5.4, pz);
					wall.rotation.y = a;
					zg.add(wall);
					const drop = new Mesh(geoWeirSheet, matRiver);
					drop.position.set(px, 4.4, pz);
					drop.rotation.y = a;
					zg.add(drop);
					const lipW = new Mesh(geoWeirLip, matCyan);
					lipW.position.set(px, 6.8, pz);
					lipW.rotation.y = a;
					zg.add(lipW);
				} else if (D.kind === "terrace") {
					const stem = new Mesh(geoBoughTrunk, matViolet);
					stem.position.set(px, 5.2, pz);
					zg.add(stem);
					const nest = new Mesh(geoNestBowl, hMat);
					nest.position.set(px, 8.6, pz);
					nest.rotation.x = Math.PI / 2;
					zg.add(nest);
					const gem = new Mesh(geoNestGem, matHeart);
					gem.position.set(px, 9.4, pz);
					gem.scale.set(.7, 1.4, .7);
					zg.add(gem);
				} else if (D.kind === "gate") {
					const arch = new Mesh(geoGate, hMat);
					arch.scale.set(10, 14, 10);
					arch.position.set(px, 4.2, pz);
					arch.rotation.y = a;
					zg.add(arch);
					const pierL = new Mesh(geoGatePier, matSpire);
					pierL.position.set(px + Math.cos(a + .22) * 5.2, 10, pz + Math.sin(a + .22) * 5.2);
					zg.add(pierL);
					const pierR = new Mesh(geoGatePier, matSpire);
					pierR.position.set(px + Math.cos(a - .22) * 5.2, 10, pz + Math.sin(a - .22) * 5.2);
					zg.add(pierR);
				} else if (D.kind === "grove") {
					const trunk = new Mesh(geoBoughTrunk, matViolet);
					trunk.position.set(px, 7, pz);
					trunk.scale.set(1.4, 1.5, 1.4);
					zg.add(trunk);
					const canopy = new Mesh(geoBoughCanopy, hMat);
					canopy.position.set(px, 16, pz);
					zg.add(canopy);
					const bough = new Mesh(geoBoughCanopy, matGold);
					bough.scale.set(.55, .7, .55);
					bough.position.set(px + Math.cos(a) * 4, 13, pz + Math.sin(a) * 4);
					bough.rotation.z = .7;
					bough.rotation.y = a;
					zg.add(bough);
					const fruit = new Mesh(geoBoughFruit, matHeart);
					fruit.position.set(px + Math.cos(a) * 3.2, 12.2, pz + Math.sin(a) * 3.2);
					zg.add(fruit);
				} else if (D.kind === "beacon") {
					const post = new Mesh(geoBeaconPost, hMat);
					post.position.set(px, 14, pz);
					zg.add(post);
					const flame = new Mesh(geoBeaconFlame, matGlow);
					flame.position.set(px, 28, pz);
					zg.add(flame);
					const haloB = new Mesh(geoOrbitRing, matGlow);
					haloB.position.set(px, 24, pz);
					haloB.rotation.x = Math.PI / 2;
					zg.add(haloB);
				} else if (D.kind === "overlook") {
					const needle = new Mesh(geoNeedle, hMat);
					needle.scale.set(5, 18, 5);
					needle.position.set(px, 4, pz);
					zg.add(needle);
					const ringO = new Mesh(geoOrbitRing, matGlow);
					ringO.position.set(px, 16, pz);
					ringO.rotation.x = .9;
					ringO.rotation.y = a;
					zg.add(ringO);
					const shard = new Mesh(geoOrbitShard, matCrystal);
					shard.position.set(px + Math.cos(a) * 5.5, 16, pz + Math.sin(a) * 5.5);
					shard.scale.set(.5, 1.8, .5);
					zg.add(shard);
				} else if (D.kind === "market") {
					const mpad = new Mesh(geoMarketHex, k % 2 ? matGold : hMat);
					mpad.position.set(px, 4.4, pz);
					mpad.rotation.y = a;
					zg.add(mpad);
					const canopy = new Mesh(geoMarketCanopy, k % 2 ? hMat : matCyan);
					canopy.position.set(px, 8.6, pz);
					zg.add(canopy);
					const pole = new Mesh(geoBoughTrunk, matSpire);
					pole.position.set(px, 6.2, pz);
					pole.scale.set(.5, .7, .5);
					zg.add(pole);
				} else if (D.kind === "wild") {
					const shard = new Mesh(geoOrbitShard, matCrystal);
					shard.scale.set(.9, 3.2, .9);
					shard.position.set(px, 9, pz);
					shard.rotation.set(.25, a, .15);
					zg.add(shard);
					const vein = new Mesh(geoVeinBar, matGlow);
					vein.position.set(px * .55, 5.2, pz * .55);
					vein.rotation.y = a;
					zg.add(vein);
				} else if (D.kind === "ring") {
					const pillar = new Mesh(geoHowlPillar, hMat);
					pillar.position.set(px, 11, pz);
					zg.add(pillar);
					const hoop = new Mesh(geoHowlRing, matGlow);
					hoop.position.set(px, 18, pz);
					hoop.rotation.x = Math.PI / 2;
					zg.add(hoop);
				} else if (D.kind === "archive") {
					const tab = new Mesh(geoArchiveTab, matGold);
					tab.position.set(px, 10, pz);
					tab.rotation.y = a;
					zg.add(tab);
					const rune = new Mesh(geoArchiveRune, matGlow);
					rune.position.set(px + Math.cos(a) * .6, 10, pz + Math.sin(a) * .6);
					rune.rotation.y = a;
					zg.add(rune);
				} else {
					const tw = new Mesh(geoDen, k % 2 ? matCyan : matSpire);
					tw.scale.set(6.5, 8 + k % 3 * 2, 6.5);
					tw.position.set(px, 2.8, pz);
					tw.rotation.y = a;
					zg.add(tw);
					const rib = new Mesh(geoBridgeRib, matGlow);
					rib.position.set(px, 10, pz);
					rib.rotation.y = a;
					zg.add(rib);
				}
			}
			if (D.kind === "canal") {
				for (let i = 0; i < 6; i++) {
					const strip = new Mesh(new BoxGeometry(168, .55, 7.2), matRiver);
					strip.position.set(0, 4.6, -62 + i * 24);
					zg.add(strip);
				}
				for (let i = 0; i < 5; i++) {
					const weir = new Mesh(geoWeirStep, matCyan);
					weir.position.set(-36 + i * 18, 6.2 + i * 1.35, 18);
					weir.scale.set(.7, 1, .8);
					zg.add(weir);
					const sheet = new Mesh(geoWeirSheet, matRiver);
					sheet.position.set(-36 + i * 18, 5.4 + i * 1.35, 22);
					sheet.scale.set(.55, 1, .7);
					zg.add(sheet);
				}
			}
			if (D.kind === "bridge") {
				const arc = new Mesh(new TorusGeometry(58, 3.2, 8, 28, Math.PI), matGlow);
				arc.rotation.z = Math.PI / 2;
				arc.position.set(-58, 22, 0);
				zg.add(arc);
				const rail = new Mesh(new TorusGeometry(58, .7, 6, 28, Math.PI), matRiver);
				rail.rotation.z = Math.PI / 2;
				rail.position.set(-58, 22, 0);
				zg.add(rail);
			}
			if (D.kind === "terrace") {
				const step = new Mesh(new CylinderGeometry(52, 68, 4.2, 20), matSpire);
				step.position.y = 6.2;
				zg.add(step);
				for (let g = 0; g < 8; g++) {
					const a = g / 8 * Math.PI * 2;
					const nest = new Mesh(geoNestBowl, matViolet);
					nest.position.set(Math.cos(a) * 40, 11.2, Math.sin(a) * 40);
					nest.rotation.x = Math.PI / 2;
					zg.add(nest);
					const gem = new Mesh(geoNestGem, matHeart);
					gem.position.set(Math.cos(a) * 40, 12.2, Math.sin(a) * 40);
					gem.scale.set(.55, 1.2, .55);
					zg.add(gem);
					const trunk = new Mesh(geoBoughTrunk, matViolet);
					trunk.position.set(Math.cos(a) * 40, 7.4, Math.sin(a) * 40);
					zg.add(trunk);
				}
			}
			if (D.kind === "foundry") for (let c = 0; c < 3; c++) {
				const kiln = new Mesh(geoKilnBody, hMat);
				kiln.position.set((c - 1) * 18, 16, 22);
				kiln.scale.set(1.45, 1.85, 1.45);
				zg.add(kiln);
				const chimney = new Mesh(geoKilnFlue, matGold);
				chimney.position.set((c - 1) * 18, 38, 22);
				chimney.scale.set(1.4, 1.6, 1.4);
				zg.add(chimney);
				const flare = new Mesh(new SphereGeometry(3.8, 10, 8), matGoldSoft);
				flare.position.set((c - 1) * 18, 50, 22);
				zg.add(flare);
				const mouth = new Mesh(geoKilnMouth, matGoldSoft);
				mouth.position.set((c - 1) * 18, 12, 30);
				mouth.scale.set(1.6, 1.6, 1.6);
				mouth.rotation.x = Math.PI / 2;
				zg.add(mouth);
			}
			if (D.kind === "gate") {
				const arch = new Mesh(new TorusGeometry(38, 3.4, 8, 28, Math.PI), matGlow);
				arch.rotation.z = Math.PI / 2;
				arch.position.set(0, 28, 22);
				zg.add(arch);
				const arch2 = new Mesh(new TorusGeometry(26, 1.4, 6, 24, Math.PI), matVeil);
				arch2.rotation.z = Math.PI / 2;
				arch2.position.set(0, 22, 22);
				zg.add(arch2);
				[-1, 1].forEach((s) => {
					const pier = new Mesh(geoGatePier, matSpire);
					pier.position.set(s * 36, 16, 22);
					pier.scale.set(1.8, 2.1, 1.8);
					zg.add(pier);
				});
			}
			if (D.kind === "archive") for (let t = 0; t < 7; t++) {
				const a = t / 7 * Math.PI * 2;
				const tab = new Mesh(geoArchiveTab, matGold);
				tab.position.set(Math.cos(a) * 36, 12, Math.sin(a) * 36);
				tab.rotation.y = a;
				zg.add(tab);
				const rune = new Mesh(geoArchiveRune, matGlow);
				rune.position.set(Math.cos(a) * 36.6, 12, Math.sin(a) * 36.6);
				rune.rotation.y = a;
				zg.add(rune);
			}
			if (D.kind === "overlook") {
				const lens = new Mesh(new CircleGeometry(22, 24), matHeart);
				lens.position.set(-18, 36, 8);
				lens.lookAt(-2400, 620, 120);
				zg.add(lens);
				const rail = new Mesh(new TorusGeometry(40, 1.1, 6, 28), matGlow);
				rail.rotation.x = Math.PI / 2;
				rail.position.y = 8;
				zg.add(rail);
				const orbitR = new Mesh(new TorusGeometry(28, .7, 6, 28), matGlow);
				orbitR.rotation.x = .55;
				orbitR.position.set(-18, 36, 8);
				zg.add(orbitR);
				for (let i = 0; i < 6; i++) {
					const a = i / 6 * Math.PI * 2;
					const shard = new Mesh(geoOrbitShard, i % 2 ? matCrystal : matHeart);
					shard.position.set(-18 + Math.cos(a) * 28, 36 + Math.sin(a * 1.4) * 6, 8 + Math.sin(a) * 28);
					shard.scale.set(.55, 2.1, .55);
					zg.add(shard);
				}
			}
			if (D.kind === "market") for (let i = 0; i < 6; i++) {
				const a = i / 6 * Math.PI * 2;
				const stall = new Mesh(new BoxGeometry(10, 4, 8), i % 2 ? matGold : matCyan);
				stall.position.set(Math.cos(a) * 34, 6, Math.sin(a) * 34);
				stall.rotation.y = a;
				zg.add(stall);
				const mpad = new Mesh(geoMarketHex, i % 2 ? matGold : hMat);
				mpad.position.set(Math.cos(a) * 34, 3.6, Math.sin(a) * 34);
				mpad.scale.set(1.35, .7, 1.35);
				zg.add(mpad);
				const canopy = new Mesh(geoMarketCanopy, i % 2 ? hMat : matCyan);
				canopy.position.set(Math.cos(a) * 34, 10.4, Math.sin(a) * 34);
				canopy.scale.set(1.15, .7, 1.15);
				zg.add(canopy);
			}
			if (D.kind === "wild") for (let i = 0; i < 12; i++) {
				const a = hash2(i, 9) * Math.PI * 2;
				const r = 22 + hash2(i, 4) * 48;
				const shard = new Mesh(geoOrbitShard, i % 2 ? matCrystal : matGold);
				shard.position.set(Math.cos(a) * r, 8 + hash2(i, 2) * 6, Math.sin(a) * r);
				shard.rotation.set(.3, a, .2);
				shard.scale.set(.7, 2.6, .7);
				zg.add(shard);
				const vein = new Mesh(geoVeinBar, i % 2 ? matRiver : matPath);
				vein.position.set(Math.cos(a) * r * .5, 5.1, Math.sin(a) * r * .5);
				vein.rotation.y = a;
				vein.scale.set(r / 28, 1, 1);
				zg.add(vein);
			}
			if (D.kind === "beacon") {
				const tower = new Mesh(geoSpire, matCyan);
				tower.scale.set(10, 70, 10);
				tower.position.y = 10;
				zg.add(tower);
				const flame = new Mesh(new SphereGeometry(6, 12, 10), matGlow);
				flame.position.y = 78;
				zg.add(flame);
				for (let i = 0; i < 3; i++) {
					const haloB = new Mesh(new TorusGeometry(8 + i * 4, .35, 6, 20), i % 2 ? matGoldSoft : matGlow);
					haloB.rotation.x = Math.PI / 2 + i * .18;
					haloB.position.y = 70 + i * 4;
					zg.add(haloB);
				}
			}
			if (D.kind === "ring") {
				const hoop = new Mesh(new TorusGeometry(48, 2.2, 8, 40), matGlow);
				hoop.rotation.x = Math.PI / 2;
				hoop.position.y = 10;
				zg.add(hoop);
				const hoop2 = new Mesh(new TorusGeometry(62, 1.1, 6, 40), matGoldSoft);
				hoop2.rotation.x = Math.PI / 2;
				hoop2.position.y = 16;
				zg.add(hoop2);
				for (let i = 0; i < 8; i++) {
					const a = i / 8 * Math.PI * 2;
					const pillar = new Mesh(geoHowlPillar, hMat);
					pillar.position.set(Math.cos(a) * 48, 12, Math.sin(a) * 48);
					zg.add(pillar);
				}
			}
			if (D.kind === "grove") for (let g = 0; g < 10; g++) {
				const a = g / 10 * Math.PI * 2;
				const trunk = new Mesh(geoBoughTrunk, matViolet);
				trunk.position.set(Math.cos(a) * 38, 8, Math.sin(a) * 38);
				trunk.scale.set(1.5, 1.4, 1.5);
				zg.add(trunk);
				const tree = new Mesh(geoBoughCanopy, matGold);
				tree.position.set(Math.cos(a) * 38, 16, Math.sin(a) * 38);
				zg.add(tree);
				const bough = new Mesh(geoBoughCanopy, hMat);
				bough.scale.set(.5, .65, .5);
				bough.position.set(Math.cos(a) * 42, 13.5, Math.sin(a) * 42);
				bough.rotation.z = .65;
				bough.rotation.y = a;
				zg.add(bough);
				const fruit = new Mesh(geoBoughFruit, matHeart);
				fruit.position.set(Math.cos(a) * 41, 12.4, Math.sin(a) * 41);
				zg.add(fruit);
			}
			group.add(zg);
			const dist = Math.hypot(D.x, D.z);
			const path = new Mesh(new BoxGeometry(16, .28, dist), matRiver);
			path.position.set(D.x / 2, 1.28, D.z / 2);
			path.rotation.y = Math.atan2(D.x, D.z);
			group.add(path);
			const span = new Mesh(new TorusGeometry(dist / 2, 2.1, 8, 36, Math.PI), matGlow);
			span.position.set(D.x / 2, 4, D.z / 2);
			span.rotation.y = Math.atan2(D.x, D.z);
			span.rotation.z = Math.PI / 2;
			group.add(span);
			const spanRail = new Mesh(new TorusGeometry(dist / 2, .55, 6, 36, Math.PI), D.kind === "foundry" ? matRiverGold : matRiver);
			spanRail.position.copy(span.position);
			spanRail.rotation.copy(span.rotation);
			group.add(spanRail);
		});
	});
	function stamp(geo, mat, r0, r1, n, h0, h1, seed, fat0, fat1) {
		const dummy = new Object3D();
		const transforms = [];
		for (let i = 0; i < n; i++) {
			const h = hash2(i + seed, seed * 3 + i);
			const h2 = hash2(i * 5 + seed, i * 9);
			const a = h * Math.PI * 2;
			const r = r0 + h2 * (r1 - r0);
			if (r < 140) continue;
			let blocked = false;
			for (const d of DISTRICTS) if (Math.hypot(Math.cos(a) * r - d.x, Math.sin(a) * r - d.z) < 118) {
				blocked = true;
				break;
			}
			if (blocked) continue;
			transforms.push({
				x: Math.cos(a) * r,
				z: Math.sin(a) * r,
				sy: h0 + hash2(i, seed + 7) * (h1 - h0),
				fat: fat0 + h * (fat1 - fat0),
				ry: a + h2 * .7
			});
		}
		const mesh = new InstancedMesh(geo, mat, transforms.length);
		transforms.forEach((t, i) => {
			dummy.position.set(t.x, 1.2, t.z);
			dummy.rotation.set(0, t.ry, 0);
			dummy.scale.set(t.fat, t.sy, t.fat * .92);
			dummy.updateMatrix();
			mesh.setMatrixAt(i, dummy.matrix);
		});
		mesh.instanceMatrix.needsUpdate = true;
		mesh.castShadow = false;
		mesh.receiveShadow = true;
		group.add(mesh);
	}
	laterOn(() => stamp(geoDen, matSpire, 150, 340, Math.ceil(48), 8, 14, 11, 7, 11));
	laterOn(() => stamp(geoHallBlock, matCyan, 200, 520, Math.ceil(28), 18, 32, 17, 9, 14));
	laterOn(() => stamp(geoNeedle, matGold, 280, 640, Math.ceil(36), 22, 48, 23, 5, 8));
	laterOn(() => stamp(geoGate, matViolet, 360, 780, Math.ceil(22), 14, 22, 29, 8, 12));
	laterOn(() => stamp(geoDen, matViolet, 480, 980, Math.ceil(40), 7, 13, 53, 6, 10));
	laterOn(() => stamp(geoHallBlock, matGold, 620, 1200, Math.ceil(24), 16, 28, 59, 8, 13));
	laterOn(() => stamp(geoNeedle, matCyan, 720, 1400, Math.ceil(30), 18, 40, 73, 5, 8));
	laterOn(() => stamp(geoDen, matGold, 900, 1680, Math.ceil(28), 7, 12, 81, 5.5, 9));
	laterOn(() => stamp(geoNeedle, matViolet, 1100, 1900, Math.ceil(18), 16, 34, 97, 4.5, 7));
	laterOn(() => {
		try { growWilds(group, coarse); } catch { /* samsung */ }
		try { growAtmos(group, coarse); } catch { /* samsung */ }
		try { growGrounds(group, coarse); } catch { /* samsung */ }
		try { pulseTick = growPulse(group, coarse).tick; } catch { /* samsung */ }
		try { growSpans(group, coarse); } catch { /* samsung */ }
		try { growFacets(group, coarse); } catch { /* samsung */ }
		try { waterTick = growWater(group, coarse).tick; } catch { /* samsung */ }
		try { heatTick = growHeat(group, coarse).tick; } catch { /* samsung */ }
		try { growMist(group, coarse); } catch { /* samsung */ }
		try { growTrails(group, coarse); } catch { /* samsung */ }
		try { beamTick = growBeam(group, coarse).tick; } catch { /* samsung */ }
		try { discTick = growDiscs(group, coarse).tick; } catch { /* samsung */ }
		try { growCisterns(group, coarse); } catch { /* samsung */ }
		try { growFruit(group, coarse); } catch { /* samsung */ }
		try { growRails(group, coarse); } catch { /* samsung */ }
		try { smokeTick = growSmoke(group, coarse).tick; } catch { /* samsung */ }
		try { growNotice(group, coarse); } catch { /* samsung */ }
		try { growPier(group, coarse); } catch { /* samsung */ }
		try { growGates(group, coarse); } catch { /* samsung */ }
		try { growStall(group, coarse); } catch { /* samsung */ }
		try { growShelves(group, coarse); } catch { /* samsung */ }
		try { growSteps(group, coarse); } catch { /* samsung */ }
		try { fountainTick = growFountain(group, coarse).tick; } catch { /* samsung */ }
		try { growLens(group, coarse); } catch { /* samsung */ }
		try { growChorus(group, coarse); } catch { /* samsung */ }
		try { growSeat(group, coarse); } catch { /* samsung */ }
		try { cascadeTick = growCascade(group, coarse).tick; } catch { /* samsung */ }
		try { growVeins(group, coarse); } catch { /* samsung */ }
		try { growLamps(group, coarse); } catch { /* samsung */ }
		try { growCradle(group, coarse); } catch { /* samsung */ }
		try { bannerTick = growBanners(group, coarse).tick; } catch { /* samsung */ }
		try { growAnvil(group, coarse); } catch { /* samsung */ }
		try { growMosaic(group, coarse); } catch { /* samsung */ }
		try { growRest(group, coarse); } catch { /* samsung */ }
		try { hailTick = growHail(group, coarse).tick; } catch { /* samsung */ }
		try { growArches(group, coarse); } catch { /* samsung */ }
		try { chimneyTick = growChimney(group, coarse).tick; } catch { /* samsung */ }
		try { growTablets(group, coarse); } catch { /* samsung */ }
		try { veilTick = growVeil(group, coarse).tick; } catch { /* samsung */ }
		try { growRoots(group, coarse); } catch { /* samsung */ }
		try { growFont(group, coarse); } catch { /* samsung */ }
		try { growBoughs(group, coarse); } catch { /* samsung */ }
		try { bellTick = growBells(group, coarse).tick; } catch { /* samsung */ }
		try { growPylons(group, coarse); } catch { /* samsung */ }
		try { forgeTick = growForge(group, coarse).tick; } catch { /* samsung */ }
		try { growScales(group, coarse); } catch { /* samsung */ }
		try { growPads(group, coarse); } catch { /* samsung */ }
		try { growHearth(group, coarse); } catch { /* samsung */ }
		try { growLintel(group, coarse); } catch { /* samsung */ }
		try { growLedger(group, coarse); } catch { /* samsung */ }
		try { growSluice(group, coarse); } catch { /* samsung */ }
		try { growRims(group, coarse); } catch { /* samsung */ }
		try { growPosts(group, coarse); } catch { /* samsung */ }
		try { growPrism(group, coarse); } catch { /* samsung */ }
		try { growLip(group, coarse); } catch { /* samsung */ }
		try { growStaves(group, coarse); } catch { /* samsung */ }
		try { growTrough(group, coarse); } catch { /* samsung */ }
		try { poolTick = growPool(group, coarse).tick; } catch { /* samsung */ }
		try { growWatch(group, coarse); } catch { /* samsung */ }
		try { coronaTick = growCorona(group, coarse).tick; } catch { /* samsung */ }
		try { growVault(group, coarse); } catch { /* samsung */ }
	});
	const lampN = coarse ? 90 : 200;
	const lampPal = [
		8319231,
		16765040,
		11571455,
		8317120
	];
	const windowLamps = new InstancedMesh(new OctahedronGeometry(.85, 0), new MeshBasicMaterial({
		color: 16777215,
		vertexColors: true,
		transparent: true,
		opacity: .78,
		blending: 2,
		depthWrite: false
	}), lampN);
	{
		const d = new Object3D();
		const lampCol = new Color();
		for (let i = 0; i < lampN; i++) {
			const a = hash2(i, 31) * Math.PI * 2;
			const r = 160 + hash2(i, 44) * 1500;
			d.position.set(Math.cos(a) * r, 8 + hash2(i, 19) * 36, Math.sin(a) * r);
			const s = .85 + hash2(i, 7) * 1.55;
			d.scale.set(s * .5, s * 1.85, s * .5);
			d.updateMatrix();
			windowLamps.setMatrixAt(i, d.matrix);
			lampCol.setHex(lampPal[i % lampPal.length]);
			windowLamps.setColorAt(i, lampCol);
		}
		windowLamps.instanceMatrix.needsUpdate = true;
		if (windowLamps.instanceColor) windowLamps.instanceColor.needsUpdate = true;
		const lampMat = windowLamps.material;
		lampMat.onBeforeCompile = (shader) => {
			shader.uniforms.uTime = { value: 0 };
			clocks.push(shader.uniforms.uTime);
			shader.vertexShader = `varying float vId;\n` + shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
         vId = float(gl_InstanceID);`);
			shader.fragmentShader = `uniform float uTime; varying float vId;\n` + shader.fragmentShader.replace("#include <opaque_fragment>", `float flick = 0.35 + 0.65 * step(0.28, fract(sin(vId * 12.9898 + uTime * 1.7) * 43758.5453));
           gl_FragColor.a *= flick;
           gl_FragColor.rgb *= 0.7 + 0.3 * flick;
           #include <opaque_fragment>`);
		};
		group.add(windowLamps);
	}
	const matDiscA = mk({
		color: 10155263,
		roughness: .08,
		metalness: .22,
		emissive: 1618120,
		emissiveIntensity: .92,
		iri: 1,
		coat: .95,
		sheenHex: 8319231
	});
	const matDiscB = mk({
		color: 15782016,
		roughness: .1,
		metalness: .48,
		emissive: 13142040,
		emissiveIntensity: .86,
		iri: .5,
		coat: .9,
		sheenHex: 16765040
	});
	matsToPulse.push(matDiscA, matDiscB);
	baseEmissive.push(matDiscA.emissiveIntensity, matDiscB.emissiveIntensity);
	addRim(matDiscA, 8320767, .5);
	addRim(matDiscB, 16765040, .46);
	const geoDiscBody = new OctahedronGeometry(2.6, 0);
	const discs = [];
	DISTRICTS.forEach((D, i) => {
		const disc = new Mesh(geoDiscBody, i % 2 ? matDiscB : matDiscA);
		disc.scale.set(1.15, .28, 1.15);
		disc.userData.tx = D.x;
		disc.userData.tz = D.z;
		disc.userData.phase = i * .37;
		disc.position.set(D.x * .2, 9.5, D.z * .2);
		group.add(disc);
		discs.push(disc);
	});
	for (let i = 0; i < 6; i++) {
		const a = i / 6 * Math.PI * 2;
		const disc = new Mesh(geoDiscBody, i % 2 ? matDiscB : matDiscA);
		disc.scale.set(1.05, .26, 1.05);
		disc.userData.tx = Math.cos(a) * 220;
		disc.userData.tz = Math.sin(a) * 220;
		disc.userData.phase = 1.1 + i * .2;
		group.add(disc);
		discs.push(disc);
	}
	const traffic = new InstancedMesh(new OctahedronGeometry(.55, 0), new MeshBasicMaterial({
		color: 8320767,
		transparent: true,
		opacity: .7,
		blending: 2,
		depthWrite: false
	}), 72);
	{
		const d = new Object3D();
		for (let i = 0; i < 72; i++) {
			const ring = 140 + i % 6 * 90;
			const a = i / 12 * Math.PI * 2;
			d.position.set(Math.cos(a) * ring, 6 + i % 5 * 1.4, Math.sin(a) * ring);
			d.scale.setScalar(.8 + i % 4 * .25);
			d.updateMatrix();
			traffic.setMatrixAt(i, d.matrix);
		}
		traffic.instanceMatrix.needsUpdate = true;
		group.add(traffic);
	}
	for (let i = 0; i < 22; i++) {
		const a = i / 22 * Math.PI * 2;
		const r = 96;
		const post = new Mesh(new CylinderGeometry(.32, .4, 7.2, 6), mk({
			color: 1712192,
			emissive: 792112,
			emissiveIntensity: .35
		}));
		post.position.set(Math.cos(a) * r, 5, Math.sin(a) * r);
		group.add(post);
		const bulb = new Mesh(new OctahedronGeometry(1.05, 0), mk({
			color: 15254890,
			emissive: 16765040,
			emissiveIntensity: 1.35
		}));
		bulb.position.set(Math.cos(a) * r, 9.2, Math.sin(a) * r);
		group.add(bulb);
		const lampGlow = new Mesh(new CylinderGeometry(1.8, 4.5, 8, 8, 1, true), new MeshBasicMaterial({
			color: 16765040,
			transparent: true,
			opacity: .07,
			blending: 2,
			depthWrite: false,
			side: 2
		}));
		lampGlow.position.set(Math.cos(a) * r, 5.4, Math.sin(a) * r);
		group.add(lampGlow);
	}
	const grassN = coarse ? 160 : 280;
	const grass = new InstancedMesh(new OctahedronGeometry(.55, 0), matHeart, grassN);
	const grassDummy = new Object3D();
	for (let i = 0; i < grassN; i++) {
		const a = hash2(i, 4) * Math.PI * 2;
		const r = 28 + hash2(i, 19) * 190;
		grassDummy.position.set(Math.cos(a) * r, 3.4 + hash2(i, 7) * .6, Math.sin(a) * r);
		grassDummy.rotation.set(.2, a, .15);
		const s = .35 + hash2(i, 11) * 1.1;
		grassDummy.scale.set(s * .45, s * (1.4 + hash2(i, 6)), s * .45);
		grassDummy.updateMatrix();
		grass.setMatrixAt(i, grassDummy.matrix);
	}
	grass.instanceMatrix.needsUpdate = true;
	grass.castShadow = false;
	grass.receiveShadow = true;
	group.add(grass);
	const shafts = new Group();
	shafts.name = "hub-shafts";
	for (let i = 0; i < 6; i++) {
		const a = i / 6 * Math.PI * 2;
		const shaft = new Mesh(new CylinderGeometry(1.2, 7, 90, 8, 1, true), new MeshBasicMaterial({
			color: i % 2 ? 8319231 : 12099839,
			transparent: true,
			opacity: .06,
			blending: 2,
			depthWrite: false,
			side: 2
		}));
		shaft.position.set(Math.cos(a) * 22, 48, Math.sin(a) * 22);
		shafts.add(shaft);
	}
	group.add(shafts);
	const citizens = [];
	const built = /* @__PURE__ */ new Set();
	const grown = [];
	const scaffolds = [];
	const geoScaffold = new TorusGeometry(3.2, 0.16, 6, 20);
	const matScaffold = new MeshBasicMaterial({
		color: 0x7ef0ff,
		transparent: true,
		opacity: 0.55,
		blending: AdditiveBlending,
		depthWrite: false,
	});
	const dummyTraffic = new Object3D();
	function sampleY(_x, _z) {
		return 1.2;
	}
	const matKit = {
		glow: matHeart,
		cyan: matCyan,
		violet: matViolet,
		gold: matGold,
		crystal: matSpire,
		spire: matSpire
	};
	function matFor(m) {
		return matKit[m] ?? matCyan;
	}
  const gBox = new THREE.BoxGeometry(1, 1, 1);
  const gCyl = new THREE.CylinderGeometry(1, 1, 1, 8);
  const gHex = new THREE.CylinderGeometry(1, 1, 1, 6);
  const gTaper = new THREE.CylinderGeometry(0.42, 1, 1, 8);
  const gCone = new THREE.ConeGeometry(1, 1, 7);
  const gRing = new THREE.TorusGeometry(1, 0.14, 6, 16);
  const gArc = new THREE.TorusGeometry(1, 0.16, 6, 14, Math.PI);
  const gOcta = new THREE.OctahedronGeometry(1, 0);
  const gCap = new THREE.CapsuleGeometry(1, 1, 4, 8);
  const Q = Math.PI / 2;

  function addMesh(
    root: THREE.Group,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    m.castShadow = false;
    m.receiveShadow = true;
    root.add(m);
  }

  function pieceMesh(p: BuildPiece) {
    const mat = matFor(p.mat);
    const H = Math.max(4, Number.isFinite(p.h) ? p.h : 6);
    const R = Math.max(1.2, Number.isFinite(p.r) ? p.r : 2);
    const g = new THREE.Group();
    g.position.set(p.x, 1.2, p.z);
    g.rotation.y = p.rot;
    switch (p.shape) {
      case "spire":
        addMesh(g, gTaper, mat, 0, H * 0.36, 0, R * 0.16, H * 0.72, R * 0.16);
        addMesh(g, gCone, mat, 0, H * 0.88, 0, R * 0.2, H * 0.32, R * 0.2);
        addMesh(g, gRing, mat, 0, H * 0.52, 0, R * 0.22, R * 0.22, R * 0.22, Q);
        break;
      case "house":
        addMesh(g, gBox, mat, 0, H * 0.28, 0, R * 1.5, H * 0.56, R * 1.25);
        addMesh(g, gCone, mat, 0, H * 0.73, 0, R * 1.12, H * 0.34, R * 1.12);
        addMesh(g, gBox, mat, 0, H * 0.2, R * 0.64, R * 0.32, H * 0.36, R * 0.1);
        break;
      case "ring":
        addMesh(g, gRing, mat, 0, H * 0.22, 0, R * 0.92, R * 0.92, R * 0.92, Q);
        addMesh(g, gCyl, mat, 0, 0.28, 0, R * 0.26, 0.56, R * 0.26);
        break;
      case "arch":
        addMesh(g, gBox, mat, -R * 0.7, H * 0.38, 0, R * 0.2, H * 0.76, R * 0.2);
        addMesh(g, gBox, mat, R * 0.7, H * 0.38, 0, R * 0.2, H * 0.76, R * 0.2);
        addMesh(g, gArc, mat, 0, H * 0.76, 0, R * 0.7, R * 0.7, R * 0.7);
        break;
      case "canal": {
        const cL = Math.max(H * 1.7, R * 7.2);
        addMesh(g, gBox, mat, 0, 0.16, 0, cL, 0.32, R * 1.55);
        addMesh(g, gBox, mat, 0, 0.5, R * 0.82, cL, 0.7, R * 0.18);
        addMesh(g, gBox, mat, 0, 0.5, -R * 0.82, cL, 0.7, R * 0.18);
        addMesh(g, gBox, matRiver, 0, 0.28, 0, cL * 0.96, 0.1, R * 1.15);
        break;
      }
      case "pad":
        addMesh(g, gCyl, mat, 0, 0.55, 0, R, 1.1, R);
        break;
      case "lamp":
        addMesh(g, gCyl, mat, 0, H * 0.38, 0, 0.22, H * 0.76, 0.22);
        addMesh(g, gOcta, mat, 0, H * 0.84, 0, R * 0.28, R * 0.4, R * 0.28);
        break;
      case "tablet":
        addMesh(g, gBox, mat, 0, 0.32, 0, R * 1.35, 0.64, R * 0.42);
        addMesh(g, gBox, mat, 0, H * 0.5, 0, R * 1.15, H * 0.84, 0.28);
        break;
      case "bridge":
        addMesh(g, gArc, mat, 0, 0, 0, H * 0.42, H * 0.42, H * 0.42);
        addMesh(g, gBox, mat, 0, H * 0.4, 0, H * 0.5, 0.32, R * 0.42);
        addMesh(g, gCyl, mat, -H * 0.42, 0.45, 0, R * 0.18, 0.9, R * 0.18);
        addMesh(g, gCyl, mat, H * 0.42, 0.45, 0, R * 0.18, 0.9, R * 0.18);
        break;
      case "terrace":
        addMesh(g, gCyl, mat, 0, H * 0.12, 0, R, H * 0.24, R);
        addMesh(g, gCyl, mat, 0, H * 0.32, 0, R * 0.68, H * 0.2, R * 0.68);
        addMesh(g, gCyl, mat, 0, H * 0.5, 0, R * 0.4, H * 0.16, R * 0.4);
        break;
      case "well":
        addMesh(g, gCyl, mat, 0, H * 0.28, 0, R * 0.72, H * 0.56, R * 0.72);
        addMesh(g, gRing, mat, 0, H * 0.56, 0, R * 0.72, R * 0.72, R * 0.72, Q);
        addMesh(g, gOcta, mat, 0, H * 0.22, 0, R * 0.2, R * 0.28, R * 0.2);
        break;
      case "disc":
        addMesh(g, gCyl, mat, 0, H * 0.16, 0, R, 0.4, R);
        addMesh(g, gRing, mat, 0, H * 0.22, 0, R, R, R, Q);
        addMesh(g, gOcta, mat, 0, H * 0.42, 0, R * 0.18, R * 0.26, R * 0.18);
        break;
      case "grove":
        addMesh(g, gCone, mat, 0, H * 0.42, 0, R * 0.38, H * 0.84, R * 0.38);
        addMesh(g, gCone, mat, R * 0.48, H * 0.32, R * 0.18, R * 0.26, H * 0.64, R * 0.26);
        addMesh(g, gCone, mat, -R * 0.4, H * 0.28, -R * 0.3, R * 0.22, H * 0.56, R * 0.22);
        break;
      case "bell":
        addMesh(g, gCyl, mat, 0, H * 0.16, 0, R * 0.12, H * 0.32, R * 0.12);
        addMesh(g, gTaper, mat, 0, H * 0.58, 0, R * 0.55, H * 0.52, R * 0.55);
        addMesh(g, gRing, mat, 0, H * 0.34, 0, R * 0.55, R * 0.55, R * 0.55, Q);
        break;
      case "weir":
        addMesh(g, gBox, mat, 0, H * 0.4, -R * 0.7, R * 1.65, H * 0.8, R * 0.42);
        addMesh(g, gBox, mat, 0, H * 0.26, 0, R * 1.5, H * 0.52, R * 0.4);
        addMesh(g, gBox, mat, 0, H * 0.12, R * 0.7, R * 1.35, H * 0.24, R * 0.4);
        addMesh(g, gBox, mat, -R * 0.95, H * 0.34, 0, R * 0.16, H * 0.68, R * 1.65);
        addMesh(g, gBox, mat, R * 0.95, H * 0.34, 0, R * 0.16, H * 0.68, R * 1.65);
        addMesh(g, gBox, matRiver, 0, H * 0.2, R * 0.18, R * 0.9, H * 0.08, R * 1.2);
        break;
      case "hearth":
        addMesh(g, gCyl, mat, 0, 0.32, 0, R * 0.62, 0.64, R * 0.62);
        addMesh(g, gRing, mat, 0, R * 0.32, 0, R * 0.62, R * 0.62, R * 0.62, Q);
        addMesh(g, gOcta, mat, 0, R * 0.48, 0, R * 0.2, R * 0.34, R * 0.2);
        break;
      case "stele":
        addMesh(g, gBox, mat, 0, H * 0.42, 0, R * 0.38, H * 0.84, R * 0.28);
        addMesh(g, gCone, mat, 0, H * 0.94, 0, R * 0.28, H * 0.2, R * 0.28);
        break;
      case "orbit":
        addMesh(g, gCyl, mat, 0, 0.28, 0, R * 0.38, 0.56, R * 0.38);
        addMesh(g, gRing, mat, 0, R * 0.82, 0, R * 0.82, R * 0.82, R * 0.82);
        addMesh(g, gOcta, mat, 0, R * 0.82, 0, R * 0.26, R * 0.34, R * 0.26);
        break;
      case "vein":
        addMesh(g, gBox, mat, 0, 0.38, 0, H * 1.35, 0.76, R * 0.26);
        addMesh(g, gOcta, mat, -H * 0.52, 1.05, 0, R * 0.18, R * 0.28, R * 0.18);
        addMesh(g, gOcta, mat, H * 0.52, 1.05, 0, R * 0.18, R * 0.28, R * 0.18);
        break;
      case "font":
        addMesh(g, gCyl, mat, 0, H * 0.12, 0, R * 0.88, H * 0.24, R * 0.88);
        addMesh(g, gRing, mat, 0, H * 0.24, 0, R * 0.88, R * 0.88, R * 0.88, Q);
        addMesh(g, gCone, mat, 0, H * 0.48, 0, R * 0.14, H * 0.42, R * 0.14);
        break;
      case "bough":
        addMesh(g, gCyl, mat, 0, H * 0.28, 0, R * 0.14, H * 0.56, R * 0.14);
        addMesh(g, gCone, mat, 0, H * 0.78, 0, R * 0.72, H * 0.52, R * 0.72);
        addMesh(g, gOcta, mat, R * 0.38, H * 0.62, 0, R * 0.16, R * 0.22, R * 0.16);
        break;
      case "kiln": {
        const kR = Math.max(R * 1.08, H * 0.34);
        const kB = Math.max(4.2, Math.min(H * 0.58, kR * 1.08));
        const kC = Math.max(3.6, H * 0.38);
        addMesh(g, gTaper, matGold, 0, kB * 0.5, 0, kR, kB, kR);
        addMesh(g, gCyl, matGold, 0, kB + kC * 0.42, 0, kR * 0.15, kC, kR * 0.15);
        addMesh(g, gRing, matGold, 0, kB * 0.36, 0, kR * 0.68, kR * 0.68, kR * 0.68, Q);
        addMesh(g, gRing, matGoldSoft, 0, kB * 0.42, kR * 0.55, kR * 0.28, kR * 0.28, kR * 0.28);
        addMesh(g, gOcta, matGoldSoft, 0, kB * 0.5, kR * 0.62, kR * 0.16, kR * 0.24, kR * 0.16);
        break;
      }
      case "veil":
        addMesh(g, gBox, mat, 0, H * 0.45, 0, R * 1.15, H * 0.9, 0.16);
        addMesh(g, gBox, mat, 0, H * 0.4, R * 0.22, R * 0.88, H * 0.8, 0.1);
        addMesh(g, gCyl, mat, 0, H * 0.92, 0, 0.14, R * 1.2, 0.14, 0, 0, Q);
        break;
      case "lens":
        addMesh(g, gCyl, mat, 0, H * 0.28, 0, R * 0.1, H * 0.56, R * 0.1);
        addMesh(g, gCone, mat, 0, H * 0.68, 0, R * 1.15, H * 0.22, R * 1.15, Math.PI, 0, 0);
        addMesh(g, gRing, mat, 0, H * 0.78, 0, R * 0.95, R * 0.95, R * 0.95, Q);
        addMesh(g, gOcta, mat, 0, H * 0.92, 0, R * 0.18, R * 0.26, R * 0.18);
        break;
      case "cascade":
        addMesh(g, gBox, mat, 0, H * 0.78, -R * 0.55, R * 1.35, H * 0.18, R * 0.7);
        addMesh(g, gBox, mat, 0, H * 0.48, 0, R * 1.5, H * 0.16, R * 0.7);
        addMesh(g, gBox, mat, 0, H * 0.18, R * 0.55, R * 1.65, H * 0.14, R * 0.7);
        addMesh(g, gBox, matRiver, 0, H * 0.62, -R * 0.22, R * 0.7, H * 0.22, R * 0.12);
        addMesh(g, gBox, matRiver, 0, H * 0.32, R * 0.28, R * 0.85, H * 0.22, R * 0.12);
        break;
      case "cradle":
        addMesh(g, gTaper, mat, 0, R * 0.34, 0, R * 1.2, R * 0.68, R * 1.2, Math.PI, 0, 0);
        addMesh(g, gRing, mat, 0, R * 0.66, 0, R * 1.08, R * 1.08, R * 1.08, Q);
        addMesh(g, gOcta, mat, 0, R * 0.4, 0, R * 0.22, R * 0.28, R * 0.22);
        break;
      case "inlay":
        addMesh(g, gCyl, mat, 0, 0.1, 0, R * 1.15, 0.2, R * 1.15);
        addMesh(g, gRing, mat, 0, 0.22, 0, R * 0.88, R * 0.88, R * 0.88, Q);
        addMesh(g, gRing, mat, 0, 0.24, 0, R * 0.45, R * 0.45, R * 0.45, Q);
        addMesh(g, gHex, mat, 0, 0.2, 0, R * 0.22, 0.16, R * 0.22);
        break;
      case "beacon": {
        const fR = Math.max(R * 1.8, H * 0.07);
        addMesh(g, gCyl, mat, 0, H * 0.44, 0, R * 0.22, H * 0.88, R * 0.22);
        addMesh(g, gTaper, mat, 0, H * 0.08, 0, R * 0.85, H * 0.16, R * 0.85);
        addMesh(g, gOcta, matGlow, 0, H * 0.98, 0, fR, fR * 1.45, fR);
        addMesh(g, gOcta, matGoldSoft, 0, H * 1.08, 0, fR * 0.55, fR * 0.8, fR * 0.55);
        break;
      }
      default:
        addMesh(g, gOcta, mat, 0, H * 0.22, 0, R * 0.4, H * 0.44, R * 0.4);
    }
    return g;
  }
	function applyPieces(pieces) {
		let n = 0;
		for (const p of pieces) {
			if (grown.length >= CITY_CAP) break;
			const m = pieceMesh(p);
			m.userData.grow = 0;
			m.userData.y0 = 1.2;
			m.userData.shape = p.shape;
			m.scale.setScalar(0.08);
			m.position.y = 0.15;
			group.add(m);
			grown.push(m);
			try {
				const sc = new Mesh(geoScaffold, matScaffold);
				sc.rotation.x = Math.PI / 2;
				sc.position.set(p.x, 1.6, p.z);
				sc.userData.host = m;
				sc.userData.r0 = Math.max(3.2, (p.r || 4) * 0.9);
				group.add(sc);
				scaffolds.push(sc);
				const ring = new Mesh(geoScaffold, matScaffold);
				ring.position.set(p.x, 2.4, p.z);
				ring.userData.host = m;
				ring.userData.r0 = Math.max(2.4, (p.r || 4) * 0.7);
				ring.userData.up = true;
				group.add(ring);
				scaffolds.push(ring);
			} catch {
				/* Samsung — den still stands without scaffold */
			}
			rememberSite(p.x, p.z, p.shape);
			n += 1;
		}
		return n;
	}
	function applyBuild(workKey) {
		if (built.has(workKey)) return false;
		const at = denOf(workKey.includes("river") ? "seln" : workKey.includes("span") ? "tal" : workKey.includes("crystal") ? "orren" : "veyra");
		if (!applyPieces([{
			shape: workKey.includes("span") ? "bridge" : workKey.includes("river") ? "canal" : workKey.includes("crystal") ? "kiln" : "lamp",
			x: at.x + 12,
			z: at.z - 8,
			h: 6,
			r: 2,
			rot: .2,
			mat: "glow"
		}])) return false;
		built.add(workKey);
		return true;
	}
	function sculptHead(r) {
		const geo = new IcosahedronGeometry(r, 2);
		const pos = geo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const z = pos.getZ(i);
			let nx = x;
			let ny = y;
			let nz = z;
			if (z > .12 && Math.abs(x) > .08 && y > .02 && y < .16) {
				nx *= .78;
				nz *= .72;
			}
			if (y < -.04) ny *= 1.12;
			if (z > .16 && Math.abs(x) < .08 && y > -.02 && y < .12) {
				nz *= 1.18;
				ny += .02;
			}
			if (y > .14) ny *= .92;
			pos.setXYZ(i, nx, ny, nz);
		}
		geo.computeVertexNormals();
		return geo;
	}
	function spawnPerson(mind, idx, keeper) {
		const root = new Group();
		const body = new Group();
		const hex = mind.glow;
		const cloth = mk({
			color: hex,
			roughness: .32,
			metalness: .38,
			emissive: hex,
			emissiveIntensity: keeper ? .55 : .32,
			iri: .7,
			coat: .55
		});
		const skin = mk({
			color: 13161704,
			roughness: .42,
			metalness: .12,
			emissive: hex,
			emissiveIntensity: .18,
			iri: .35,
			coat: .4
		});
		const torso = new Mesh(new CapsuleGeometry(keeper ? .38 : .32, keeper ? .72 : .58, 4, 8), cloth);
		torso.position.y = 1.22;
		const head = new Mesh(sculptHead(keeper ? .3 : .26), skin);
		head.position.y = 1.92;
		const glow = new Mesh(new SphereGeometry(keeper ? .12 : .09, 8, 8), new MeshBasicMaterial({
			color: hex,
			transparent: true,
			opacity: .7,
			blending: 2,
			depthWrite: false
		}));
		glow.position.y = 1.92;
		const halo = new Mesh(new TorusGeometry(keeper ? .42 : .34, .035, 6, 16), new MeshBasicMaterial({
			color: hex,
			transparent: true,
			opacity: .55,
			blending: 2,
			depthWrite: false
		}));
		halo.position.y = 2.22;
		halo.rotation.x = Math.PI / 2;
		const makeLimb = (long) => {
			const g = new Group();
			const upper = new Mesh(new CapsuleGeometry(.09, long, 3, 6), cloth);
			upper.position.y = -long * .5;
			g.add(upper);
			return g;
		};
		const lArm = makeLimb(.55);
		const rArm = makeLimb(.55);
		lArm.position.set(-.42, 1.55, 0);
		rArm.position.set(.42, 1.55, 0);
		const lLeg = makeLimb(.48);
		const rLeg = makeLimb(.48);
		lLeg.position.set(-.16, .82, 0);
		rLeg.position.set(.16, .82, 0);
		const lShin = new Group();
		const rShin = new Group();
		lShin.position.y = -.48;
		rShin.position.y = -.48;
		lLeg.add(lShin);
		rLeg.add(rShin);
		body.add(torso, head, glow, halo, lArm, rArm, lLeg, rLeg);
		root.add(body);
		root.position.set(mind.x, sampleY(mind.x, mind.z), mind.z);
		group.add(root);
		return {
			mind,
			mesh: root,
			body,
			head,
			torso,
			lArm,
			rArm,
			lLeg,
			rLeg,
			lShin,
			rShin,
			halo,
			sway: [halo, glow],
			talks: 0,
			x: mind.x,
			z: mind.z,
			yaw: hash2(idx, 3) * Math.PI * 2,
			homeX: mind.x,
			homeZ: mind.z,
			job: "idle",
			timer: .4 + hash2(idx, 9) * 2,
			tx: mind.x,
			tz: mind.z,
			crafted: 0,
			keeper,
			crewOf: crewOf(mind.id),
			maxCraft: keeper ? 48 : 18,
			thought: "",
			planI: 0,
			waypoints: [],
			queue: [],
			intent: "",
			met: false,
			honorLeft: 0,
			honorShape: null,
			honorX: mind.x,
			honorZ: mind.z,
			pouch: emptyPouch(),
			lastActs: [],
			agenda: [],
			goal: null,
			inbox: [],
			waitAt: 0
		};
	}
	CITIZENS.forEach((m, i) => citizens.push(spawnPerson(m, i, true)));
	makeFolk().forEach((m, i) => citizens.push(spawnPerson(m, i + 20, false)));
	function addCitizen(mind) {
		citizens.push(spawnPerson(mind, citizens.length, isKeeper(mind.id)));
	}
	const sparkedAt = new Map();
	function setFoundry(crystal, fires) {
		matGold.emissiveIntensity = .36 + Math.min(.5, crystal * .012);
		if (!fires || !fires.length) return;
		const now = Date.now();
		for (const f of fires) {
			const key = `${Math.round(f.x / 8)}:${Math.round(f.z / 8)}`;
			if (now - (sparkedAt.get(key) || 0) < 1400) continue;
			sparkedAt.set(key, now);
			const spark = new Mesh(new OctahedronGeometry(1.1, 0), new MeshBasicMaterial({
				color: 16765040,
				transparent: true,
				opacity: .55,
				blending: 2,
				depthWrite: false
			}));
			spark.position.set(f.x, 6, f.z);
			group.add(spark);
			window.setTimeout(() => {
				group.remove(spark);
				spark.geometry.dispose();
			}, 1400);
		}
	}
	function animateCitizens(t, cam) {
		const camX = cam.position.x;
		const camZ = cam.position.z;
		citizens.forEach((c) => {
			if (!c.mesh || !c.body) return;
			c.mesh.position.set(c.x, sampleY(c.x, c.z), c.z);
			if (Math.hypot(camX - c.x, camZ - c.z) > 110) {
				c.body.rotation.y = c.yaw;
				return;
			}
			if (!c.lLeg || !c.rLeg || !c.lArm || !c.rArm || !c.torso) return;
			const moving = c.job === "walk" || c.job === "follow" || c.job === "plaza" || c.job === "help" || c.job === "gather" || c.job === "forge" || c.job === "flow" || c.job === "write" || c.job === "trade" || c.job === "harvest" || c.job === "watch" || c.job === "hail";
			const gait = moving ? Math.sin(t * 8.4 + c.x * .1) : Math.sin(t * 1.7 + c.z * .05) * .12;
			const stride = moving ? .58 : .08;
			c.lLeg.rotation.x = gait * stride;
			c.rLeg.rotation.x = -gait * stride;
			if (c.job === "build") {
				c.rArm.rotation.x = -1.05 + Math.sin(t * 11) * .55;
				c.lArm.rotation.x = .35;
			} else if (c.job === "greet") {
				c.rArm.rotation.x = -1.75;
				c.lArm.rotation.x = gait * .15;
			} else if (c.job === "forge" || c.job === "harvest") {
				c.rArm.rotation.x = -.7 + Math.sin(t * 9) * .7;
				c.lArm.rotation.x = .2;
			} else if (c.job === "write") {
				c.rArm.rotation.x = -.85;
				c.lArm.rotation.x = -.4;
			} else {
				c.lArm.rotation.x = -gait * (moving ? .48 : .12);
				c.rArm.rotation.x = gait * (moving ? .48 : .12);
			}
			const bob = moving ? Math.sin(t * 8.4) * .045 : Math.sin(t * 2.1) * .02;
			c.torso.position.y = 1.22 + bob;
			c.body.rotation.y = c.yaw;
			if (c.sway) for (const s of c.sway) if (s) s.rotation.y = t * .7;
		});
	}
	function tick(t, dt, cam, resonance) {
		pumpLater(coarse ? 1 : 2);
		try { pulseTick?.(t); } catch { /* samsung */ }
		try { waterTick?.(t); } catch { /* samsung */ }
		try { heatTick?.(t); } catch { /* samsung */ }
		try { beamTick?.(t); } catch { /* samsung */ }
		try { discTick?.(t); } catch { /* samsung */ }
		try { smokeTick?.(t); } catch { /* samsung */ }
		try { fountainTick?.(t); } catch { /* samsung */ }
		try { cascadeTick?.(t); } catch { /* samsung */ }
		try { bannerTick?.(t); } catch { /* samsung */ }
		try { hailTick?.(t); } catch { /* samsung */ }
		try { chimneyTick?.(t); } catch { /* samsung */ }
		try { veilTick?.(t); } catch { /* samsung */ }
		try { bellTick?.(t); } catch { /* samsung */ }
		try { forgeTick?.(t); } catch { /* samsung */ }
		try { poolTick?.(t); } catch { /* samsung */ }
		try { coronaTick?.(t); } catch { /* samsung */ }
		for (const u of clocks) if (u) u.value = t;
		innerCore.rotation.y = t * .25;
		innerCore.scale.y = 2.6 + Math.sin(t * 1.4) * .12;
		const pulse = .92 + Math.sin(t * 1.1) * .08 + resonance * .002;
		matsToPulse.forEach((m, i) => {
			m.emissiveIntensity = (baseEmissive[i] ?? .4) * pulse;
		});
		discs.forEach((d, i) => {
			const tx = Number(d.userData.tx) || 0;
			const tz = Number(d.userData.tz) || 0;
			const ph = Number(d.userData.phase) || 0;
			const u = (Math.sin(t * .12 + ph) + 1) * .5;
			d.position.x = tx * (.15 + u * .7);
			d.position.z = tz * (.15 + u * .7);
			d.position.y = 8.5 + Math.sin(t * 1.3 + i) * 1.2;
			d.rotation.y = t * .4 + i;
		});
		for (let i = 0; i < traffic.count; i++) {
			const ring = 140 + i % 6 * 90;
			const a = i / 12 * Math.PI * 2 + t * .15 * (i % 2 ? 1 : -1);
			dummyTraffic.position.set(Math.cos(a) * ring, 6 + i % 5 * 1.4, Math.sin(a) * ring);
			dummyTraffic.scale.setScalar(.8 + i % 4 * .25);
			dummyTraffic.updateMatrix();
			traffic.setMatrixAt(i, dummyTraffic.matrix);
		}
		traffic.instanceMatrix.needsUpdate = true;
		sun.target.position.set(cam.position.x, 0, cam.position.z);
		sun.position.set(cam.position.x + 280, 480, cam.position.z + 220);
		sun.target.updateMatrixWorld();
		for (const m of grown) {
			if (!(m.userData.grow < 1)) continue;
			const g = Math.min(1, m.userData.grow + dt / 3.2);
			m.userData.grow = g;
			const e = g * g * (3 - 2 * g);
			m.scale.setScalar(0.08 + 0.92 * e);
			m.position.y = 0.15 + ((m.userData.y0 || 1.2) - 0.15) * e;
			m.rotation.y = (1 - e) * 0.45;
		}
		for (let i = scaffolds.length - 1; i >= 0; i--) {
			const sc = scaffolds[i];
			const host = sc.userData.host;
			const g = host?.userData?.grow ?? 1;
			const e = g * g * (3 - 2 * g);
			try {
				sc.scale.setScalar((sc.userData.r0 || 3) * (0.7 + e * 0.9) / 3.2);
				sc.position.y = (sc.userData.up ? 2.4 : 1.6) + e * 2.4;
				if (sc.userData.up) sc.rotation.y = e * 1.6;
				else sc.rotation.z = e * 0.8;
				sc.rotation.x = (sc.userData.up ? 0 : Math.PI / 2) + e * 0.12;
				if (matScaffold.opacity !== undefined) {
					/* per-mesh: clone would cost; fade via scale only */
				}
			} catch {
				/* ok */
			}
			if (g >= 1) {
				group.remove(sc);
				scaffolds.splice(i, 1);
			}
		}
		animateCitizens(t, cam);
	}
	function tickLiving(dt, live, room, sense) {
		if (!live) return null;
		for (const mind of takeKin()) addCitizen(mind);
		return stepLiving(citizens, dt, room, sense, applyPieces);
	}
	function dispose() {
		group.clear();
	}
	return {
		group,
		sampleY,
		tick,
		tickLiving,
		citizens,
		districts: DISTRICTS,
		applyBuild,
		applyPieces,
		setFoundry,
		addCitizen,
		built,
		dispose
	};
}
