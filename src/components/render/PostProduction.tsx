// ---------------------------------------------------------------------------
// Render step → Post-production: what happens to the video after the frames
// are drawn. Studio sound on the speech, voices left/right, swear clean-up,
// and a colour grade.
// The voice characters are chosen per speaker in the Cast (Voice section).
// Settings: src/lib/post/postSettings.ts. The work: electron/post.
// ---------------------------------------------------------------------------

import { Toggle } from "../ui/Toggle";
import { Slider } from "../ui/Slider";
import { useProjectStore } from "../../store/useProjectStore";
import { defaultPost, MAX_PAN } from "../../lib/post/postSettings";
import { SwearCleanup } from "./SwearCleanup";

const fileName = (p: string | null) => (p ? p.split(/[\\/]/).pop() : null);

export function PostProduction() {
  const post = useProjectStore((s) => s.post) ?? defaultPost();
  const setPost = useProjectStore((s) => s.setPost);
  const speakers = useProjectStore((s) => s.speakers);
  const oneVoice = speakers.length < 2;

  async function pickLut() {
    const p = await window.byok.dialog.openFile([{ name: "Colour LUT (.cube)", extensions: ["cube"] }]);
    if (p) setPost({ grade: { lutPath: p, on: true } });
  }

  return (
    <details className="forge-sec" open>
      <summary data-tip="What happens to the video after the pictures are made: cleaner, even speech, voices placed left and right, and a colour grade. It runs by itself on every render, including Many videos.">
        Post-production
      </summary>
      <div className="space-y-4 pt-3">
        <div className="space-y-1">
          <Toggle
            label="Studio sound"
            checked={post.studioSound}
            onChange={(studioSound) => setPost({ studioSound })}
            data-tip="Gently cleans the voices: less rumble, even loud and quiet words, softer sharp S sounds. Then sets the loudness YouTube and TikTok expect (-14 LUFS, peaks under -1 dB)."
          />
          <p className="text-sm text-neutral-400">Gentle clean-up and even loudness for the voices. Music and sound effects are not touched.</p>
        </div>

        <div className="space-y-2">
          <Toggle
            label="Voices left and right"
            checked={post.stereo.on}
            onChange={(on) => setPost({ stereo: { on } })}
            data-tip="Each voice leans a little towards the side of the screen its speaker stands on, at most 30%. Needs two or more speakers."
          />
          {post.stereo.on && (
            <Slider
              label="How far to the sides"
              value={post.stereo.amount}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * MAX_PAN * 100)}% at the edge`}
              onChange={(amount) => setPost({ stereo: { amount } })}
              data-tip="How much a voice at the very edge of the picture leans to its side. The near side never gets louder; the far side gets a little quieter."
            />
          )}
          {post.stereo.on && oneVoice && (
            <p className="text-sm text-amber-300" data-tip="Left and right needs at least two speakers to place.">Only one speaker: nothing to place.</p>
          )}
        </div>

        <SwearCleanup />

        <div className="space-y-2">
          <Toggle
            label="Colour grade"
            checked={post.grade.on}
            onChange={(on) => setPost({ grade: { on } })}
            data-tip="Gives the finished picture a colour look: a LUT file (.cube) from a colour pack, plus contrast and colour strength. Costs one extra pass over the video at the end."
          />
          {post.grade.on && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn" onClick={() => void pickLut()} data-tip="Pick a colour look file (.cube), the kind colour packs come as. None ship with the app yet.">
                  {post.grade.lutPath ? "Change LUT…" : "Pick a LUT (.cube)…"}
                </button>
                {post.grade.lutPath && (
                  <>
                    <span className="text-sm text-neutral-300 break-all" data-tip={post.grade.lutPath}>{fileName(post.grade.lutPath)}</span>
                    <button className="btn" onClick={() => setPost({ grade: { lutPath: null } })} data-tip="Stop using this LUT. Contrast and colour strength stay.">
                      Remove
                    </button>
                  </>
                )}
              </div>
              <Slider
                label="Contrast"
                value={post.grade.contrast}
                min={0.5}
                max={1.5}
                step={0.05}
                format={(v) => (Math.abs(v - 1) < 0.001 ? "as made" : `${v > 1 ? "+" : "−"}${Math.round(Math.abs(v - 1) * 100)}%`)}
                onChange={(contrast) => setPost({ grade: { contrast } })}
                data-tip="More contrast makes darks darker and lights lighter; less makes the picture softer and flatter."
              />
              <Slider
                label="Colour strength"
                value={post.grade.saturation}
                min={0}
                max={2}
                step={0.05}
                format={(v) => (Math.abs(v - 1) < 0.001 ? "as made" : v === 0 ? "black and white" : `${v > 1 ? "+" : "−"}${Math.round(Math.abs(v - 1) * 100)}%`)}
                onChange={(saturation) => setPost({ grade: { saturation } })}
                data-tip="How strong the colours are. 0 is black and white; above the middle, colours get richer."
              />
              <p className="text-sm text-neutral-400">The grade is seen in the rendered video, not in the preview. Intro and outro cards are left as they are.</p>
            </>
          )}
        </div>

        <p className="text-sm text-neutral-400" data-tip="Each speaker's voice character is set in the Cast, under Voice.">
          Voice characters (chibi, warm narrator, radio…) are picked per speaker in the Cast, under Voice.
        </p>
      </div>
    </details>
  );
}
