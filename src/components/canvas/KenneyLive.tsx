// A 3D speaker in the live preview: KenneyAvatar with the app's own file address.
import { useMemo } from "react";
import { KenneyAvatar } from "./KenneyAvatar";
import { blinkBlendAt } from "../../lib/motion/facePerformance";
import { kenneyLid, kenneySignalFor, kenneyTagsFor } from "../../lib/kenney/signals";
import type { SpeakerConfig } from "../../store/types";

export const kenneyAsset = (rel: string) => "forge-kenney://app/" + rel;

interface Props {
  sp: SpeakerConfig;
  size: number;
  timeMs: number;
  track: Parameters<typeof kenneySignalFor>[2];
  moods: { startMs: number; endMs: number; mood: string }[] | undefined;
  segments: { speakerId: string; startMs: number; endMs: number; tags?: string[] }[];
  fadeSec: number;
  idleMotion: number;
  yaw?: number;
  walks?: { startMs: number; endMs: number }[];
}

export function KenneyLive({ sp, size, timeMs, track, moods, segments, fadeSec, idleMotion, yaw = 0, walks }: Props) {
  const card = sp.kenney!;
  const signal = useMemo(() => kenneySignalFor(sp.id, card.face?.mood ?? "open", track, moods, segments, fadeSec), [sp.id, card.face?.mood, track, moods, segments, fadeSec]);
  const tags = useMemo(() => kenneyTagsFor(sp.id, segments, walks, { amount: sp.gestures ?? 0.5, set: card.set, seated: card.motion === "sit" }), [sp.id, segments, walks, sp.gestures, card.set, card.motion]);
  const blink = (card.face?.blink ?? 1) > 0 ? kenneyLid(blinkBlendAt(sp.id, timeMs, idleMotion).to) : null;
  return <KenneyAvatar card={card} size={size} timeMs={timeMs} asset={kenneyAsset} signalAt={signal.at} signalKey={signal.key} tags={tags} lid={blink} framing={sp.kenneyFraming ?? "body"} yaw={yaw} />;
}
