// ---------------------------------------------------------------------------
// A room spec (src/lib/rooms/room.ts) drawn live in 3D with Kenney's furniture
// kit (CC0, kenney.nl). Lays the pieces out on the floor plan, recolours them,
// lights the room, and can hand back a picture plus where every seat is on
// screen, so characters can be sat on the chairs.
// ---------------------------------------------------------------------------

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PIECES, type RoomSpec } from "../../lib/rooms/room";
import { kenneyAsset } from "../canvas/KenneyLive";

export interface RoomSeat { x: number; y: number; h: number; face: "camera" | "left" | "right" }
export interface RoomHandle { snapshot: (width: number, height: number) => { picture: string; seats: RoomSeat[] } | null }

const F = 4.6;                  // Kenney furniture scale
const W = 12, BACK = -4.2;      // room width; back wall position
const ROW_Z = [BACK, -0.9, 1.7];
const PERSON = 7.9;             // a standing person, in the same units
const LIGHTS = {
  day: { sky: 0xdfefff, ground: 0x8a7a66, sun: 0xfff4e0, sunI: 2.2, amb: 0.55 },
  warm: { sky: 0xffe2c0, ground: 0x6b4a2e, sun: 0xffc48a, sunI: 2.0, amb: 0.5 },
  cool: { sky: 0xd6e6ff, ground: 0x4a5566, sun: 0xe6f0ff, sunI: 2.0, amb: 0.5 },
  evening: { sky: 0x6a6fa8, ground: 0x2a2236, sun: 0xffb070, sunI: 1.4, amb: 0.35 },
};

const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Group>>();
const load = (model: string) => {
  if (!cache.has(model)) cache.set(model, loader.loadAsync(kenneyAsset(`rooms/furniture/${model}.glb`)).then((g) => g.scene));
  return cache.get(model)!.then((s) => s.clone(true));
};

function tint(obj: THREE.Object3D, hex?: string) {
  if (!hex) return;
  const c = new THREE.Color(hex);
  obj.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!m || !("color" in m)) return;
    const k = m.clone(); k.color = m.color.clone().lerp(c, 0.75); (o as THREE.Mesh).material = k;
  });
}

interface Built { scene: THREE.Scene; seats: { p: THREE.Vector3; face: RoomSeat["face"]; person: number }[] }

/** Half the width the camera sees at depth z (a little margin), so nothing lands outside the picture. */
function visibleHalf(z: number, aspect: number) {
  const cam = camera(aspect);
  return (cam.position.z - z) * Math.tan(((cam.fov / 2) * Math.PI) / 180) * aspect * 0.92;
}

async function build(room: RoomSpec, aspect: number): Promise<Built> {
  const scene = new THREE.Scene();
  const L = LIGHTS[room.light];
  scene.background = new THREE.Color(room.wall);
  scene.add(new THREE.HemisphereLight(L.sky, L.ground, 0.9));
  scene.add(new THREE.AmbientLight(0xffffff, L.amb * 0.7));
  const sun = new THREE.DirectionalLight(L.sun, L.sunI * 1.15); sun.position.set(-5, 11, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 }); sun.shadow.radius = 4; sun.shadow.bias = -0.0005; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(6, 5, 6); scene.add(fill);
  const mat = (hex: string, rough = 0.9) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 6, 22), mat(room.floor, 0.8)); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 4); floor.receiveShadow = true; scene.add(floor);
  const wallM = mat(room.wall);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W + 6, 14), wallM); back.position.set(0, 7, BACK - 0.6); back.receiveShadow = true; scene.add(back);
  const side = (x: number, ry: number) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), wallM); s.position.set(x, 7, BACK + 6.4); s.rotation.y = ry; scene.add(s); };
  if (room.walls !== "back") side(-W / 2 - 0.4, Math.PI / 2);
  if (room.walls === "box") side(W / 2 + 0.4, -Math.PI / 2);
  // skirting board along the back wall
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(W + 6, 0.35, 0.12), mat(new THREE.Color(room.wall).multiplyScalar(0.8).getHexString().replace(/^/, "#"))); skirt.position.set(0, 0.17, BACK - 0.55); scene.add(skirt);

  // place every floor piece by row, keep them from overlapping, then the "on top" pieces
  const placed: { obj: THREE.Object3D; box: THREE.Box3 }[] = [];
  const objs = await Promise.all(room.pieces.map((p) => load(p.model).catch(() => null)));
  const rows: Record<number, { i: number; obj: THREE.Object3D; w: number; x: number }[]> = { 0: [], 1: [], 2: [] };
  room.pieces.forEach((p, i) => {
    const obj = objs[i]; if (!obj || (PIECES[p.model]?.on && p.on !== undefined)) return;
    obj.scale.setScalar(F); obj.rotation.y = (p.turn * Math.PI) / 180; tint(obj, p.color);
    obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const b = new THREE.Box3().setFromObject(obj); const w = b.max.x - b.min.x;
    rows[p.row].push({ i, obj, w, x: p.x * (W / 2 - w / 2 - 0.3) });
  });
  for (const r of [0, 1, 2]) {
    const list = rows[r].sort((a, b) => a.x - b.x);
    for (let k = 1; k < list.length; k++) { const a = list[k - 1], b = list[k]; const min = a.x + a.w / 2 + b.w / 2 + 0.15; if (b.x < min) b.x = min; }
    const over = list.length ? list[list.length - 1].x + list[list.length - 1].w / 2 - (W / 2 - 0.2) : 0;
    if (over > 0) list.forEach((it) => (it.x -= over));
    // squeeze the row into what the camera sees at its depth (narrower in a tall video)
    const zRow = r === 0 ? BACK + 0.6 : ROW_Z[r];
    const half = Math.min(W / 2 - 0.2, visibleHalf(zRow, aspect));
    if (list.length) {
      const left = list[0].x - list[0].w / 2, right = list[list.length - 1].x + list[list.length - 1].w / 2;
      const span = right - left, k = span > 2 * half ? (2 * half) / span : 1;
      const mid = (left + right) / 2;
      const newMid = span * k >= 2 * half ? 0 : Math.max(-half + (span * k) / 2, Math.min(half - (span * k) / 2, mid));
      list.forEach((it) => (it.x = (it.x - mid) * k + newMid));
    }
    for (const it of list) {
      const b0 = new THREE.Box3().setFromObject(it.obj);
      const depth = b0.max.z - b0.min.z;
      it.obj.position.set(it.x - (b0.min.x + b0.max.x) / 2, -b0.min.y, (r === 0 ? BACK + depth / 2 : ROW_Z[r]) - (b0.min.z + b0.max.z) / 2);
      scene.add(it.obj);
      placed[it.i] = { obj: it.obj, box: new THREE.Box3().setFromObject(it.obj) };
    }
  }
  room.pieces.forEach((p, i) => {
    const obj = objs[i]; if (!obj || !(PIECES[p.model]?.on && p.on !== undefined)) return;
    const base = placed[p.on]; if (!base) return;
    obj.scale.setScalar(F); obj.rotation.y = (p.turn * Math.PI) / 180; tint(obj, p.color);
    const b0 = new THREE.Box3().setFromObject(obj);
    const cx = (base.box.min.x + base.box.max.x) / 2, cz = (base.box.min.z + base.box.max.z) / 2;
    obj.position.set(cx - (b0.min.x + b0.max.x) / 2, base.box.max.y - b0.min.y, cz - (b0.min.z + b0.max.z) / 2);
    scene.add(obj);
  });
  // seats: the middle of the seat of every chair, stool, bench and sofa (two on a sofa or bench)
  const seats: Built["seats"] = [];
  room.pieces.forEach((p, i) => {
    if (!PIECES[p.model]?.seat || !placed[i]) return;
    const b = placed[i].box, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, h = b.max.y - b.min.y;
    const seatY = b.min.y + h * (/stool/i.test(p.model) ? 0.92 : /lounge|Sofa/i.test(p.model) ? 0.42 : 0.47);
    const face: RoomSeat["face"] = p.turn === 90 ? "right" : p.turn === 270 ? "left" : "camera";
    const two = /Sofa|bench/i.test(p.model) && b.max.x - b.min.x > 2.6;
    // a person is about 3.8 seat-heights tall (a 45 cm seat, a 1.70 m person): sized from the chair itself
    const person = Math.min(PERSON, Math.max(3.2, (/stool/i.test(p.model) ? seatY * 0.62 : seatY) * 3.8));
    for (const dx of two ? [-0.24, 0.24] : [0]) seats.push({ p: new THREE.Vector3(cx + dx * (b.max.x - b.min.x), seatY, cz), face, person });
  });
  return { scene, seats };
}

function camera(aspect: number) {
  // wide: the whole back wall; tall: step back so the width still fits
  const cam = new THREE.PerspectiveCamera(aspect >= 1 ? 40 : 52, aspect, 0.1, 200);
  const z = aspect >= 1 ? 11.2 : 14.5;
  cam.position.set(0, 4.6, z); cam.lookAt(0, 2.9, -0.8);
  return cam;
}

export const RoomView = forwardRef<RoomHandle, { room: RoomSpec; width: number; height: number; onSeats?: (n: number) => void }>(function RoomView({ room, width, height, onSeats }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const built = useRef<Built | null>(null);
  const r = useRef<THREE.WebGLRenderer | null>(null);
  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    r.current = renderer; host.current?.appendChild(renderer.domElement);
    return () => { renderer.dispose(); renderer.domElement.remove(); r.current = null; };
  }, []);
  useEffect(() => {
    let live = true;
    void build(room, width / height).then((b) => {
      if (!live || !r.current) return;
      built.current = b; onSeats?.(b.seats.length);
      r.current.setSize(width, height); r.current.render(b.scene, camera(width / height));
    });
    return () => { live = false; };
  }, [room, width, height]); // eslint-disable-line react-hooks/exhaustive-deps
  useImperativeHandle(ref, () => ({
    snapshot(w, h) {
      const b = built.current, rr = r.current; if (!b || !rr) return null;
      const cam = camera(w / h);
      rr.setPixelRatio(1); rr.setSize(w, h); rr.render(b.scene, cam);
      const picture = rr.domElement.toDataURL("image/jpeg", 0.92);
      const seats = b.seats.map((s) => {
        const a = s.p.clone().project(cam), top = s.p.clone().add(new THREE.Vector3(0, s.person, 0)).project(cam);
        return { x: (a.x + 1) / 2, y: (1 - a.y) / 2, h: Math.abs(top.y - a.y) / 2, face: s.face };
      }).filter((s) => s.x > 0.05 && s.x < 0.95 && s.y > 0.1 && s.y < 0.98); // only seats inside the picture
      rr.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); rr.setSize(width, height); rr.render(b.scene, camera(width / height));
      return { picture, seats };
    },
  }), [width, height]);
  return <div ref={host} className="room-view" style={{ width, height }} data-tip="Your room, drawn live in 3D with Kenney's furniture." />;
});
