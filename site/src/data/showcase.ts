// The carousel's slides: real screenshots only (STANDARDS §7 and §8), read at
// build time from the repo's docs/media/ folder, the same files the README shows.
// Name them NN-what-it-shows.png (or .jpg/.webp). Stills are used when there are
// any; otherwise the README's GIF clips. No files = no carousel and no menu entry.
//

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
  "choose-characters": { title: "Pick your cast", caption: "Ready-made 3D people, pets and drawn characters. Click one, it joins your video." },
  "choose-a-format": { title: "Pick a format", caption: "One person talking, a storyteller, an interview, big faces. Tall, wide, square or feed." },
  "character-customiser": { title: "Make them yours", caption: "Colours, moods, moves and props, with a live preview in the scene." },
  "subtitles-and-talking-preview": { title: "Press play", caption: "Characters talk with lip-sync while the subtitles light up word by word." },
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
