// The carousel's slides: real screenshots only (STANDARDS §7 and §8), read at
// build time from the repo's docs/media/ folder, the same files the README shows.
// Name them NN-what-it-shows.png (or .jpg/.webp). Stills are used when there are
// any; otherwise the README's GIF clips. No files = no carousel and no menu entry.
//
// TODO: when docs/media/ is filled, give each file a plain one-sentence caption
// in CAPTIONS below (the file name is used until then).

const stills = import.meta.glob<string>('../../../docs/media/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});
const clips = import.meta.glob<string>('../../../docs/media/*.gif', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** File name without number and extension -> a plain caption. */
const CAPTIONS: Record<string, { title: string; caption: string }> = {
  // 'make-a-video': { title: 'Make a video', caption: 'Five steps, one decision at a time.' },
};

const pick = Object.keys(stills).length ? stills : clips;

export const showcaseSlides = Object.entries(pick)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([file, url]) => {
    const stem = file.split('/').pop()!.replace(/\.[a-z]+$/i, '').replace(/^\d+[-_ ]*/, '');
    const words = stem.replace(/[-_]+/g, ' ').trim();
    const nice = words.charAt(0).toUpperCase() + words.slice(1);
    const own = CAPTIONS[stem];
    return {
      title: own?.title ?? nice,
      caption: own?.caption ?? `Video Forge: ${words}.`,
      image: url,
      alt: `Screenshot of Video Forge: ${own?.title ?? words}`,
    };
  });
