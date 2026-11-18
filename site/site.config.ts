import type { DotFieldOptions } from './src/scripts/dot-field';
import { showcaseSlides } from './src/data/showcase';

// Per-repo config. Most projects only touch this file and src/docs/*.md.

interface SocialLink {
  kind: 'github' | 'linkedin';
  label: string;
  href: string;
}

export const siteConfig = {
  projectName: "Video Forge",
  description:
    "A Windows app for videos where characters talk: narrated, subtitled, in Greek or English. Bring your own keys; the video is made on your own computer.",
  repoUrl: "https://github.com/Stravelakis/Video-Forge-BYOK",
  // Path under /public including the base path, e.g. '/repo-name/favicon.svg'. Empty = no favicon tag.
  faviconHref: "/Video-Forge-BYOK/favicon.png",

  // What a link to the site shows when shared (Open Graph / Twitter cards).
  // seoTitle is the front page's <title> and share title; empty falls back to
  // "Overview · projectName". socialImage is a 1200x630 PNG in /public
  // (without the base path); empty means no image, and most platforms then
  // show a bare, easily-ignored link. Always set both before publishing.
  // Rebuild the image with: npx electron site/scripts/social/render.cjs (from the repo root).
  seoTitle: "Video Forge: talking-character videos, made on your own computer",
  socialImage: "og-image.png",
  socialImageAlt: "The Video Forge logo, an anvil with a play button and film strip, beside the words: Video Forge. Talking-character videos, made on your own computer.",
  locale: 'en_GB',

  // Sidebar menu. Each id must match an element id on the page.
  // "showcase" only appears when docs/media/ has screenshots (see src/pages/index.astro).
  nav: [
    { id: 'top', label: 'Overview' },
    { id: 'features', label: 'Features' },
    { id: 'showcase', label: 'Showcase' },
    { id: 'docs', label: 'Docs' },
  ].filter((item) => item.id !== 'showcase' || showcaseSlides.length > 0),

  // Reading-level switch at the top of the sidebar. The ids are fixed (they
  // match src/docs/dev.md, plain.md, eli5.md); change labels only.
  // First-visit level (STANDARDS §7: English). A saved choice still wins.
  defaultVernacular: 'plain',

  // Tally form link (STANDARDS §8). Empty = no "Send feedback" link.
  // TODO: make the Video Forge Tally form (consent box, email optional) and paste its link here.
  feedbackUrl: '',

  vernaculars: [
    { id: 'dev', label: 'Dev' },
    { id: 'plain', label: 'English' },
    { id: 'eli5', label: 'ELI5' },
  ],

  playground: {
    // true only for JS/web projects, where running the code in the browser is real.
    enabled: false,
    starterCode: `// try it\nconsole.log("hello from the playground")`,
  },

  author: {
    name: 'Stravelakis',
    links: [
      { kind: 'github', label: 'GitHub', href: 'https://github.com/Stravelakis' },
      { kind: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/stravelakiscom/' },
    ] as SocialLink[],
  },

  // React Bits "Dot Field" settings, same names as on reactbits.dev.
  backgrounds: {
    page: {
      cursorRadius: 200,
      bulgeStrength: 6,
      cursorForce: 0,
      dotRadius: 2,
      dotSpacing: 5,
      glowRadius: 50,
      sparkle: true,
      gradientFrom: '#0001c6',
      gradientTo: '#00cade',
      glowColor: '#040410',
    },
    sidebar: {
      cursorRadius: 100,
      bulgeStrength: 0,
      cursorForce: 0,
      bulgeOnly: false,
      dotSpacing: 5,
      glowRadius: 50,
      gradientFrom: '#0001c6',
      gradientTo: '#00cade',
      glowColor: '#040410',
    },
  } satisfies Record<string, DotFieldOptions>,
};
