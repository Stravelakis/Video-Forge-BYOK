// ---------------------------------------------------------------------------
// A Kenney 3D character on a canvas: the engine behind the builder's cards.
//
// Every picture is a pure function of time. Springs are stepped once from time
// zero and remembered, so the live preview and every Remotion render worker
// draw the same pixels for the same frame, in any frame order.
//
// The tables and grip numbers match kenney-builder.html and the Blender scripts
// (kbody.py, kprops.py); faces/moods.json is the one source for the numbers.
// Relative imports only: Remotion's own webpack builds this too.
// 3D models by Kenney (kenney.nl), CC0.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { findMotion, type Library, type MotionSpan, type TagSpan } from "./motions";

export type KenneySet = "mini" | "animated" | "pets";
export interface KenneyCard {
  set: KenneySet;
  base: string;
  name?: string;
  colours?: Record<string, string>;
  face?: { mood?: string; blink?: number };
  motion?: string;
  /** Every motion this speaker's script asks for, so a render copies their files. */
  motionsUsed?: string[];
  move?: string;
  /** A sky that lights them (lights/index.json); none = the studio light. */
  light?: string;
  props?: { right?: string; left?: string; mouth?: string };
  skin?: string;
  credit?: string;
}
/** What the video tells a character at a moment. */
export interface KenneySignal { viseme: number; talking: boolean; mood: string }
export type Framing = "body" | "bust" | "face";

export const KENNEY_MOODS = ["open", "half", "closed", "worried", "happy", "angry", "surprised", "sad"];
const STEP = 1 / 60, D2R = Math.PI / 180;

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type Asset = (rel: string) => string;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---- shared loading: one download per file, however many speakers use it ----
const cache = new Map<string, Promise<unknown>>();
function once<T>(key: string, make: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as Promise<T>;
}
const loader = new GLTFLoader();
const json = (url: string) => once<Json>(url, async () => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Could not load ${url}: ${r.status}`);
  return r.json();
});
const glb = (url: string) => once<GLTF>(url, () => loader.loadAsync(url));
const tex = (url: string) => once<THREE.Texture>(url, async () => {
  const t = await new THREE.TextureLoader().loadAsync(url);
  t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
});
const image = (url: string) => once<HTMLImageElement>(url, () => new Promise((ok, no) => {
  const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => no(new Error(`Could not load ${url}`)); i.src = url;
}));

// ---- what each mood does to the body ----
type Channels = { head: number[]; chest: number[]; shrug: number; arm: number; fist: number; grip: { left: boolean; right: boolean } };
type BoneFn = (c: Channels) => number[];
const RIG: Record<string, Record<string, BoneFn>> = {
  animated: {
    Head: (c) => c.head.map((v) => v * .6), Neck: (c) => c.head.map((v) => v * .4),
    UpperChest: (c) => [c.chest[0] * .4, 0, c.chest[1] * .4], Chest: (c) => [c.chest[0] * .35, 0, c.chest[1] * .35], Spine: (c) => [c.chest[0] * .25, 0, c.chest[1] * .25],
    LeftShoulder: (c) => [0, 0, c.shrug], RightShoulder: (c) => [0, 0, -c.shrug], LeftArm: (c) => [0, 0, c.arm], RightArm: (c) => [0, 0, -c.arm],
  },
  mini: {
    head: (c) => c.head, torso: (c) => [c.chest[0] * .7, 0, c.chest[1] * .7],
    "arm-left": (c) => [0, 0, .5 * c.arm + .25 * c.shrug], "arm-right": (c) => [0, 0, -.5 * c.arm - .25 * c.shrug],
  },
};
(["Left", "Right"] as const).forEach((S, i) => ["Index1", "Index2", "Index3", "Thumb1", "Thumb2"].forEach((f) => {
  const sign = i ? -1 : 1, key = i ? "right" : "left", k = f.startsWith("Thumb") ? .5 : 1;
  RIG.animated[S + "Hand" + f] = (c) => [0, 0, -(c.grip[key as "left" | "right"] ? 1.25 : c.fist) * 40 * k * sign];
}));
const AX: Record<string, number[]> = { ear: [0, 0, 1, -1], antenna: [0, 0, 1, -1], wing: [0, 0, 1, -1], claw: [0, 0, 1, -1], tail: [0, 1, 0, 1], trunk: [1, 0, 0, 1] };

interface StepState {
  people?: Omit<Channels, "grip">; pet?: { pitch: number; roll: number; squash: number; bob: number };
  ears: Record<string, number>; loud: number;
}

export class KenneyActor {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.01, 200);
  private root: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private cards: { mesh: THREE.Mesh; role: string; count: number; mirror: boolean; tex: THREE.Texture }[] = [];
  private parts: { obj: THREE.Object3D; kind: string; side: number; q0: THREE.Quaternion; axis: THREE.Vector3; flip: number }[] = [];
  private rig: { bone: THREE.Object3D; fn: BoneFn; R: THREE.Quaternion; Ri: THREE.Quaternion; saved: THREE.Quaternion }[] = [];
  private held = { left: false, right: false };
  private base = new THREE.Vector3();
  private scale = 1;
  private moods: Json = null;
  private emotes: Json = null;
  private steps: StepState[] = [];
  private sim: Json = { spring: {}, env: 0, on: 0, ears: {} };
  private signalAt: (ms: number) => KenneySignal = () => ({ viseme: 0, talking: false, mood: "open" });
  private signalKey = "";
  private tmpE = new THREE.Euler(); private tmpD = new THREE.Quaternion(); private tmpA = new THREE.Quaternion(); private tmpQ = new THREE.Quaternion();
  private baseClip: string | null = null;
  private spans: MotionSpan[] = [];
  private actions = new Map<string, THREE.AnimationAction>();
  private autoProps: { obj: THREE.Object3D; slot: string; id: string }[] = [];
  private spanProps = new Map<MotionSpan, Record<string, string>>();
  private restW: Record<string, THREE.Matrix4> = {};

  constructor(private canvas: HTMLCanvasElement, private card: KenneyCard, private asset: Asset, private tags: TagSpan[] = []) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.toneMapping = THREE.AgXToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.setClearColor(0x000000, 0);
    this.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x6a5040, 1.3));
    const sun = new THREE.DirectionalLight(0xfff4ea, 2.2); sun.position.set(-3, 6, 5); this.scene.add(sun);
  }

  async load(): Promise<void> {
    const { card, asset: A } = this;
    const [man, moods, emotes] = await Promise.all([json(A("manifest.json")), json(A("faces/moods.json")), json(A("faces/emotes.json"))]);
    this.moods = moods; this.emotes = emotes;
    const item = man.sets[card.set].items.find((i: Json) => i.id === card.base);
    if (!item) throw new Error(`Unknown 3D character: ${card.set}/${card.base}`);
    const g = await glb(A(item.file));
    const root = SkeletonUtils.clone(g.scene); this.root = root;
    const pending: { o: THREE.Mesh; ud: Json }[] = [];
    let colormap: THREE.Texture | null = null;
    root.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh) return;
      m.frustumCulled = false;
      if (o.userData?.card) pending.push({ o: m, ud: o.userData });
      else if (!colormap) colormap = (m.material as THREE.MeshStandardMaterial).map ?? null;
    });
    for (const { o, ud } of pending) {
      const source = await tex(A("faces/" + (ud.card === "eyes" && item.eyesAtlas ? item.eyesAtlas : ud.atlas)));
      const t = source.clone(); t.needsUpdate = true;
      o.material = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      o.renderOrder = 2;
      this.cards.push({ mesh: o, role: ud.card, count: ud.count, mirror: !!ud.mirror, tex: t });
    }
    // skin or colour map, with the card's colour swaps
    const src: HTMLImageElement | ImageBitmap | null = card.set === "animated" ? await image(A(item.skin)) : ((colormap as THREE.Texture | null)?.image ?? null);
    if (src) {
      const skin = new THREE.CanvasTexture(recolour(src as HTMLImageElement, card.colours ?? {}));
      skin.colorSpace = THREE.SRGBColorSpace; skin.flipY = false;
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && !o.userData?.card && (m.material as THREE.MeshStandardMaterial).map) { m.material = (m.material as THREE.Material).clone(); (m.material as THREE.MeshStandardMaterial).map = skin; }
      });
    }
    // fit: every character 1.6 tall, feet on the ground
    const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    this.scale = 1.6 / Math.max(size.y, .001); root.scale.setScalar(this.scale);
    const box = new THREE.Box3().setFromObject(root);
    root.position.y -= box.min.y; root.position.x -= (box.min.x + box.max.x) / 2; root.position.z -= (box.min.z + box.max.z) / 2;
    this.base.copy(root.position); this.scene.add(root);
    this.mixer = new THREE.AnimationMixer(root);
    for (const clip of g.animations) { if (!item.anims?.length || item.anims.includes(clip.name)) this.actions.set(clip.name, this.mixer.clipAction(clip)); }
    if (card.light) await this.useLight(card.light);
    this.findParts(); await this.findRigAndProps();
    await this.prepareMotions();
  }

  private async useLight(id: string) {
    const hdr = await new RGBELoader().loadAsync(this.asset(`lights/${id}.hdr`));
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromEquirectangular(hdr).texture;
    pm.dispose(); hdr.dispose();
    this.scene.environmentIntensity = .9;
    this.scene.children.forEach((c) => { if ((c as THREE.Light).isLight) (c as THREE.Light).intensity *= .25; });
  }

  private async library(): Promise<Library> {
    if (this.card.set !== "animated") return {};
    try { return await json(this.asset("motions.json")); } catch { return {}; }
  }

  /** Loads the resting motion and everything the script asks for, before the first frame. */
  private async prepareMotions() {
    const lib = await this.library();
    const list: Json = this.tags.length ? await json(this.asset("props.json")) : null;
    await this.ensureClip(this.card.motion ?? "idle", lib);
    this.baseClip = this.actions.has(this.card.motion ?? "idle") ? (this.card.motion ?? "idle") : (this.actions.has("idle") ? "idle" : [...this.actions.keys()][0] ?? null);
    const own = [...this.actions.keys()];
    for (const t of this.tags) {
      const hit = findMotion(t.tag, this.card.set, own, lib); if (!hit) continue;
      await this.ensureClip(hit.clip, lib); if (!this.actions.has(hit.clip)) continue;
      const span: MotionSpan = { startMs: t.startMs, endMs: t.endMs, clip: hit.clip, text: hit.text };
      this.spans.push(span);
      const rule = list?.rules.find((r: Json) => new RegExp(r.match).test(hit.text));
      if (rule) { const p: Record<string, string> = {}; for (const s of ["right", "left"]) if (rule[s]) p[s] = rule[s]; this.spanProps.set(span, p); await this.attachAuto(p, list); }
    }
    this.spans.sort((a, b) => a.startMs - b.startMs);
    for (const a of this.actions.values()) { a.setLoop(THREE.LoopRepeat, Infinity); a.play(); a.paused = true; a.setEffectiveWeight(0); }
  }

  private async attachAuto(p: Record<string, string>, list: Json) {
    for (const [slot, id] of Object.entries(p)) {
      if ((this.card.props as Record<string, string> | undefined)?.[slot] || this.autoProps.some((a) => a.slot === slot && a.id === id)) continue;
      const item = list.items.find((x: Json) => x.id === id); if (!item) continue;
      const g = await glb(this.asset(item.file));
      const obj = g.scene.clone(true); obj.traverse((o) => { o.frustumCulled = false; });
      const g_ = gripWorld(item, slot as "left" | "right", this.card.set === "mini", this.restW);
      const parent = this.root!.getObjectByName(g_.boneName); if (!parent) continue;
      g_.M.premultiply(this.restW[g_.boneName].clone().invert()).decompose(obj.position, obj.quaternion, obj.scale);
      obj.visible = false; parent.add(obj); this.autoProps.push({ obj, slot, id });
    }
  }

  private async ensureClip(name: string, motions: Library) {
    if (this.actions.has(name) || this.card.set !== "animated") return;
    const cat = Object.keys(motions).find((k) => motions[k].some((m) => m.file === name)); if (!cat) return;
    const g = await glb(this.asset(`models/animated/lib-${cat}.glb`));
    const src = g.animations.find((a) => a.name === name); if (!src || !this.mixer) return;
    const clip = src.clone();
    const hip = clip.tracks.find((t) => t.name === "Hips.position");     // the speaker stays in their spot
    if (hip) for (let i = 0; i < hip.values.length; i += 3) { hip.values[i] = hip.values[0]; hip.values[i + 2] = hip.values[2]; }
    this.actions.set(name, this.mixer.clipAction(clip));
  }

  private findParts() {
    this.root!.traverse((o) => {
      const m = /^(ear|antenna|wing|claw|trunk|tail)/.exec(o.name); if (!m || (o as THREE.Bone).isBone) return;
      const k = m[1], right = /right/.test(o.name);
      const side = k === "claw" ? (right === /inner/.test(o.name) ? 1 : -1) : (right ? 1 : (/left/.test(o.name) ? -1 : 1));
      this.parts.push({ obj: o, kind: k, side, q0: o.quaternion.clone(), axis: V(AX[k][0], AX[k][1], AX[k][2]), flip: AX[k][3] });
    });
  }

  private async findRigAndProps() {
    const root = this.root!, set = this.card.set, table = RIG[set], restW = this.restW;
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!(o as THREE.Bone).isBone) return;
      restW[o.name] = o.matrixWorld.clone();
      if (table?.[o.name]) { const q = o.getWorldQuaternion(new THREE.Quaternion()); this.rig.push({ bone: o, fn: table[o.name], R: q, Ri: q.clone().invert(), saved: o.quaternion.clone() }); }
    });
    const slots = this.card.props ?? {};
    if (!Object.values(slots).some(Boolean)) return;
    const list: Json = await json(this.asset("props.json"));
    const byId = (id?: string) => list.items.find((p: Json) => p.id === id);
    for (const slot of ["right", "left", "mouth"] as const) {
      const p = byId(slots[slot]); if (!p) continue;
      const g = await glb(this.asset(p.file));
      const obj = g.scene.clone(true); obj.traverse((o) => { o.frustumCulled = false; });
      let parent: THREE.Object3D | undefined, m: THREE.Matrix4;
      if (slot === "mouth") {
        const mouth = this.cards.find((c) => c.role === "mouth")?.mesh; parent = root.getObjectByName("body");
        if (!mouth || !parent) continue;
        const at = new THREE.Vector3().setFromMatrixPosition(mouth.matrixWorld).add(V(0, 0, .02 * 1.6));
        const R = new THREE.Matrix4(); if (p.kind === "blade") R.makeBasis(V(0, 1, 0), V(1, 0, 0), V(0, 0, -1));
        m = new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromRotationMatrix(R), V(1, 1, 1).multiplyScalar((p.msize || .3) * 1.6 * .55));
        m.premultiply(parent.matrixWorld.clone().invert());
      } else {
        const g_ = gripWorld(p, slot, set === "mini", restW); parent = root.getObjectByName(g_.boneName); if (!parent) continue;
        m = g_.M.premultiply(restW[g_.boneName].clone().invert());
        if (p.kind !== "shield") this.held[slot] = true;
      }
      m.decompose(obj.position, obj.quaternion, obj.scale); parent.add(obj);
    }
  }

  /** The speaker's timeline. Changing `key` restarts the remembered springs. */
  setSignals(key: string, at: (ms: number) => KenneySignal) {
    this.signalAt = at;
    if (key !== this.signalKey) { this.signalKey = key; this.steps = []; this.sim = { spring: {}, env: 0, on: 0, ears: {} }; }
  }

  private sp(key: string, target: number) {
    const s = this.sim.spring[key] ?? (this.sim.spring[key] = [target, 0]);
    s[1] += ((target - s[0]) * 120 - s[1] * 13) * STEP; s[0] += s[1] * STEP; return s[0];
  }

  private stepTo(n: number) {
    const M = this.moods, sim = this.sim;
    for (let i = this.steps.length; i <= n; i++) {
      const t = i * STEP, sig = this.signalAt(t * 1000), mood = M.body[sig.mood] ? sig.mood : "open", w = 2 * Math.PI;
      const open = sig.talking ? (M.open[sig.viseme] ?? 0) : 0;
      sim.env += (open - sim.env) * (1 - Math.exp(-STEP * 10.3)); sim.on += ((sig.talking ? 1 : 0) - sim.on) * (1 - Math.exp(-STEP * 3.9));
      for (const k of Object.keys(this.emotes[mood])) { const c = sim.ears[k] ?? 0; sim.ears[k] = c + (this.emotes[mood][k][0] - c) * (1 - Math.exp(-STEP * 7.9)); }
      const state: StepState = { ears: { ...sim.ears }, loud: sig.talking && sig.viseme !== 0 ? 1 : 0 };
      if (this.card.set === "pets") {
        const T = M.pet[mood];
        state.pet = {
          pitch: this.sp("p", T.pitch) + 3 * sim.env,
          roll: this.sp("r", T.roll) + T.sway[0] * Math.sin(w * T.sway[1] * t) + T.tremble * 1.5 * Math.sin(t * 56.5),
          squash: this.sp("s", T.squash) + .012 * Math.sin(t * 3.14) + .035 * sim.env,
          bob: T.bob[0] * Math.abs(Math.sin(Math.PI * T.bob[1] * t)),
        };
      } else {
        const T = M.body[mood];
        const head = [0, 1, 2].map((k) => this.sp("h" + k, T.head[k])), chest = [0, 1].map((k) => this.sp("c" + k, T.chest[k]));
        const tr = T.tremble * (Math.sin(t * 56.5) + .5 * Math.sin(t * 81.7));
        head[0] += 3.5 * sim.env; head[1] += tr + 4 * Math.sin(t * 1.9) * Math.sin(t * 1.07) + 5 * sim.on * Math.sin(t * 5.7);
        head[2] += T.sway[0] * Math.sin(w * T.sway[1] * t) + 3 * sim.on * Math.sin(t * 3.96 + 1);
        chest[0] += T.breath[0] * Math.sin(w * T.breath[1] * t) + 1.2 * sim.env;
        state.people = { head, chest, shrug: this.sp("s", T.shrug) + .6 * tr, arm: this.sp("a", T.arm) + 2.5 * sim.env, fist: this.sp("f", T.fist) };
      }
      this.steps.push(state);
    }
  }

  /** Draw one moment. `lid` is 0 open, 1 half, 2 closed, or null to use the mood's eyes. */
  draw(timeMs: number, framing: Framing, lid: number | null, px: number, yaw = 0) {
    if (!this.root || !this.mixer) return;
    if (this.canvas.width !== px || this.canvas.height !== px) this.renderer.setSize(px, px, false);
    const t = Math.max(0, timeMs) / 1000, M = this.moods, root = this.root, sig = this.signalAt(timeMs);
    const mood = KENNEY_MOODS.includes(sig.mood) ? sig.mood : "open";
    this.stepTo(Math.floor(t / STEP));
    const now = this.steps[Math.floor(t / STEP)];

    for (const p of this.parts) p.obj.quaternion.copy(p.q0);
    for (const b of this.rig) b.bone.quaternion.copy(b.saved);
    const active = this.applyMotion(t);
    for (const b of this.rig) b.saved.copy(b.bone.quaternion);
    const grip = { ...this.held };
    for (const a of this.autoProps) {
      const on = !!active && this.spanProps.get(active)?.[a.slot] === a.id;
      a.obj.visible = on;
      if (on && this.spanProps.get(active!)) grip[a.slot as "left" | "right"] = true;
    }

    const mouth = sig.talking ? (sig.viseme === 0 ? (M.talkRest[mood] ?? 0) : sig.viseme) : (M.restMouth[mood] ?? 0);
    const eyes = lid ?? KENNEY_MOODS.indexOf(mood);
    for (const c of this.cards) setCell(c, c.role === "mouth" ? mouth : (lid === 0 ? KENNEY_MOODS.indexOf(mood) : eyes));

    const b = this.base; root.position.copy(b); root.rotation.order = "YXZ"; root.rotation.set(0, yaw, 0); root.scale.setScalar(this.scale);
    const move = this.card.move;
    if (move === "jump") { const p = (t % 1.6) / 1.6; root.position.y = b.y + Math.max(0, Math.sin(Math.min(1, p / .6) * Math.PI)) * .6; }
    if (move === "crab-walk") root.position.x = b.x + Math.sin(t * 1.4) * .4;
    if (move === "fly") { root.position.y = b.y + .3 + Math.sin(t * 2.2) * .12; root.position.x = b.x + Math.sin(t * .9) * .3; }
    if (move === "swim") { root.position.y = b.y + .2 + Math.sin(t * 3) * .06; root.position.x = b.x + Math.sin(t * 1.1) * .3; root.rotation.y = -.6 * Math.cos(t * 1.1); }

    if (now.pet) {
      root.rotation.x += now.pet.pitch * D2R; root.rotation.z += now.pet.roll * D2R; root.position.y += now.pet.bob * 1.6;
      const xz = 1 / Math.sqrt(now.pet.squash), s = this.scale; root.scale.set(s * xz, s * now.pet.squash, s * xz);
    }
    for (const r of this.rig) {
      const [a, y, z] = r.fn({ ...now.people!, grip });
      this.tmpE.set(a * D2R, y * D2R, z * D2R, "XYZ"); this.tmpD.setFromEuler(this.tmpE);
      this.tmpA.copy(r.Ri).multiply(this.tmpD).multiply(r.R); r.bone.quaternion.multiply(this.tmpA);
    }
    for (const p of this.parts) {
      const [, amp, hz] = this.emotes[mood][p.kind];
      let a = (now.ears[p.kind] + (amp + 5 * now.loud) * Math.sin(2 * Math.PI * hz * t)) * D2R;
      if (move === "fly" && p.kind === "wing") a += Math.floor(t * 30) % 2 ? .6 : -.26;
      if (move === "swim" && p.kind === "wing") a += Math.sin(t * 9) * .4;
      if ((move === "claw-snap" || move === "crab-walk") && p.kind === "claw") a += Math.max(0, Math.sin(t * 7)) * .33;
      p.obj.quaternion.multiply(this.tmpQ.setFromAxisAngle(p.axis, a * (p.kind === "tail" ? 1 : p.side) * p.flip));
    }

    // camera: same shot whatever the pose, so the character never drifts in frame
    const pets = this.card.set === "pets";
    const y = framing === "face" ? 1.6 * (pets ? .58 : .78) : framing === "bust" ? 1.6 * (pets ? .55 : .68) : .84;
    const shot = framing === "face" ? (pets ? 1.2 : .72) : framing === "bust" ? (pets ? 1.5 : 1.0) : (pets ? 2.3 : 1.95);
    this.camera.position.set(0, y + .03, (shot / 2) / Math.tan(16 * D2R)); this.camera.lookAt(0, y, 0);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Sets every clip by hand for this exact moment (a render draws frames in any order, so
   * three.js's own clock-driven crossFade can't be used; this is the same maths, per frame).
   * BLENDED (Ak, 11 Nov 2026): each motion eases in and out (smoothstep) and keeps fading out
   * after it ends, so a move flows straight into the next one instead of dipping back to rest.
   * The resting motion fills whatever weight is left. Returns the strongest script motion.
   */
  private applyMotion(t: number): MotionSpan | null {
    const FADE = .3, ms = t * 1000;
    const ease = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
    const weights = new Map<string, { w: number; span: MotionSpan }>();
    let top: MotionSpan | null = null, topW = 0;
    for (const s of this.spans) {
      if (ms < s.startMs || ms >= s.endMs + FADE * 1000) continue;
      const w = Math.min(ease((ms - s.startMs) / 1000 / FADE), ease((s.endMs + FADE * 1000 - ms) / 1000 / FADE));
      if (w <= 0) continue;
      const had = weights.get(s.clip);
      if (!had || w > had.w) weights.set(s.clip, { w, span: s });
      if (w > topW && ms < s.endMs) { topW = w; top = s; }
    }
    let total = 0; for (const v of weights.values()) total += v.w;
    const scale = total > 1 ? 1 / total : 1;
    for (const [name, a] of this.actions) {
      const len = a.getClip().duration || 1;
      const hit = weights.get(name);
      if (hit) { a.time = ((t - hit.span.startMs / 1000) % len + len) % len; a.setEffectiveWeight(hit.w * scale + (name === this.baseClip ? Math.max(0, 1 - total) : 0)); }
      else if (name === this.baseClip) { a.time = t % len; a.setEffectiveWeight(Math.max(0, 1 - total)); }
      else a.setEffectiveWeight(0);
    }
    this.mixer!.update(0);
    return top;
  }

  dispose() { this.renderer.dispose(); this.root = null; this.mixer = null; }
}

function setCell(c: { count: number; mirror: boolean; tex: THREE.Texture }, idx: number) {
  const n = c.count;
  if (c.mirror) { c.tex.repeat.set(-1 / n, 1); c.tex.offset.set((idx + 1) / n, 0); }
  else { c.tex.repeat.set(1 / n, 1); c.tex.offset.set(idx / n, 0); }
}

function recolour(img: HTMLImageElement, colours: Record<string, string>) {
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!; ctx.drawImage(img, 0, 0);
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const swaps = Object.entries(colours).map(([f, t]) => [rgb(f), rgb(t)]);
  if (!swaps.length) return c;
  const data = ctx.getImageData(0, 0, c.width, c.height), d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    for (const [f, t] of swaps) {
      if (Math.abs(d[i] - f[0]) + Math.abs(d[i + 1] - f[1]) + Math.abs(d[i + 2] - f[2]) < 70) {
        for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, t[k] * (d[i + k] + 8) / (f[k] + 8)));
        break;
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

function gripWorld(p: Json, side: "left" | "right", mini: boolean, restW: Record<string, THREE.Matrix4>) {
  const L = side === "left", H = 1.6, k = p.kind;
  const d = V(L ? 1 : -1, 0, 0), t = mini ? V(0, 1, 0) : V(0, 0, 1), n = mini ? (k === "shield" ? d.clone().negate() : V(0, 0, 1)) : V(0, -1, 0);
  let x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3;
  if (k === "blade" || k === "item" || (mini && k === "phone")) { x = d.clone(); y = t.clone(); z = x.clone().cross(y); }
  else if (k === "phone") { y = d.clone(); z = n.clone(); x = y.clone().cross(z); }
  else { y = t.clone(); z = n.clone().negate(); x = y.clone().cross(z); }
  let off: number[] = ({ blade: [.034, .012], item: [.036, .014 + p.size * .4], phone: [.045, .02], shield: [0, -.03] } as Record<string, number[]>)[k];
  if (mini) off = [k === "shield" ? .36 : .34, 0];
  const S = L ? "Left" : "Right", boneName = mini ? "arm-" + side : (k === "shield" ? S + "ForeArm" : S + "Hand");
  const at = new THREE.Vector3().setFromMatrixPosition(restW[boneName]);
  if (k === "shield" && !mini) at.lerp(new THREE.Vector3().setFromMatrixPosition(restW[S + "Hand"]), .5);
  at.addScaledVector(d, off[0] * H).addScaledVector(n, off[1] * H);
  const R = new THREE.Matrix4().makeBasis(x, y, z);
  return { boneName, M: new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromRotationMatrix(R), V(1, 1, 1).multiplyScalar(p.size * H)) };
}
