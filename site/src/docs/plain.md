## What Video Forge is

A Windows app for making videos where **characters talk**. You write what each one says, pick a voice for each, and the app builds the video: the mouths move with the words, subtitles light up word by word, and it works in Greek or English.

It runs on **your own computer**. There is no Video Forge account and no Video Forge server. For voices, AI help and stock footage it uses online services with **your own keys** (a BYOK app: bring your own key), and each service bills you directly. Most of them have a free tier.

> **In short** You write `Name: words` lines. Video Forge turns them into voices, moving mouths, subtitles and a finished `.mp4` on your PC. Free to use, including for paid work, with one rule: credit "Made with Video Forge" when you publish.

## What your PC needs

- **Windows 10 or 11, 64-bit.** There is no Mac or Linux version.
- **About 700 MB** of disk space for the app, plus room for your videos (a seven-minute video is roughly 100 to 200 MB).
- **Internet** for voices, AI, stock footage and fonts.
- **Recommended:** an NVIDIA graphics card with 8 GB and 32 GB of memory. A 10-minute video takes about an hour to make on that. A weaker PC still works, but slower.

> **Watch out** Making a video is heavy work for your PC. Close big programs first. **Quick draft** (below) lets you check a video in a fraction of the time.

## Install it

1. Open the [latest release](https://github.com/Stravelakis/Video-Forge-BYOK/releases/latest) and, under **Assets**, download **Video Forge Setup x.y.z.exe**.
2. Double-click it. Windows may show a blue box, **"Windows protected your PC"**. Click **More info**, then **Run anyway**. The app is not code-signed yet, so Windows does not know the maker. It does not mean the file is harmful.
3. Pick a folder or keep the one offered, and click **Install**. A **Video Forge** shortcut appears on your desktop and in the Start menu.

Do not want to install anything? Download **video-forge-portable.exe** from the same page. It is the same app as one file.

> **Watch out** If the release page has no files yet, the first public version has not been published. Check back later, or build it yourself from the source (see **Dev**).

## Set it up: keys

A **key** is a private code from an online service that lets the app use your account there. Open **⚙** (top right), which shows **Keys and settings**.

1. Find the box for a service and press **Get a key →**. Its own page opens in your browser.
2. Copy your key there, and paste it into the box that says **Paste key…**.
3. Press **Save** (a green **saved ✓** appears), then **Test**. Test makes one real call and tells you whether the key works.

If a message in the app says a key is missing, it has an **Open Settings** button that jumps here.

**A good start**, all with free tiers:

| Service | What it gives you |
|---|---|
| **Gemini** | Voices, background-clip planning, translation to the other language |
| **Groq** | A fast AI for directing and explainers |
| **Pixabay** and **Pexels** | Stock background video and pictures |

Other boxes: OpenRouter (the Fish Audio voice, more AIs), NVIDIA, Cerebras, Mistral, OpenAI (paid), ElevenLabs (paid voices), your own server, and Freesound (sound effects, CC0 only). Each box has a badge: free, paid, or needs approval first.

<details>
<summary>More than one Gemini key</summary>

Under the Gemini box you can paste extra Gemini keys, one per line. When one key's free allowance runs out, the next one is used. **Clear extras** forgets the extras and keeps the main key.

</details>

## Your first video

1. Press **Create** and pick a **Style** (for a first try, a drawn one such as 2D stick cutout).
2. In **Characters**, click two ready-made characters to add them. Click each one on the right and give it a **Voice**. Gemini is free.
3. Pick **Plain colour or gradient** as the **Background**.
4. Pick **16:9**, then the format **Two people talking**.
5. On **Review**, press **Go to production →**. You land on the **Script** step.
6. Write four lines, each as `Name: words`, using your two characters' names exactly.
7. Press **Make the narration**, then **▶** on the preview to watch and listen.
8. Go to **Make** and press **Quick draft** to check it fast, then **Render video**. Press **Open folder** to find the file.

> **Try it** Write `Maria: Hello!` for a character called Maria. The name before the colon has to match the character's name. If a line has no voice, that is almost always why.

## Create: one decision at a time

Five steps along the top, and **← Back** never loses anything:

1. **Style:** how characters are drawn. Groups: 3D characters, three groups of drawn styles (clean and modern, history and folk, art materials), and picture puppets.
2. **Characters:** add them one by one. Each has a voice, a main colour, a demeanour, looks, sound waves and a place. A red dot means it needs a choice from you.
3. **Background:** stock video, sets drawn by code (news desk, podcast, stage and more), paintings and materials, Kenney 3D rooms, AI-made places with Google Flow, a presentation (PDF, PowerPoint, Google Slides), or a plain colour.
4. **Format:** pick the shape first (9:16 tall, 16:9 wide, 1:1 square, 4:5 feed), then a kind of video: one person talking, people talking together, shows and sets, or Explainer and Many videos.
5. **Review:** everything you chose, with **Change** buttons. You can **Save as a template** to start the next video from it.

## Production, step by step

Five steps down the left, the preview always on the right. Press the space bar to play.

1. **Characters:** who speaks, their voice, colours, size and place. Drag a character on the preview to move them.
2. **Script:** pick Greek or English, write or paste your lines, then **Make the narration**. Free voices take roughly 10 to 20 seconds a line. **Remake** redoes one line only. **Start from** gives a skeleton, **Write a draft** asks the AI for a first script.
3. **Direct:** put actions on words: walk in, turn, a camera shot, a feeling. **✨ Suggest** lets an AI propose them. Make the narration first.
4. **Look:** templates, background, subtitles, music, sounds and motion.
5. **Make:** preview, render and the extras.

### How to write a script

One line per piece of speech: `Name: words`.

```
Maria: Good morning! Today we talk about chocolate and dogs.
Nikos: Even a little?
Maria [quietly, like a secret]: Even a little.
Maria: [laughs] I did not see that coming.
[SFX: clicker-training]
Maria: [walks in] Hello again!
```

- **The name must match** the character's name: capitals do not matter, spelling and accents do. Greek `Καιτη` does not match `Καίτη`, and Latin `Kaiti` does not match a Greek name.
- **A stage direction goes before the colon**, in square brackets. Everything after the colon is spoken aloud.
- **`[laughs]`, `[whispers]`** inside a line are acted, never read out.
- **`[SFX: name]`** on its own line plays a recording from the app's `sfx/library` folder. An unknown name stops the render. The public download ships that folder empty, so add your own sound files.
- **Moves** like `[walks in]` or `[waves shyly]` work for drawn and 3D characters. The full list is in [MOVE-TAGS](https://github.com/Stravelakis/Video-Forge-BYOK/blob/HEAD/docs/MOVE-TAGS.md).
- **Punctuation is acting.** `?` raises the eyebrows, `!` sharpens them, `...` lets the head droop.
- **Short lines cut faster:** six short lines give six background changes.
- **Greek without accent marks is fine.** The app adds them before the voice speaks. If a word still sounds wrong, add it to **Settings → Say it like this**.

> **Watch out** One script is one language. For both, make two videos, or tick **Also in English / Greek** when you render.

## Kinds of characters

| Kind | Best for |
|---|---|
| **Drawn character** | Stories and drama. Walks in, sits, waves, holds things. Works in every drawn style |
| **Picture puppet** | Rich detail (Pixar-like, clay, photo, anime), made in Image Forge. Talks and blinks, a few arm poses |
| **3D character** | Toy-like people (3D Mini people, 20) and animals (3D Pets, 24), by Kenney (CC0) |
| **Talking portrait** | One framed picture whose mouth, eyes and brows move. No portraits come with the public download |

The **+** menu in Production → Characters adds ready-made characters, puppets from Image Forge, your saved library, or a character from a file. **Save to library** keeps a character for other videos. The **Characters** button in the top bar opens the creator, where you can lock parts, randomise the rest, or describe a change in plain words.

> **Watch out** **3D Humans** are in the owner's personal build only. In the public app they are greyed out with a note. Use 3D Mini people or 3D Pets.

## The voices you can pick

| Engine | Cost | What it is like |
|---|---|---|
| **Gemini** | Free | Acts, many languages. Live models are free with no daily limit; the voice-only models sound a little better but allow 10 lines a day free |
| **Fish Audio** | Free (OpenRouter key) | A funny foreign accent |
| **ElevenLabs** | Paid per character | The app shows the cost and asks first |
| **Piper** | Free, offline | Runs on your PC. Flat but fast, good for checking timing |
| **DramaBox** | Rented graphics machine | Acts from directions, made outside the app. Some ready-made characters use it; the app cannot make those lines itself |

Per speaker you can change speed, pitch and a **voice character** (natural, chibi, bright and young, warm narrator, deep and dramatic, radio). **🔊 Test the voice** lets you hear a sentence; it never spends paid or rented voices.

## Look: subtitles, music, sounds

- **Subtitles:** one-click caption styles (Bold box, Karaoke, One word, Clean outline, Lesson bar, Forge sweep, Comic burst, Ink drop). The word being said takes the speaker's colour. `.srt` and `.vtt` files come with every video.
- **Sound waves:** moving waves that show who is speaking, set per speaker.
- **Music:** pick a file from your PC (the public download has no music library). It gets quieter while someone talks (ducking), and can have its own dancing waves.
- **Sounds:** effects placed by time. **Freesound, CC0 only** needs a Freesound key; CC0 means no credit is needed.

## Cleaning up the sound and picture

Runs by itself on every render, including Many videos. Find it in **Make → Render**.

| Part | What it does | Default |
|---|---|---|
| **Studio sound** | Cleans the voices and sets the loudness YouTube and TikTok expect. Music and effects are untouched | On for new projects |
| **Voices left and right** | Each voice leans toward the side its speaker stands on. Needs two or more speakers | Off |
| **Swear words** | Greek and English: **No clean-up**, **Bleep**, **Mute**, or **Softer word** (the voice says a milder word, so make the voices again after switching it on) | No clean-up |
| **Colour grade** | A colour look from a `.cube` file plus contrast and colour strength. No look files ship with the app | Off |

> **Watch out** The colour grade shows in the finished video, not in the preview. Projects saved before post-production existed open with all of it off.

## Render and shapes

- **Quick draft:** a small, fast check with full sound. It opens by itself.
- **Render video:** the finished video at full quality.
- **Also as:** tick more shapes (**Tall 9:16** 1080×1920, **Square 1:1**, **Portrait 4:5** 1080×1350, **Wide 16:9** 1920×1080). They are made one after another.
- **Also in English / Greek:** a second copy in the other language, translated with your Gemini key.
- **Made with Video Forge:** a small label in a corner, on by default. You can untick it, but you must still credit Video Forge when you publish.
- The button counts the videos: two shapes and the other language says **Render 6 videos**.
- **Stop** ends it. What is half made is thrown away; the narration is kept. When it is done: **Play it** and **Open folder**.

You get an `.mp4` and `.srt` and `.vtt` subtitle files beside it.

## Many videos from a sheet

One row of a spreadsheet makes one video, with the same characters and look.

1. Set up the look first in Production.
2. Open **Many videos** and paste a Google Sheet link (**Share → Anyone with the link (Viewer)**) or press **Or pick a CSV file**. **Get a blank sheet** gives you the right columns.
3. Check the rows. **Not ready** rows are skipped until you fix them in the sheet and read it again.
4. Make every ready row. **Stop after this one** finishes the current video and stops.

Only a `script` column is required. Others: `name`, `topic`, `template`, `format` (9:16, 16:9, 1:1 or 4:5), `music` (`auto` or `none`), `backgrounds`, `language` (`el` or `en`). Put a whole script in one cell and break lines with **Alt+Enter**; a plain Enter starts a new row. Videos go into a folder named after the sheet and the date.

## Explainer videos

**Explainer** (top bar) makes animated pictures, words and charts drawn by code, timed to a narration. You type or paste what it says, an AI writes the scene list (it needs an AI key; Groq or Gemini work well), you pick a style, check every frame, and render. Extras: small sounds, chapter lines, a GIF, a short social clip, caption files.

## Working with Image Forge

[Image Forge](https://github.com/Stravelakis/image-forge) is the sister app that makes pictures and puppets. If both are installed on one Windows account:

- **Keys are shared.** A key saved in one works in the other.
- **Order a puppet:** in Characters → **+**, choose **Order a new puppet…**, describe it, and press **Send the order to Image Forge**. Image Forge opens, picks it up and makes it; the app says this takes about half an hour on this computer. The puppet appears on your shelf by itself.
- The Image Forge mark in the top bar opens it.

## Money and privacy

- **Free to use**, including for paid work. Some online services cost money (ElevenLabs, OpenAI); you pay them directly.
- **Paid voices ask first.** Before a narration buys anything, the app shows the characters and the estimated cost and waits for your yes. In **Many videos** a paid voice is refused unless you switch it on in Settings, and you can set a limit per sheet.
- **Your keys** are locked with your computer's password store and go only to the service they belong to. If the store is not available, Settings says so and the keys are kept in a local file.
- **Your script** goes only to the services you choose: the voice engine, and the AI when you ask it to write, direct or translate. Piper and LocalAI stay on your PC.
- **The video is built on your PC.**

## Where things are, updates, uninstall

Everything lives in `%APPDATA%\video-forge`: `renders\` (your videos), `media\` (downloaded footage), `fonts\`, and your encrypted keys. Paste the path into a File Explorer address bar. Shared items (keys, puppet shelf) are in `%APPDATA%\Forge\`.

- **Update:** when a newer release exists, a link shows in the top bar and in Settings. The app checks GitHub at most once a day and never installs anything by itself. Download the new installer and run it over the old one; your data is kept.
- **Uninstall:** Settings → Apps. It asks **Remove your Video Forge data as well?** Answer **No** to keep keys, settings and videos. **Yes** deletes the data folder, **including every finished video**.

## When something is wrong

- **A line has no voice.** The name before the colon matches no character. Copy the name from Characters and check accents.
- **"Key missing".** Press **Open Settings**, paste the key, **Save**, **Test**.
- **Test fails.** Wrong key, or the service is down or out of allowance. Paste again and check your account on the service's site.
- **Gemini voice stops after a few lines.** Voice-only models give 10 free lines a day. Pick a Live model or add extra Gemini keys.
- **The voice reads my direction aloud.** It is after the colon. Move it before: `Name [quietly]: words`.
- **Render stops: unknown sound.** `[SFX: name]` names no file in `sfx/library`.
- **Render stops: "pick it again".** The project names a file from another computer. Pick it again in the app.
- **Nothing to direct.** Make the narration in the Script step first.
- **Many videos skips a row.** Its script does not match your characters; fix the row and read the sheet again.
- **A Google Sheet "opened a web page".** Share it: **Anyone with the link (Viewer)**.
- **Render is very slow.** A long video or a weak PC. Use **Quick draft** first; plan on about an hour for 10 minutes on the recommended PC.
- **A voice character barely changes the voice.** Only pitch changes without a full FFmpeg. The installer ships one.

## The licence in short

**Forge Attribution License (FAL) v1.2.** The code is public to read but it is not classic open source. Free for personal, school and paid work. The one rule: every video you publish must carry a credit viewers can find, for example `Made with Video Forge - https://stravelakis.com/forge`, in the description, a pinned comment, a watermark or an end card. 3D characters and props are by Kenney and Quaternius (CC0), and the installer carries FFmpeg (GPL v3) as a separate program.

The complete manual is below: **Install**, then the **Guide**.
