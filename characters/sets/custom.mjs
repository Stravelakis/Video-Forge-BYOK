// ---------------------------------------------------------------------------
// NEW SETS FROM A DESCRIPTION (Ak, 10 Nov 2026: "generate new set").
//
// An AI never writes code for the app. It writes a SET SPEC: plain data in a
// tiny drawing language (rectangles, ellipses, shapes, text, rows of repeats,
// gradients), with every position a fraction of the frame, plus the seats.
// setFromSpec() turns a checked spec into a set exactly like the built-in ones
// (back / front / seats), so the preview, the render and batch jobs all draw it
// the same way. Anything unknown in a spec is dropped, never run.
// ---------------------------------------------------------------------------

import { SETS } from "./sets.mjs";

const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i;
const KINDS = ["rect", "ellipse", "poly", "text", "line"];
const num = (v, lo = -0.5, hi = 1.5, d = 0) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
const col = (v, d = "#000000") => (typeof v === "string" && COLOR.test(v.trim()) ? v.trim() : d);

/** A fill: a colour, or { linear: [x0, y0, x1, y1], stops: [[0, colour], [1, colour]] } (fractions). */
function fill(v) {
  if (typeof v === "string") return col(v, null);
  if (v && Array.isArray(v.linear) && v.linear.length === 4 && Array.isArray(v.stops)) {
    const stops = v.stops.filter((s) => Array.isArray(s) && s.length === 2).slice(0, 8).map(([o, c]) => [num(o, 0, 1), col(c)]);
    return stops.length >= 2 ? { linear: v.linear.map((x) => num(x)), stops } : null;
  }
  return null;
}

function shape(s) {
  if (!s || !KINDS.includes(s.kind)) return null;
  const out = { kind: s.kind, fill: fill(s.fill), stroke: s.stroke ? col(s.stroke, null) : null, width: num(s.width, 0, 0.05, 0.003), alpha: num(s.alpha, 0, 1, 1) };
  if (s.kind === "rect" || s.kind === "ellipse") Object.assign(out, { x: num(s.x), y: num(s.y), w: num(s.w, 0, 2), h: num(s.h, 0, 2), r: num(s.r, 0, 0.5, 0) });
  if (s.kind === "poly" || s.kind === "line") {
    const pts = Array.isArray(s.points) ? s.points.filter((p) => Array.isArray(p) && p.length === 2).slice(0, 40).map(([x, y]) => [num(x), num(y)]) : [];
    if (pts.length < 2) return null;
    out.points = pts;
  }
  if (s.kind === "text") Object.assign(out, { x: num(s.x), y: num(s.y), text: String(s.text ?? "").slice(0, 40), size: num(s.size, 0.01, 0.3, 0.05), align: ["left", "center", "right"].includes(s.align) ? s.align : "center", fill: out.fill ?? "#ffffff" });
  // a row or grid of the same shape: repeat [count across, count down, step x, step y]
  if (Array.isArray(s.repeat) && s.repeat.length === 4) out.repeat = [Math.round(num(s.repeat[0], 1, 40, 1)), Math.round(num(s.repeat[1], 1, 20, 1)), num(s.repeat[2], -1, 1), num(s.repeat[3], -1, 1)];
  if (!out.fill && !out.stroke) return null;
  return out;
}

/** Checks a spec from an AI (or a person). Returns { spec, problems }: spec is null when it can't be used. */
export function checkSpec(raw) {
  const problems = [];
  let s = raw;
  if (typeof raw === "string") {
    try { s = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```\s*$/g, "")); } catch { return { spec: null, problems: ["That isn't valid JSON."] }; }
  }
  if (!s || typeof s !== "object") return { spec: null, problems: ["Empty answer."] };
  const list = (k) => (Array.isArray(s[k]) ? s[k] : []).slice(0, 160).map(shape).filter(Boolean);
  const back = list("back"), front = list("front");
  const room = s.room === true;
  if (!back.length && !room) problems.push("No background shapes.");
  const seats = (Array.isArray(s.seats) ? s.seats : []).slice(0, 12).map((t) => ({ x: num(t?.x, 0, 1, .5), y: num(t?.y, 0, 1.2, .85), h: num(t?.h, 0.1, 1.6, 1), face: ["camera", "left", "right"].includes(t?.face) ? t.face : "camera" }));
  if (!seats.length) problems.push("No seats for the characters.");
  const nice = (t) => { const x = String(t ?? "New set").replace(/[_-]+/g, " ").trim().slice(0, 40); return x.charAt(0).toUpperCase() + x.slice(1); };
  const spec = { label: nice(s.label), help: String(s.help ?? "").slice(0, 160), back, front, seats };
  if (room) Object.assign(spec, { room: true, sit: s.sit === true });
  return { spec: (back.length || room) && seats.length ? spec : null, problems };
}

function paint(ctx, W, H, f) {
  if (!f) return null;
  if (typeof f === "string") return f;
  const [x0, y0, x1, y1] = f.linear;
  const g = ctx.createLinearGradient(x0 * W, y0 * H, x1 * W, y1 * H);
  f.stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function draw(ctx, W, H, sh) {
  const [nx, ny, sx, sy] = sh.repeat ?? [1, 1, 0, 0];
  ctx.save();
  ctx.globalAlpha = sh.alpha;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const dx = i * sx * W, dy = j * sy * H;
    ctx.beginPath();
    if (sh.kind === "rect") { const r = sh.r * Math.min(sh.w * W, sh.h * H); ctx.roundRect ? ctx.roundRect(sh.x * W + dx, sh.y * H + dy, sh.w * W, sh.h * H, r) : ctx.rect(sh.x * W + dx, sh.y * H + dy, sh.w * W, sh.h * H); }
    if (sh.kind === "ellipse") ctx.ellipse(sh.x * W + dx + sh.w * W / 2, sh.y * H + dy + sh.h * H / 2, sh.w * W / 2, sh.h * H / 2, 0, 0, Math.PI * 2);
    if (sh.kind === "poly" || sh.kind === "line") { sh.points.forEach(([x, y], k) => (k ? ctx.lineTo(x * W + dx, y * H + dy) : ctx.moveTo(x * W + dx, y * H + dy))); if (sh.kind === "poly") ctx.closePath(); }
    if (sh.kind === "text") {
      ctx.fillStyle = paint(ctx, W, H, sh.fill); ctx.textAlign = sh.align; ctx.font = `800 ${Math.round(sh.size * H)}px Sora, sans-serif`;
      ctx.fillText(sh.text, sh.x * W + dx, sh.y * H + dy); continue;
    }
    if (sh.fill && sh.kind !== "line") { ctx.fillStyle = paint(ctx, W, H, sh.fill); ctx.fill(); }
    if (sh.stroke || sh.kind === "line") { ctx.strokeStyle = sh.stroke ?? paint(ctx, W, H, sh.fill); ctx.lineWidth = Math.max(1, sh.width * W); ctx.stroke(); }
  }
  ctx.restore();
}

/** A checked spec as a set, the same shape as the built-in ones. */
export function setFromSpec(spec) {
  return {
    label: spec.label, help: spec.help || "A set you made.", max: spec.seats.length, custom: true, sit: spec.sit === true,
    back(ctx, W, H) { spec.back.forEach((s) => draw(ctx, W, H, s)); },
    front(ctx, W, H) { spec.front.forEach((s) => draw(ctx, W, H, s)); },
    seats: (n, W, H) => spec.seats.slice(0, n).map((t) => ({ x: t.x * W, y: t.y * H, h: t.h * H, face: t.face })),
  };
}

/** The instructions an AI gets (also what "copy a prompt" hands to any other AI). */
export function setPrompt(description, seats = 2) {
  return `You design a background "set" for a talking-character video, drawn by simple code. Answer with JSON only, no comments.

The set: ${String(description).slice(0, 600)}
It seats ${seats} character${seats === 1 ? "" : "s"}.

Every position is a FRACTION of the frame: x 0 = left edge, 1 = right edge; y 0 = top, 1 = bottom. Draw for a 16:9 frame.
Shapes: {"kind":"rect","x","y","w","h","r"(corner 0-0.5),"fill"} · {"kind":"ellipse","x","y","w","h","fill"} · {"kind":"poly","points":[[x,y],...],"fill"} · {"kind":"line","points":[[x,y],...],"stroke","width"(0.001-0.02)} · {"kind":"text","x","y","text","size"(0.02-0.12),"fill","align"}.
Optional on any shape: "alpha" 0-1, "stroke", "repeat": [count across, count down, step x, step y] to make rows (windows, bulbs, tiles, chairs).
A fill is a colour "#rrggbb" or a gradient {"linear":[x0,y0,x1,y1],"stops":[[0,"#..."],[1,"#..."]]}.

"back": shapes BEHIND the people (walls, floor, windows, shelves, lights) - start with a full-frame rect or gradient. Use 25-70 shapes: detail matters, keep it tidy and appealing, clear colours, soft light.
"front": shapes IN FRONT of the people (desk, table, counter, lectern) that hide them from the hips down. Keep the faces and chests clear.
"seats": where each person stands or sits: {"x","y"(the hip line, usually just behind a front shape's top edge, 0.8-0.95),"h"(person height, 0.9-1.2 for main people, smaller further back),"face":"camera"|"left"|"right"}.
Leave the middle of the frame clear around head height. No people, no logos.

{"label":"short name","help":"one plain sentence","back":[...],"front":[...],"seats":[...]}`;
}

const built = new WeakMap();
/** The set for a scene: a made one (scene.spec) or a built-in one (scene.id). */
export function setFor(scene) {
  if (!scene) return null;
  if (scene.spec && typeof scene.spec === "object") {
    if (!built.has(scene.spec)) { const { spec } = checkSpec(scene.spec); built.set(scene.spec, spec ? setFromSpec(spec) : null); }
    return built.get(scene.spec);
  }
  return SETS[scene.id] ?? null;
}
