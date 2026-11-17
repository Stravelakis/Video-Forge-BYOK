// ---------------------------------------------------------------------------
// The HyperFrames page (index.html): the layers in order, plus the props.
//
// SAFE BY CONSTRUCTION (17 Nov 2026 review, X2). The props come from a project
// file, and this page runs in a hidden browser with no content policy. Every
// value written into the HTML is either:
//   - a number forced through num() (a string can never land in an attribute
//     or a style),
//   - one of a fixed set of words (the logo position), or
//   - text passed through attr().
// The props blob itself goes in as JSON with "<" escaped.
//
// Type-only imports on purpose: tools/lib/renderSafety.test.mjs runs this file.
// ---------------------------------------------------------------------------

import type { RenderProps } from "../../../remotion/types";

export const ID = "video-forge";

/** Text for inside a double-quoted attribute. */
export const attr = (s: unknown) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A plain finite number, or the fallback. */
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

export interface PageParts {
  bg: { file: string; startSec: number; durSec: number } | null;
  banner: string | null;
  mix: string | null;
  totalSec: number;
  /** The colour look's CSS filter, from the fixed table (colorLookCss). */
  lookCss: string;
}

export function writePage(props: RenderProps, parts: PageParts): string {
  const W = num(props.width, 1080), H = num(props.height, 1920), fps = num(props.fps, 30);
  const T = num(parts.totalSec, 1).toFixed(4);
  const band = props.backgroundBand;
  const blurPx = num(props.backgroundBlur, 0) * W;
  // The look's CSS comes from a fixed table, but it is still kept to the
  // characters a CSS filter list uses.
  const look = /^[\w\s().,%-]*$/.test(parts.lookCss) ? parts.lookCss : "";
  const bgFilter = [blurPx > 0 ? `blur(${blurPx}px)` : "", look].filter(Boolean).join(" ");
  const bgWrap = band
    ? `top:${num(band.top, 0) * 100}%;height:${(num(band.bottom, 1) - num(band.top, 0)) * 100}%;bottom:auto;overflow:hidden;` +
      `-webkit-mask-image:linear-gradient(to bottom,transparent 0%,black 12%,black 88%,transparent 100%);mask-image:linear-gradient(to bottom,transparent 0%,black 12%,black 88%,transparent 100%);`
    : "";
  const layers: string[] = [];
  if (parts.bg) {
    // The React layer draws the dim over this exactly as BackgroundLayer did.
    layers.push(
      `<div class="vf-layer" style="${bgWrap}"><video id="vf-bg" class="clip" src="${attr(parts.bg.file)}" data-start="${num(parts.bg.startSec, 0).toFixed(4)}" data-duration="${num(parts.bg.durSec, 0).toFixed(4)}" data-track-index="0" muted playsinline ` +
        `style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;${bgFilter ? `filter:${bgFilter};` : ""}${blurPx > 0 ? "transform:scale(1.1);" : ""}"></video></div>`
    );
  }
  layers.push(`<div id="vf-react-clip" class="clip" data-start="0" data-duration="${T}" data-track-index="1"><div id="vf-react" style="position:absolute;inset:0"></div></div>`);
  const intro = props.introOverlay;
  if (intro) {
    layers.push(
      `<video id="vf-intro" class="clip" src="${attr(intro.fileName)}" data-start="0" data-duration="${(num(intro.durationMs, 0) / 1000).toFixed(4)}" data-track-index="2" muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000"></video>`
    );
  }
  const b = props.bannerVideo;
  if (b && parts.banner) {
    const cropTop = num(b.cropTop, 0);
    const keep = 1 - cropTop - num(b.cropBottom, 0);
    const sourceH = W * (9 / 16);
    layers.push(
      `<div class="vf-layer" style="top:auto;height:${sourceH * keep}px;overflow:hidden"><video id="vf-banner" class="clip" src="${attr(parts.banner)}" data-start="0" data-duration="${T}" data-track-index="3" muted playsinline ` +
        `style="position:absolute;left:0;width:100%;height:${sourceH}px;top:${-sourceH * cropTop}px;object-fit:cover"></video></div>`
    );
  }
  const logo = props.logo;
  if (logo) {
    const m = num(logo.margin, 0) * W;
    const position = String(logo.position);
    // Same placement rules as the composition's own <Img>.
    const pos =
      position === "watermark"
        ? "left:50%;top:50%;transform:translate(-50%,-50%);"
        : position === "bottom-center"
        ? `left:50%;bottom:${m}px;transform:translateX(-50%);`
        : `${position.startsWith("top") ? `top:${m}px;` : `bottom:${m}px;`}${position.endsWith("left") ? `left:${m}px;` : `right:${m}px;`}`;
    layers.push(`<img id="vf-logo" src="${attr(logo.fileName)}" alt="" style="position:absolute;width:${W * num(logo.size, 0.15)}px;opacity:${num(logo.opacity, 1)};${pos}">`);
  }
  if (parts.mix) layers.push(`<audio id="vf-mix" src="${attr(parts.mix)}" data-start="0" data-duration="${T}" data-track-index="4"></audio>`);

  const data = { props: { ...props, nativeMedia: true }, config: { width: W, height: H, fps, durationInFrames: Math.max(1, Math.round(num(props.durationSec, 1) * fps)) }, id: ID };
  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  html,body{margin:0;background:#0b0b0d}
  #stage{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#0b0b0d}
  .vf-layer{position:absolute;left:0;right:0;top:0;bottom:0}
  #vf-react-clip{position:absolute;inset:0}
</style></head>
<body>
<div id="stage" data-composition-id="${ID}" data-start="0" data-width="${W}" data-height="${H}" data-duration="${T}" data-fps="${fps}">
${layers.join("\n")}
</div>
<script>window.__VF__ = ${JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")};</script>
<script src="vf.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  window.__timelines["${ID}"] = window.__vfTimeline;
</script>
</body></html>`;
}
