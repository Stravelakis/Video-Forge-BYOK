// A 3D speaker in the final video: KenneyAvatar with a render's file paths and loading hold.
import { useCallback, useMemo } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { KenneyAvatar } from "../src/components/canvas/KenneyAvatar";
import { blinkBlendAt } from "../src/lib/motion/facePerformance";
import { kenneyLid, kenneySignalFor, kenneyTagsFor } from "../src/lib/kenney/signals";
import type { KenneyCard } from "../src/lib/kenney/actor";

type Seg = { speakerId: string; startMs: number; endMs: number; tags?: string[] };
interface Props {
  sp: { id: string; kenney?: KenneyCard | null; kenneyFraming?: "body" | "bust" | "face"; gestures?: number };
  size: number;
  timeMs: number;
  track: Parameters<typeof kenneySignalFor>[2];
  moods: { startMs: number; endMs: number; mood: string }[] | undefined;
  segments: Seg[];
  fadeSec: number;
  idleMotion: number;
  yaw?: number;
  walks?: { startMs: number; endMs: number }[];
}

export function KenneyStage({ sp, size, timeMs, track, moods, segments, fadeSec, idleMotion, yaw = 0, walks }: Props) {
  const card = sp.kenney!;
  const signal = useMemo(() => kenneySignalFor(sp.id, card.face?.mood ?? "open", track, moods, segments, fadeSec), [sp.id, card.face?.mood, track, moods, segments, fadeSec]);
  const tags = useMemo(() => kenneyTagsFor(sp.id, segments, walks, { amount: sp.gestures ?? 0.5, set: card.set, seated: card.motion === "sit" }), [sp.id, segments, walks, sp.gestures, card.set, card.motion]);
  const asset = useCallback((rel: string) => staticFile("kenney/" + rel), []);
  const hold = useCallback(() => { const h = delayRender("3D character"); return () => continueRender(h); }, []);
  const blink = (card.face?.blink ?? 1) > 0 ? kenneyLid(blinkBlendAt(sp.id, timeMs, idleMotion).to) : null;
  return <KenneyAvatar card={card} size={size} timeMs={timeMs} asset={asset} signalAt={signal.at} signalKey={signal.key} tags={tags} lid={blink} framing={sp.kenneyFraming ?? "body"} yaw={yaw} hold={hold} />;
}
