// ---------------------------------------------------------------------------
// Render step → Post-production → Swear words (plan 10b, Ak 17 Nov 2026).
// Off by default. Bleep / mute work on the finished sound and star out the
// subtitles; "Softer word" changes what the voice is asked to say, so it needs
// the voices made again. Rules and matching: src/lib/post/swears.ts.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { Picker } from "../ui/Picker";
import { Toggle } from "../ui/Toggle";
import { useProjectStore } from "../../store/useProjectStore";
import { defaultPost } from "../../lib/post/postSettings";
import {
  ENGLISH_SWEARS,
  GREEK_SWEARS,
  SWEAR_MODES,
  cleanSwears,
  ownRulesFromText,
  ownRulesToText,
  type SwearMode,
  type SwearRule,
} from "../../lib/post/swears";

function WordChips({ rules, allowed, onToggle, showSwap }: { rules: SwearRule[]; allowed: Set<string>; onToggle: (w: string) => void; showSwap: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {rules.map((r) => {
        const off = allowed.has(r.word);
        return (
          <button
            key={r.word}
            type="button"
            className="chip"
            aria-pressed={!off}
            onClick={() => onToggle(r.word)}
            style={{ opacity: off ? 0.45 : 1, textDecoration: off ? "line-through" : "none", fontSize: 13 }}
            data-tip={off ? `"${r.word}" is let through in this project. Click to clean it up again.` : `Click to let "${r.word}" through in this project. A * at the end means every word that starts like this.`}
          >
            {r.word}
            {showSwap && r.swap ? ` → ${r.swap}` : ""}
          </button>
        );
      })}
    </div>
  );
}

export function SwearCleanup() {
  const post = useProjectStore((s) => s.post) ?? defaultPost();
  const setPost = useProjectStore((s) => s.setPost);
  const sw = cleanSwears(post.swears);
  const allowed = new Set(sw.allowed);
  const swap = sw.mode === "swap";

  // the own-words box keeps what is being typed; saved when you leave it
  const [ownText, setOwnText] = useState(() => ownRulesToText(sw.own));
  const ownKey = JSON.stringify(sw.own);
  useEffect(() => setOwnText(ownRulesToText(sw.own)), [ownKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (w: string) =>
    setPost({ swears: { allowed: allowed.has(w) ? sw.allowed.filter((x) => x !== w) : [...sw.allowed, w] } });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="tlabel" data-tip="What happens to swear words in Greek and English. No clean-up is the default.">Swear words</span>
        <Picker
          data-tip="What happens to swear words: kept, bleeped, muted, or said as a softer word (shit → shoot). Bleep and mute also star out the subtitles."
          value={sw.mode}
          options={SWEAR_MODES.map((m) => ({ value: m.value, label: m.label }))}
          onChange={(mode) => setPost({ swears: { mode } })}
          aria-label="Swear words"
        />
      </div>
      <p className="text-sm text-neutral-400" data-tip="What the chosen way does to swear words.">{SWEAR_MODES.find((m) => m.value === sw.mode)?.help}</p>

      {sw.mode !== "off" && (
        <>
          {swap && (
            <p className="text-sm text-amber-300" data-tip="The softer word is said by the voice itself, so the voices have to be made again for it to take effect. Until then the words are bleeped.">
              Make the voices again (Script step) so they say the softer words. Until then, these words are bleeped.
            </p>
          )}
          <p className="text-sm text-neutral-400" data-tip="When the narration has measured word times, the bleep sits right on the word. Otherwise the time is estimated from the letters, so the bleep is made a little wider to be sure to cover it.">
            The bleep follows when each word is said. Capitals and Greek accents don't matter.
          </p>

          <Toggle label="English words" checked={sw.english} onChange={(english) => setPost({ swears: { english } })} data-tip="Clean up the built-in English swear words." />
          {sw.english && <WordChips rules={ENGLISH_SWEARS} allowed={allowed} onToggle={toggle} showSwap={swap} />}

          <Toggle label="Greek words" checked={sw.greek} onChange={(greek) => setPost({ swears: { greek } })} data-tip="Clean up the built-in Greek swear words (with or without accents)." />
          {sw.greek && <WordChips rules={GREEK_SWEARS} allowed={allowed} onToggle={toggle} showSwap={swap} />}

          <label className="block space-y-1">
            <span className="text-sm text-neutral-300" data-tip='One per line. "word = softer word". Put * at the end for every word that starts like this (damn* = darn* turns damned into darned). With no softer word, it is always bleeped.'>
              Your own words
            </span>
            <textarea
              value={ownText}
              rows={4}
              className="resize-y w-full"
              style={{ fontSize: 13 }}
              placeholder={"heck = hmm\nφτου* = ωχ*"}
              onChange={(e) => setOwnText(e.target.value)}
              onBlur={() => setPost({ swears: { own: ownRulesFromText(ownText) } })}
              data-tip='One per line: "word = softer word". A * at the end means every word that starts like this. Saved when you click away.'
            />
          </label>
        </>
      )}
    </div>
  );
}
