// ---------------------------------------------------------------------------
// Cast → Voice → Voice character: a preset (chibi, warm narrator, radio…) and
// three plain sliders on top. Applied after the voice is made, in the render's
// post-production (electron/post) and in "Test the voice" just above, so the
// test is the preview.
// ---------------------------------------------------------------------------

import { Picker } from "../ui/Picker";
import { Slider } from "../ui/Slider";
import type { SpeakerConfig } from "../../store/types";
import {
  VOICE_CHARACTER_HELP,
  VOICE_PRESETS,
  cleanVoiceCharacter,
  type VoiceCharacter,
  type VoicePresetId,
} from "../../lib/post/postSettings";

export function VoiceCharacterPicker({ sp, onChange }: { sp: SpeakerConfig; onChange: (v: VoiceCharacter) => void }) {
  const vc = cleanVoiceCharacter(sp.voiceCharacter);
  const preset = VOICE_PRESETS.find((p) => p.id === vc.preset) ?? VOICE_PRESETS[0];
  const set = (patch: Partial<VoiceCharacter>) => onChange({ ...vc, ...patch });
  const touched = vc.preset !== "natural" || vc.pitch !== 0 || vc.brightness !== 0 || vc.sparkle !== 0;

  return (
    <div className="space-y-3 rounded-lg border border-accent/15 p-3" data-tip={VOICE_CHARACTER_HELP}>
      <div className="flex items-center justify-between gap-2">
        <span className="label-etched text-sm">Voice character</span>
        {touched && (
          <button className="btn" onClick={() => onChange(cleanVoiceCharacter(null))} data-tip={`Back to ${sp.label}'s voice exactly as made: no character, sliders at zero.`}>
            Reset
          </button>
        )}
      </div>
      <div data-tip={`${preset.help} Press "Test the voice" above to hear it.`}>
        <Picker<VoicePresetId>
          aria-label={`Voice character for ${sp.label}`}
          className="w-full"
          value={vc.preset}
          options={VOICE_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
          onChange={(id) => set({ preset: id })}
        />
      </div>
      <p className="text-sm text-neutral-400">{preset.help}</p>
      <Slider
        label="Pitch"
        value={vc.pitch}
        min={-4}
        max={4}
        step={0.5}
        format={(v) => (v === 0 ? "as the character" : `${v > 0 ? "+" : "−"}${Math.abs(v)} step${Math.abs(v) === 1 ? "" : "s"}`)}
        onChange={(pitch) => set({ pitch })}
        data-tip="Higher or lower than the character above, in musical steps. Same speed, same throat size."
      />
      <Slider
        label="Brightness"
        value={vc.brightness}
        min={-1}
        max={1}
        step={0.1}
        format={(v) => (Math.abs(v) < 0.001 ? "as the character" : v > 0 ? `brighter ${Math.round(v * 100)}%` : `darker ${Math.round(-v * 100)}%`)}
        onChange={(brightness) => set({ brightness })}
        data-tip="Darker and softer to the left, clearer and more forward to the right."
      />
      <Slider
        label="Sparkle"
        value={vc.sparkle}
        min={0}
        max={1}
        step={0.1}
        format={(v) => (v === 0 ? "none added" : `${Math.round(v * 100)}%`)}
        onChange={(sparkle) => set({ sparkle })}
        data-tip="Adds air and shine to the very top of the voice. A little goes a long way; too much makes S sounds sharp."
      />
      <p className="text-sm text-neutral-500">Changes how the voice sounds, not how it acts: feelings and timing come from the voice itself.</p>
    </div>
  );
}
