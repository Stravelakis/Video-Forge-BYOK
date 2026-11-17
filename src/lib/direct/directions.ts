// ---------------------------------------------------------------------------
// Stage directions: what the Direct step adds on top of the script.
//
// A direction is a tag on a line plus WHEN in the line it happens ("@40%").
// They are kept apart from the script (useProjectStore.directions, keyed by
// line) so changing one never re-makes a voice, and are merged into the
// narration's tags for the preview and the render with withDirections().
//
// On top of the existing move tags this file adds what a script couldn't say:
//   walks to <left | centre | right | their place | Name>
//   faces <camera | left | right | Name>
//   camera <wide | medium on Name | close on Name | push in | pull out>
//   feels <mood>
// Every function is pure: same lines, same frame, same picture, in the preview
// and on every render worker. Relative imports only: the render bundles this.
// ---------------------------------------------------------------------------

/** ai: suggested by AI directing (shown dashed, removable in one go). */
export interface DirItem { tag: string; at: number; ai?: boolean }
export interface LineDirections { text: string; items: DirItem[] }
export type Directions = Record<string, LineDirections>;

interface Seg { speakerId: string; text: string; startMs: number; endMs: number; tags?: string[]; mood?: string }
export interface Placed { id: string; label: string; x: number; y: number; size: number }

const AT = /\s*@(\d{1,3})%\s*$/;
/** "walks to centre @40%" -> { tag: "walks to centre", at: 0.4 } */
export function splitTag(tag: string): { tag: string; at: number } {
  const m = tag.match(AT);
  return m ? { tag: tag.replace(AT, "").trim(), at: Math.min(1, Number(m[1]) / 100) } : { tag: tag.trim(), at: 0 };
}
/** When in its line a tag starts. */
export const tagStart = (seg: { startMs: number; endMs: number }, at: number) => seg.startMs + at * Math.max(0, seg.endMs - seg.startMs);

/** The narration's lines with the Direct step's directions added as tags. A line whose text changed keeps none. */
export function withDirections<S extends Seg>(segs: S[], d: Directions | undefined): S[] {
  if (!d || !Object.keys(d).length) return segs;
  return segs.map((s, i) => {
    const l = d[String(i)];
    if (!l || (l.text !== s.text && l.text !== "*") || !l.items.length) return s;
    const mood = l.items.map((x) => /^feels\s+(.+)$/i.exec(x.tag)?.[1]).filter(Boolean).pop();
    const tags = l.items.filter((x) => !/^feels\s/i.test(x.tag)).map((x) => (x.at > 0 ? `${x.tag} @${Math.round(x.at * 100)}%` : x.tag));
    return { ...s, tags: [...(s.tags ?? []), ...tags], ...(mood ? { mood } : {}) };
  });
}

// ---- reading the new kinds of tag ----
export const MARKS: Record<string, number> = { left: .18, "far left": .1, centre: .5, center: .5, middle: .5, right: .82, "far right": .9 };
const clean = (s: string) => s.toLowerCase().replace(/^the\s+/, "").replace(/[.!]+$/, "").trim();
function who(text: string, cast: Placed[]) { const t = clean(text); return cast.find((c) => t.startsWith(c.label.toLowerCase())); }

export type Direction =
  | { kind: "go"; mark?: number; home?: true; target?: string }
  | { kind: "face"; to: "camera" | "left" | "right"; target?: string }
  | { kind: "camera"; shot: "wide" | "medium" | "close" | "push" | "pull"; target?: string };

export function readDirection(raw: string, cast: Placed[]): Direction | null {
  const t = clean(splitTag(raw).tag);
  let m = /^(?:walks|goes|moves|runs|steps|comes)\s+(?:back\s+)?(?:over\s+)?to\s+(.+)$/.exec(t);
  if (m) {
    const place = clean(m[1]);
    if (/^(their|his|her|my)\s+(place|spot)$|^place$|^home$/.test(place)) return { kind: "go", home: true };
    if (MARKS[place] !== undefined) return { kind: "go", mark: MARKS[place] };
    const c = who(place, cast);
    return c ? { kind: "go", target: c.id } : null;
  }
  m = /^(?:faces|turns to|looks at|turns)\s+(.+)$/.exec(t);
  if (m) {
    const p = clean(m[1]);
    if (/^(camera|us|front|the viewer)$/.test(p)) return { kind: "face", to: "camera" };
    if (p === "left" || p === "right") return { kind: "face", to: p };
    const c = who(p, cast);
    return c ? { kind: "face", to: "camera", target: c.id } : null;
  }
  m = /^camera\s+(.+)$/.exec(t);
  if (m) {
    const p = clean(m[1]);
    if (/^wide/.test(p)) return { kind: "camera", shot: "wide" };
    if (/^push/.test(p)) return { kind: "camera", shot: "push" };
    if (/^pull/.test(p)) return { kind: "camera", shot: "pull" };
    const shot = /^close/.test(p) ? "close" : "medium";
    const on = p.replace(/^(close-?up|close|medium|on)\s*(on\s+)?/, "");
    const c = who(on, cast);
    return { kind: "camera", shot, target: c?.id };
  }
  return null;
}

// ---- the staging built from every line ----
interface GoSpan { startMs: number; endMs: number; from: number; to: number }
interface FaceEvent { t: number; to: "camera" | "left" | "right"; target?: string }
interface CamEvent { t: number; end: number; shot: "wide" | "medium" | "close" | "push" | "pull"; target?: string; speaker: string }

export interface Staging {
  /** Shift from home, in frame widths, and which way they walk (0 = standing). */
  go(id: string, t: number): { dx: number; walking: -1 | 0 | 1 };
  /** Which way they face, when a direction says so (null = their usual setting). */
  facing(id: string, t: number): "camera" | "left" | "right" | null;
  /** A turn for a 3D character, in radians, eased. */
  yaw(id: string, t: number): number;
  /** The camera: zoom and the point it centres on, in frame fractions. */
  camera(t: number): { z: number; cx: number; cy: number };
  /** Spans when each speaker walks somewhere (for the walking legs). */
  walks: Record<string, { startMs: number; endMs: number }[]>;
  empty: boolean;
}

const smooth = (u: number) => { const x = Math.max(0, Math.min(1, u)); return x * x * (3 - 2 * x); };
const WALK_SPEED = .3;   // frame widths per second
const TURN_MS = 350, CAM_MS = 700;

export function buildStaging(segs: Seg[], cast: Placed[]): Staging {
  const goRaw: Record<string, { t: number; d: Extract<Direction, { kind: "go" }> }[]> = {};
  const faces: Record<string, FaceEvent[]> = {};
  const cams: CamEvent[] = [];
  for (const s of segs) {
    for (const raw of s.tags ?? []) {
      const d = readDirection(raw, cast); if (!d) continue;
      const t = tagStart(s, splitTag(raw).at);
      if (d.kind === "go") (goRaw[s.speakerId] ??= []).push({ t, d });
      else if (d.kind === "face") (faces[s.speakerId] ??= []).push({ t, to: d.to, target: d.target });
      else cams.push({ t, end: s.endMs, shot: d.shot, target: d.target, speaker: s.speakerId });
    }
  }
  const home = (id: string) => cast.find((c) => c.id === id);
  // walks, in time order per speaker; a walk towards someone ends beside where they are then
  const go: Record<string, GoSpan[]> = {};
  const offsetAt = (id: string, t: number, depth = 0): number => {
    let cur = 0;
    for (const g of go[id] ?? []) { if (t < g.startMs) return cur; if (t < g.endMs) return g.from + (g.to - g.from) * smooth((t - g.startMs) / (g.endMs - g.startMs)); cur = g.to; }
    return depth > 2 ? cur : cur;
  };
  const order = Object.entries(goRaw).flatMap(([id, list]) => list.map((x) => ({ id, ...x }))).sort((a, b) => a.t - b.t);
  for (const { id, t, d } of order) {
    const me = home(id); if (!me) continue;
    const from = offsetAt(id, t);
    let to = 0;
    if (d.mark !== undefined) to = d.mark - me.x;
    else if (d.target) {
      const p = home(d.target); if (!p) continue;
      const px = p.x + offsetAt(d.target, t, 1), mx = me.x + from;
      to = px - Math.sign(px - mx || 1) * (me.size + p.size) * .32 - me.x;
    }
    const ms = Math.max(700, Math.min(4500, (Math.abs(to - from) / WALK_SPEED) * 1000));
    const list = (go[id] ??= []);
    const last = list[list.length - 1];
    const start = last && t < last.endMs ? last.endMs : t;
    list.push({ startMs: start, endMs: start + ms, from, to });
  }
  const posX = (id: string, t: number) => (home(id)?.x ?? .5) + offsetAt(id, t);
  const resolve = (id: string, e: FaceEvent, t: number): "camera" | "left" | "right" => (e.target ? (posX(e.target, t) < posX(id, t) ? "left" : "right") : e.to);
  const facing = (id: string, t: number) => {
    for (const g of go[id] ?? []) if (t >= g.startMs && t < g.endMs && g.to !== g.from) return g.to > g.from ? "right" : "left";
    let f: FaceEvent | null = null;
    for (const e of faces[id] ?? []) if (e.t <= t) f = e;
    return f ? resolve(id, f, t) : null;
  };
  const ANG = { camera: 0, left: -.8, right: .8 } as const;
  const yaw = (id: string, t: number) => {
    const now = facing(id, t) ?? "camera";
    const before = facing(id, t - TURN_MS) ?? "camera";
    if (now === before) return ANG[now];
    // ease from the earlier direction over the turn
    let changed = t - TURN_MS;
    for (let k = t - TURN_MS; k <= t; k += 25) if ((facing(id, k) ?? "camera") === now) { changed = k; break; }
    return ANG[before] + (ANG[now] - ANG[before]) * smooth((t - changed) / TURN_MS);
  };
  cams.sort((a, b) => a.t - b.t);
  const shotOf = (e: CamEvent, t: number, from: { z: number; cx: number; cy: number }) => {
    const sp = home(e.target ?? e.speaker);
    const at = sp ? { cx: posX(sp.id, t), cy: Math.max(.2, sp.y - sp.size * .12) } : { cx: .5, cy: .5 };
    if (e.shot === "wide") return { z: 1, cx: .5, cy: .5 };
    if (e.shot === "close") return { z: 2.1, ...at };
    if (e.shot === "medium") return { z: 1.45, ...at };
    const k = Math.max(0, Math.min(1, (t - e.t) / Math.max(1, e.end - e.t)));
    // push: creep in by a third; pull: ease all the way back to wide
    if (e.shot === "push") return { z: from.z + (Math.min(2.4, from.z * 1.35) - from.z) * smooth(k), cx: from.cx, cy: from.cy };
    const u = smooth(k);
    return { z: from.z + (1 - from.z) * u, cx: from.cx + (.5 - from.cx) * u, cy: from.cy + (.5 - from.cy) * u };
  };
  const camera = (t: number) => {
    let s = { z: 1, cx: .5, cy: .5 };
    for (const e of cams) {
      if (t < e.t) break;
      const before = s;
      const target = shotOf(e, t, before);
      const k = (e.shot === "push" || e.shot === "pull") ? 1 : smooth((t - e.t) / CAM_MS);
      s = { z: before.z + (target.z - before.z) * k, cx: before.cx + (target.cx - before.cx) * k, cy: before.cy + (target.cy - before.cy) * k };
      if (e.shot === "push" || e.shot === "pull") s = shotOf(e, Math.min(t, e.end), before);
    }
    return s;
  };
  const walks = Object.fromEntries(Object.entries(go).map(([id, l]) => [id, l.filter((g) => g.to !== g.from).map((g) => ({ startMs: g.startMs, endMs: g.endMs }))]));
  const empty = !order.length && !Object.keys(faces).length && !cams.length;
  return {
    go: (id, t) => {
      const dx = offsetAt(id, t);
      const g = (go[id] ?? []).find((x) => t >= x.startMs && t < x.endMs);
      return { dx, walking: g && g.to !== g.from ? (g.to > g.from ? 1 : -1) : 0 };
    },
    facing, yaw, camera, walks, empty,
  };
}

/** The CSS that moves the camera: zoom and pan, never showing past the frame's edge. */
export function cameraCss(c: { z: number; cx: number; cy: number }, W: number, H: number): string {
  if (Math.abs(c.z - 1) < 1e-3) return "none";
  const tx = Math.min(0, Math.max(W - c.z * W, W / 2 - c.z * c.cx * W));
  const ty = Math.min(0, Math.max(H - c.z * H, H / 2 - c.z * c.cy * H));
  return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${c.z.toFixed(4)})`;
}

/** Drawn characters get walking legs while a direction walks them somewhere. */
export function withWalkMoves<M extends { startMs: number; endMs: number; move: string; seed?: number }>(tracks: Record<string, M[]>, staging: Staging): Record<string, M[]> {
  if (staging.empty) return tracks;
  const out: Record<string, M[]> = { ...tracks };
  for (const [id, list] of Object.entries(staging.walks)) {
    if (!list.length) continue;
    out[id] = [...(out[id] ?? []), ...list.map((w, i) => ({ startMs: w.startMs, endMs: w.endMs, move: "ual-walk", seed: 900 + i } as unknown as M))].sort((a, b) => a.startMs - b.startMs);
  }
  return out;
}

/** Footsteps for a picture puppet while a direction walks it (it has no legs). */
export function walkBob(walking: number, timeMs: number, size: number): string {
  if (!walking) return "";
  const step = Math.abs(Math.sin((timeMs / 1000) * Math.PI * 2));
  return ` translateY(${(-step * size * .035).toFixed(2)}px) rotate(${((step - .5) * 3 * walking).toFixed(2)}deg)`;
}
