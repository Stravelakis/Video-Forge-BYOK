import { useEffect, useState } from "react";

// Which copy of Video Forge this is, and whether a newer one is out.
// The check itself runs in the main process (electron/main.ts, app:updateCheck),
// at most once a day; this only shows the answer. Nothing is downloaded: the
// notice is a link to the release page.

type Info = { version: string; build: string };
type Update = { version: string; url: string; beta: boolean } | null;

const BUILD_WORDS: Record<string, string> = {
  personal: "Personal build",
  public: "Public build",
  dev: "running from source",
};

// One question per session, shared by every place that shows the answer.
let infoAsk: Promise<Info | null> | null = null;
let updateAsk: Promise<Update> | null = null;
const askInfo = () => (infoAsk ??= window.byok.about?.info().catch(() => null) ?? Promise.resolve(null));
const askUpdate = () => (updateAsk ??= window.byok.about?.updateCheck().catch(() => null) ?? Promise.resolve(null));

function useAnswer<T>(ask: () => Promise<T>, empty: T): T {
  const [value, setValue] = useState<T>(empty);
  useEffect(() => {
    let live = true;
    void ask().then((v) => live && setValue(v));
    return () => {
      live = false;
    };
  }, [ask]);
  return value;
}

/** Small "Video Forge 0.4.0-beta.1 · Public build" line for Settings. */
export function AboutLine() {
  const info = useAnswer(askInfo, null);
  const update = useAnswer(askUpdate, null);
  if (!info) return null;
  return (
    <p
      className="text-[13px] text-neutral-400"
      data-tip="Which copy of Video Forge this is. The Public build is the one anyone can download; the Personal build adds the owner's brands and music."
    >
      Video Forge {info.version} · {BUILD_WORDS[info.build] ?? `${info.build} build`}
      {update && (
        <>
          {" · "}
          <UpdateLink update={update} />
        </>
      )}
    </p>
  );
}

function UpdateLink({ update }: { update: NonNullable<Update> }) {
  return (
    <a
      href={update.url}
      target="_blank"
      rel="noreferrer"
      className="text-accent-bright underline hover:text-accent"
      data-tip="Opens the download page in your browser. Nothing installs by itself, and your saved work is kept when you update."
    >
      Version {update.version}
      {update.beta ? " (test version)" : ""} is out →
    </a>
  );
}

/** The same notice for the top bar; shows nothing until there is an update. */
export function UpdateNotice() {
  const update = useAnswer(askUpdate, null);
  if (!update) return null;
  return (
    <span className="text-[13px] whitespace-nowrap">
      <UpdateLink update={update} />
    </span>
  );
}
