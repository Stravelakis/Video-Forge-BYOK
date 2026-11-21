# Guide: Video Forge

The complete manual for Video Forge **0.4.0-beta.1**.
Someone who has never seen the app should be able to use every feature from this page alone.

Video Forge is a Windows desktop app. It makes videos where characters talk:
narrated, with subtitles, in Greek or English.
You bring your own keys for the online helpers (voices, AI, stock footage).
The video itself is built on your own computer.

New here? Read **Ideas to know first**, then **First run and keys**, then **Create**.
To install the app, see [INSTALL.md](INSTALL.md).

## Contents

1. [Ideas to know first](#ideas-to-know-first)
   - [Your first video, step by step](#your-first-video-step-by-step)
2. [First run and keys](#first-run-and-keys)
3. [The screen](#the-screen)
4. [Create: set up a video](#create-set-up-a-video)
5. [Production: make the video](#production-make-the-video)
6. [Writing scripts](#writing-scripts)
7. [Characters](#characters)
8. [Making your own puppet](#making-your-own-puppet)
9. [Voices](#voices)
10. [Look: background, subtitles, music, sounds](#look-background-subtitles-music-sounds)
11. [Post-production](#post-production)
12. [Rendering and formats](#rendering-and-formats)
13. [Many videos](#many-videos)
14. [Explainers](#explainers)
15. [The Image Forge link](#the-image-forge-link)
16. [Brand packs](#brand-packs)
17. [Projects, templates and undo](#projects-templates-and-undo)
18. [Settings reference](#settings-reference)
19. [Where your things are kept](#where-your-things-are-kept)
20. [Troubleshooting](#troubleshooting)
21. [FAQ](#faq)
22. [Licence and credits](#licence-and-credits)

---

## Ideas to know first

The few ideas you need before anything else makes sense.

| Idea | What it means |
|---|---|
| **Project** | One video job: characters, script, voices, look. Saved as one file. |
| **Speaker** | One character in the video. Each has a name, a face and a voice. |
| **Line** | One thing one speaker says. In the script: `Name: words`. |
| **Narration** | All the lines turned into speech and joined into one sound track. |
| **Render** | Building the finished video file from everything you set up. |
| **Key** | A private code from an online service. It lets the app use your account there. |
| **BYOK** | Bring your own key. The app uses your accounts; each service bills you directly. |
| **Public build** | The app anyone can download. |
| **Personal build** | The owner's own copy, with his brand packs, music and the 3D Humans. |

**What you see is what you get.**
The preview on the right is the video.
Run the same project twice and you get the same video.

**The one rule of the licence.**
Every video you publish must credit Video Forge, for example:
`Made with Video Forge - https://stravelakis.com/forge`.
More in [Licence and credits](#licence-and-credits).

### Your first video, step by step

1. **Install** the app ([INSTALL.md](INSTALL.md)) and open it.
2. **⚙ Settings:** paste a free Gemini key. Press **Save**, then **Test**.
3. **Create → Style:** pick a drawn style, for example 2D stick cutout.
4. **Characters:** click two ready-made characters to add them.
   Click each one on the right and give it a **Voice** (Gemini is free).
5. **Background:** pick **Plain colour or gradient** for a first try.
6. **Format:** pick **16:9**, then **Two people talking**.
7. **Review → Go to production →.** You land on the Script step.
8. **Script:** write four lines, each `Name: words`, using your two characters' names.
9. Press **Make the narration**. Then press **▶** on the preview to watch and listen.
10. **Make → Quick draft** to check it fast, then **Render video**. Press **Open folder** to find the file.

When you publish it, credit "Made with Video Forge - https://stravelakis.com/forge".

---

## First run and keys

### First start

1. Start Video Forge from the desktop or Start menu shortcut.
2. The first screen is **Create** (see [Create](#create-set-up-a-video)).
3. Before you make a voice or use AI, add at least one key.

### Add a key

1. Press the gear **⚙** at the top right. This opens **Settings** ("Keys and settings").
2. Find the box for the service.
3. Press **Get a key →**. The service's own page opens in your browser.
4. Copy your key there. Paste it into **Paste key…**.
5. Press **Save**. A green **saved ✓** shows.
6. Press **Test**. It makes one real call to the service and says if the key works.
7. **Clear** forgets the key. You can paste it again later.

If a message in the app says a key is missing, it has an **Open Settings** button.

### Which keys do what

Each box has a badge: free, paid, or needs approval first.

| Service | What it does in Video Forge | Cost |
|---|---|---|
| **Gemini** | Voices (free tier). Plans the background clips for each line. Translates for "Also in English / Greek". A Google AI Studio key; no Google Cloud project needed. | Free tier |
| **OpenRouter** | The Fish Audio voice (a funny foreign accent). A choice of AIs for directing, explainers and character cards. | Free models, free key |
| **Groq** | A fast AI for directing, explainer scene lists and character cards. The easiest one to start with. | Free tier |
| **NVIDIA** | Writes and polishes your script. Can direct (✨ Suggest). | Free |
| **Cerebras** | Another fast AI for explainers and character cards. | Free tier |
| **Mistral** | An AI for explainers and character cards. | Free tier |
| **OpenAI** | A paid AI for explainers and character cards. Can look at a picture to build a character. | Paid |
| **ElevenLabs** | Voices, charged per character. The app asks before it spends. | Paid |
| **Your own server** | Any AI server that speaks the OpenAI language (LM Studio, Ollama, llama.cpp and others). Save its address first, then its key, or `none`. | Your own |
| **Pixabay** | Background video clips and images. | Free |
| **Pexels** | A second source of background clips and images. | Free |
| **Freesound** | Sound effects, searched CC0-only, so nothing needs crediting. | Free, needs approval |

**A good start:** Gemini (voices and backgrounds), Groq (directing), Pixabay and Pexels (footage).
All have free tiers.

### More than one Gemini key

Under the Gemini box you can paste extra Gemini keys, one per line.
When one key's free allowance runs out, the next one is used.
**Clear extras** forgets the extra keys; the main key stays.

### Where keys are kept

- Keys are encrypted with your computer's password store. They never leave this machine,
  except to go to the service they belong to when the app calls it.
- If the password store is not available, the Settings page says so.
  The keys are then kept in a local file instead.
- Video Forge and Image Forge on the same Windows account **share their keys**.
  A key typed into one works in the other.
  The shared file is locked with Windows' own per-user encryption.
  Off Windows there is no sharing.

### Paid voices: the safety questions

ElevenLabs charges per character. A card in Settings decides how the app asks before it spends:

- Before a narration buys anything, the app shows the characters and the estimated cost, and waits for your yes.
- **Price per 1,000 characters:** your own plan's price. Only used to show the cost. Check it on the ElevenLabs site.
- **Many videos:** a paid voice is refused there unless you switch it on. A batch can run overnight with nobody to ask.
- **Limit per sheet:** the most characters one whole sheet may buy. 0 means no limit.

### Free voices on your computer

**Piper** runs on your own machine. No key, no sign-up.
It asks for folder paths instead:

- where Python is installed,
- the folder that holds your Piper voice files (files ending in `.onnx`).

Press **Scan** to list the voices it finds. Type a sentence and press **Speak** to hear one.

### Free AI models on your computer (LocalAI)

A **LocalAI** card in Settings checks for LocalAI running on this computer (in Docker).
Image Forge's puppet maker can draw with it; nothing is sent to the internet.
The address is usually `http://127.0.0.1:8080`. Press **Test**.

---

## The screen

### The top bar

| Part | What it does |
|---|---|
| Video Forge mark | This app. |
| Image Forge mark | Opens Image Forge, if it is installed (see [The Image Forge link](#the-image-forge-link)). |
| Update notice | Shows when a newer release is on GitHub. A link only; nothing installs by itself. |
| ↶ ↷ | Undo (Ctrl+Z) and redo (Ctrl+Y). |
| Recent projects | Your last few project files, newest first. |
| **New project** | Starts an empty project. It asks first if you have unsaved changes. |
| **Create** | Set up a video one decision at a time. |
| **Production** | Script, voices, final settings and render. |
| **Explainer** | Animated pictures, words and charts drawn by code, timed to a narration. |
| **Many videos** | One row of a spreadsheet per video, all made in a row. |
| **Characters** | The character creator. |
| **⚙** | Settings: keys and preferences. |

### Hover help

Rest the mouse on anything: a button, a label, a badge, a number.
A bubble says what it is, in plain words.
No mouse? Press **Tab** to reach it and the bubble shows too. **Esc** closes it.

---

## Create: set up a video

**Create** is the guided way in. Full window, one decision at a time.
Five steps along the top: **Style, Characters, Background, Format, Review.**
Click any step to go back. **← Back** never loses anything.

### Step 1. Style

How the characters are drawn. Every style is shown moving, with good and bad points.
Rest the mouse on a style to see it large. Click it to choose it and go on.
You can change it later and mix styles in one video.

| Group | Styles |
|---|---|
| **3D characters** | 3D Humans (personal build only), 3D Mini people (20 ready-made people), 3D Pets (24 animals) |
| **Drawn: clean and modern** | 2D stick cutout, Geo-minimal, Corporate flat, MBE sticker, Pop-art comic, 90s sitcom cartoon, 1950s mid-century |
| **Drawn: history and folk** | 1930s rubber hose (black & white), 1930s rubber hose (early colour), Greek vase (black-figure), Shadow puppet (1920s silhouette), Karagiozis (Greek shadow theatre), Karagiozis (black leather, cut-outs) |
| **Drawn: art materials** | Chalkboard, Paper cut-out, Risograph print, Neon glow, Noir comic, Stained glass, Ballpoint notebook doodle, Blueprint |
| **Picture puppets** | Made as pictures in Image Forge: the richest detail, the least movement |

Saved templates show at the top as **Start from a template** (see Step 5).

### Step 2. Characters

Add characters one at a time.

- **Left:** ready-made characters for the style you chose. Search by name, or filter by subject.
  Rest the mouse on one to see it large. Click to add it.
- **Right:** **In the video**: everyone added so far, with the video picture.
- Click a character on the right to change every detail of it.

Each character has six settings. A coloured dot shows where each one stands:

| Setting | What it is |
|---|---|
| 🔊 Voice | The speech engine and voice. |
| 🎨 Main colour | Their frame, sound waves and highlighted subtitle words. |
| 🎭 Demeanour | Who they are, how they behave, how much they gesture. |
| 👕 Looks | Face, body, clothes and drawing style. |
| 〰️ Sound waves | The moving waves that show when they speak, and the frame round them. |
| 📍 Place | Where they stand and how big they are. |

Red needs a choice from you. Grey is fine, but not approved yet. Green means you approved it.
The step's number shows how many red settings are left.

### Step 3. Background

Where your characters are. Pick a way, then rest the mouse on anything to see it behind your characters.

| Way | Good | Watch out |
|---|---|---|
| 🎞️ **Stock video** | Real footage from Pixabay and Pexels. Can pick a clip for every scene of your script. | Needs the script first for automatic picks. Can feel generic. |
| 🏛️ **Sets drawn by code** | News desk, podcast, game show, stage, meeting, Supreme Court. Describe a new one and the AI draws it. Seats your characters. | Walking is switched off in a set. |
| 🖼️ **Paintings & materials** | 44 very famous paintings. 214 walls, woods and fabrics. | Still pictures. |
| 🧱 **Kenney 3D rooms** | Matches the 3D characters. Describe a room and the AI furnishes it. | Toy-like. Still pictures. |
| ✨ **AI-made (Google Flow)** | Any place you can describe. The AI writes the prompts. | You make them in Flow, then bring them back. Uses Flow credits. |
| 📊 **Presentation** | PDF, PowerPoint, Google Slides or pictures. Each slide whole, one after the other. | PowerPoint needs LibreOffice, or save as PDF. |
| 🎨 **Plain colour or gradient** | Clean, fast, keeps attention on the characters. | Plain. |

Also here:

- **✨ Make a picture:** describe a place and a picture is made for you, free, in your style.
- **Your own picture:** use a picture from your computer.
- **Open Image Forge:** make a picture there, then bring it in with Your own picture.
- **Clear backgrounds:** removes every background from this video.

**The Google Flow helper**, step by step:

1. **Choose the look.** "Match" uses your characters' style.
2. **Describe the place.** A mood is optional.
3. **✨ Generate.** The AI writes a picture prompt (uses your AI keys).
   **Copy picture prompt**, then **Open Google Flow ↗**, follow the short steps shown, and download the picture.
   Then press **⬇ Bring in the picture**.
4. **Make it move?** Say yes and the AI suggests what could move in this picture.
   Tick two or three. Press **✨ Write the loop prompt**.
   In Flow, use your picture as the first **and** the last frame: that makes it loop without a jump.
   Then press **⬇ Bring in the clip**.

### Step 4. Format

What kind of video it is. First pick the shape: **9:16** (tall), **16:9** (wide), **1:1** (square), **4:5** (feed post).
Then a format. Each one is shown as a picture made of **your** characters and background.

| Group | Formats |
|---|---|
| One person talking | Talking head, Whole-body narrator, Storyteller, Big words, Ad |
| People talking together | Two people talking, Interview, Big faces, Mini drama |
| Shows and sets | Podcast studio, Podcast split, News desk, Office meeting, Talk on stage, Game show |
| Other kinds of video | Explainer, Many videos |

### Step 5. Review

Everything chosen so far, with **Change** next to each.

- **Still needs you:** settings that need a choice before the video can be good.
- **Save as a template:** name it and press **Save template**. It shows at the top of step 1 next time.
- **Go to production →** opens [Production](#production-make-the-video) at the Script step.
  (The Explainer and Many videos formats open their own screens.)

---

## Production: make the video

**Production** has five steps down the left side.
The one you are on opens in place. The preview stays on the right in every step.
Under each step, one line says what is done so far.

| Step | Title | What you do there |
|---|---|---|
| 1 | **Characters** | Who speaks: face, voice, colours, place. |
| 2 | **Script** | What they say. Make the narration. |
| 3 | **Direct** | Who moves, where, when, and where the camera looks. |
| 4 | **Look** | Templates, background, subtitles, music, sounds, motion. |
| 5 | **Make** | Preview, render, the extras. |

The steps column can fold to its numbers, to give the preview more room.

### The preview

- **▶ Play** (or the space bar) plays the video with its voices and music.
- Drag the bar to jump to any moment.
- The **timeline strip** shows who speaks when (top, in their colour) and the background clips (bottom).
- Drag a character on the preview to move them. They snap to a grid.

### Step 1. Characters

The people who talk in your video. Each has a face and a voice.
Press **+** to add a speaker. Details are in [Characters](#characters) and [Voices](#voices).

Per speaker:

- **Name:** what you write in the script before their lines.
- **Kind:** drawn character, picture puppet, 3D character or talking portrait.
- **Voice:** engine, voice, speed, pitch, voice character. **▶** hears a test sentence.
- **How much they gesture:** how often hands move by themselves. None means only when the script asks, like `[waves]`.
- **Sound waves:** style, colour, where they sit.
- **Place:** **Size**, **Across** (0% left to 100% right), **Down** (0% top to 100% bottom). Or drag on the preview.
- **Facing:** which way they look. Auto turns them towards the other speaker.
- **Save to library:** keeps this character (face, voice, colours, sound waves) for other videos.

### Step 2. Script

1. Pick the **Language**: Greek or English.
2. Write the script, one line per speech: `Name: words`. See [Writing scripts](#writing-scripts).
   - **Start from:** a skeleton for the kind of video, with your speakers' names filled in. «…» marks where your words go.
   - **Write a draft:** say what the video is about (and a mood, if you like). The AI writes a first script with your speakers.
3. Lines with a name no speaker has are marked. Change the name, or remove the line.
4. Press **Make the narration**. Every line is made with its speaker's voice, checked, and joined.
   Free voices take about 10 to 20 seconds a line.
5. The lines list shows every line with its time. **▶** plays one line. Click a line to move the preview there.
   **Remake** makes only that line again. The other lines keep their sound.

**Pauses:** **Breath** is the short pause when the same person says two lines in a row (default 0.12 s).
**Turn pause** is the pause when the next person starts (default 0.34 s).
A speaker can have their own breath in Characters → Voice.

### Step 3. Direct

Directions are actions placed on a word: walk in, turn, camera shot, feeling.
Make the narration first: directions sit on the words as they are spoken.

- Click a word. The next direction you add happens on that word.
- Find an action, or type your own and press Enter.
- **✨ Suggest:** the AI suggests walks, turns, camera shots and feelings for every line you have not directed yourself.
  Pick which AI (**Auto** tries your saved keys, best first) and tell it the tone, or leave it empty.
- **Remove suggestions** removes only the AI's. **Clear all** removes every direction.
- If you change a line's words afterwards, its old directions are set aside.

### Step 4. Look

Tabs: **Templates, Background, Subtitles, Music, Sounds, Motion.**
See [Look](#look-background-subtitles-music-sounds).

### Step 5. Make

Tabs: **Render, Many videos, Intro & outro, Shape.**
See [Rendering and formats](#rendering-and-formats).

---

## Writing scripts

### The one rule

**One line per piece of speech, in the form `Name: text`.**

```
Maria: Good morning! Today we talk about chocolate and dogs.
Maria: Chocolate is poison for your dog.
Nikos: Even a little?
Maria: Even a little.
```

If you get this right, you have a working script.

### The name has to match

The name before the colon must be the **same** as the speaker's name in Characters.

- Capital letters do not matter. `ΚΑΊΤΗ` matches `Καίτη`.
- Spelling and accents do. `Καιτη` does **not** match `Καίτη`.
- Latin letters do not match Greek ones. `Kaiti` does **not** match `Καίτη`.

Copy the name from the Characters step rather than typing it.
A line whose name matches nobody has no voice to say it.

A speaker can have **aliases**: other spellings that also match (set in a character or brand-pack file).

### What each line becomes

One line is one **segment**. Everything is built from segments:

- a piece of **spoken audio**, in that speaker's voice;
- one or more **subtitles**, wrapped to fit;
- a **scene**, which gets one background clip;
- **which mouth moves**, and when.

**Short lines cut faster.** Six short lines give six background changes; two long lines give two.

### Pauses and pacing

You do not write pauses. The app puts them in (see Breath and Turn pause above).
Blank lines do nothing, so do not use them for spacing.
For a pause **inside** a line, use punctuation: a comma, a full stop, an ellipsis.

### Punctuation is acting

Punctuation drives three things:

1. **The voice:** pauses, and a rising tone on a question.
2. **The eyebrows:** `?` raises them. `!` sharpens them.
3. **The head:** a question tilts it. `!` gives a small shake. `...` lets it droop.

So `Even a little?` and `Even a little.` are different lines. Write the punctuation you want performed.

### Length and timing

- Subtitles wrap at about **42 characters** per line by default (Look → Subtitles → Line Length).
- Rough planning figure: **15 characters of Greek ≈ 1 second** of speech.
  A 60-second video is near 900 characters. The real timing comes from making the narration.

### Language

The Language setting is one choice for the whole script.
You cannot mix Greek and English lines in one video and have both read well.
For both languages, make two videos, or use **Also in English / Greek** at render time.

**Greek without accent marks is fine.** The app adds the missing tonos before the voice speaks.
Subtitles keep your spelling.
If a word still sounds wrong, add it to **Settings → Say it like this**: the word as written, and how to say it.

### Feelings the voice performs

Square brackets inside a line are acted, never read out: `[laughs]`, `[whispers]`, `[sighs]`.

```
Maria: [laughs] I did not see that coming.
```

A laugh is acting, not a sound effect.

### Stage directions for one line

A direction can go in square brackets **before** the colon:

```
Maria [quietly, like a secret]: Do not tell anyone.
Nikos [in a hurry]: We have no time.
```

**Before the colon, never after.** Everything after the colon is spoken.
Voices that understand directions use it; others ignore it and still say the right words.
Use it only when the delivery is not obvious from the words.

### Sound effects

A bark is not speech. Writing `Woof!` makes a voice say the word.
Cue a recording on its own line:

```
Maria: Press the clicker the moment he sits.
[SFX: clicker-training]
Nikos: The moment. Not two seconds later.
```

- **These cue lines work only in batch runs from the command line (`--job`).** In the app the line is skipped. To add a sound in the app, use Look → Sounds.
- In a batch run the name is a file name (without its ending) in the `sfx/library` folder, which the public download ships empty. An unknown name stops that render.
- The sound plays at the start of the line below it.

### Moves for drawn and 3D characters

A character acts out a move tag inside its line:

```
Maria: [walks in] Good morning!
Nikos: [pounds the table] Enough!
```

- The move starts with the line.
- A style word changes how it looks: `[walks in tired]`, `[waves shyly]`.
- A prop goes in the hand: `[drinks his coffee]`.
- A name makes it a move with someone else: `[gives the flowers to Maria]`.
- Hands also move by themselves: a question gets a shrug; "this", "here" or "look" gets a point.
  Set how much in Characters → **How much they gesture**.

Every tag is listed in [MOVE-TAGS.md](docs/MOVE-TAGS.md), made from the motion library.
Moves marked 🎥 there are copied from real recorded movement.

### Pop-ups

A pop-up is an animated icon that pops up beside the speaker:

```
Maria: That is a [pop red flag] if I ever saw one.
Nikos: [🎉] We did it!
```

Use `[pop <name>]`, or an emoji in brackets. There are 52 code-drawn icons.

### English for machines, Greek for ears

Only the spoken words are Greek.
The name, the stage direction, the sound cue and the move tags are English, because machines read them.

```
Kaiti [quietly, like a secret]: Μην το πεις σε κανέναν.
[SFX: doorbell]
```

(Some move tags have Greek forms too, such as `[χαιρετά]`. See MOVE-TAGS.)

### Writing in a spreadsheet

For [Many videos](#many-videos), one row is one video.
Put the whole script in one cell. Break lines with **Alt+Enter** (Excel and Google Sheets).
A plain Enter moves to the next row and splits your video in two.
Keep speaker names identical in every row.

### A worked example

A 30-second warning video, two speakers:

```
Maria: Do you know what is more dangerous than you think?
Nikos: What?
Maria: Chocolate. It is poison for dogs.
Nikos: Even a little?
Maria: Even a little. It depends on the dog's weight.
Maria: If he eats chocolate, do not wait. Call the vet at once.
```

- **Six lines, six scenes:** six chances for the background to change.
- **Short questions for the second speaker** pass the camera back and forth.
- **Questions end in `?`** (Greek: `;`), so both voice and eyebrows ask.
- **The last line is two sentences:** a beat before the instruction.

### Checklist before you make the narration

- [ ] Every line is `Name: text`
- [ ] Every name matches a speaker exactly
- [ ] The Language matches the script
- [ ] Every speaker has a voice
- [ ] Questions end in `?` (English) or `;` (Greek)
- [ ] No blank lines used as spacing

---

## Characters

Four kinds of speaker. One video can mix them.

| Kind | Made by | Moves | Best for |
|---|---|---|---|
| **Drawn character** | The app draws it as it plays, in any drawn style | Walks in and out, sits, jumps, dances, waves, holds things | Stories, drama, anything that moves |
| **Picture puppet** | Pictures, usually from Image Forge | Talks, blinks, a few arm poses; walking is a bob | Rich detail: Pixar-like, clay, photo, anime |
| **3D character** | Kenney's 3D models | Moods, motions, props in hand | Toy-like 3D, pets |
| **Talking portrait** | One framed illustrated picture | Mouth, eyes and brows move with the voice | A portrait that speaks |

### Adding a speaker (Production → Characters → +)

The **+** menu shows every character with a live face (it blinks, and talks when you hover):

- **Ready-made:** characters from a brand pack, voice and all.
- **Made in Image Forge:** puppets Image Forge made on this computer.
- **My library:** speakers you saved with **Save to library**.
- **Order a new puppet…:** describe a new puppet. Image Forge makes it and it arrives on the shelf by itself.
- **Open Image Forge:** make the puppet yourself there (Wizards → Make a puppet).
- **From a character file…:** one person from their own file: face, usual outfit, main colour and voice. The file is not changed.

**The puppet shelf:** delete is two clicks. A deleted puppet is moved to `%APPDATA%\Forge\puppets-deleted`, not erased.

### Picture puppets

In Characters → **Puppet**:

- **Choose face…** picks a puppet file (`.rig.json` or `.puppet.json`). **Change face** swaps it.
- Frame shape, frame line, and the fill colour behind the face.
- A full-body puppet made in Image Forge with "Also sitting" can sit down.

### Drawn characters

Drawn by the app, frame by frame, in any of the 21 drawn styles.
The same character works in every style.

- **Swap the drawing** for a ready-made character, then change anything. Name and voice stay.
- **Dress as…:** a whole costume in one click (wizard, knight, vet, Santa, pirate and more). Face, skin and voice stay.
- Switch a speaker between drawn and puppet at any time; the other one is kept.

### 3D characters

3D characters by [Kenney](https://kenney.nl) (CC0).

| Set | In the public build | What it has |
|---|---|---|
| **3D Mini people** | Yes | 20 chunky people, about 30 simple motions, hold props |
| **3D Pets** | Yes | 24 animals; ears, tails and wings show the mood; carry things in the mouth |
| **3D Humans** | **No**, personal build only | Real elbows, knees and fingers; 349 motions. Their motions come from a library that cannot be shared. |

In the public build, 3D Humans tiles are greyed with the note "In the personal build only."
A 3D Humans speaker in an old project shows that note; a render skips them with a warning.

Props: 28 by Kenney, 5 by Quaternius (CC0), 9 made for Video Forge.

### Talking portraits

A whole framed picture that talks. Its mouth, eyes and brows move with the voice.
In Characters → Puppet, press **Portrait…** and pick a file ending in `.portrait.json`.
A portrait wins over the face and the drawn character. **Remove portrait** goes back.
No portraits ship with the public download.

### The character creator (Characters, top bar)

Each of your characters, part by part.

- **Locks:** a locked part never changes. The randomiser and the AI leave it alone.
- **Randomiser:** new ideas for the unlocked parts.
- **Outfits** and **marks**: tattoos, scars, freckles, moles. Eye quirks.
- **AI box:** describe a change in plain words. It changes only unlocked parts, and you see it before keeping it.
- **Undo** (Ctrl+Z) and **Redo** (Ctrl+Y). You can throw away unsaved changes and go back to the saved file.
- Moving previews show each change at once.
- Each character is its own file, in a brand's `characters` folder (`brands/<brand>/characters`).
- If the character is already in your video, every change shows there at once.

---

## Making your own puppet

The public download has no picture puppets of its own.
Make one in Image Forge (easiest), or build one yourself with the tools below.
The command-line tools named below (`make-rig-puppet`, `make-puppet`, `build-puppet-cells`, `build-viseme-sheet`, `merge-mouth`, `slice-grid`, `viseme-coverage`) are **not included in this release**: the method here still describes how a puppet is built, but the commands cannot be run from this download.

**Short answer:** draw one portrait with a resting face on a flat magenta background.
Cut the mouths, brows and eyelids out as separate pictures.
Write down where each one sits. Run one command.
You get a `<name>.rig.json` the app loads with **Characters → Puppet → Choose face…**.

| Route | You make | Command | You get | Use it when |
|---|---|---|---|---|
| **Rig** (recommended) | 1 portrait + cut-out parts + `placement.json` | `tools/make-rig-puppet.mjs` | `<name>.rig.json` + `rig/<name>/` | You can cut layers in any paint program |
| Layered puppet | parts + a spec file with head-relative offsets | `tools/make-puppet.mjs` | `<name>.puppet.json` | You have layers with no positions |
| Viseme sheet | nine whole faces, one per mouth shape | `tools/build-viseme-sheet.mjs` | one 3×3 PNG | You only have finished faces |

**Where it goes:** your own puppets in `puppet/`; a brand pack's in `brands/<pack>/puppet/`.
A puppet file finds its pictures relative to itself, so move the JSON and its art folder together.

### Route 1: the rig

**Folder layout:**

```
my-art/
  base/
    robin.png               the full portrait
  layers/
    robin/
      placement.json        where each part sits on the portrait
      mouth_AH.png
      mouth_EE.png
      ...
```

**Rules that matter more than drawing skill:**

1. **Flat magenta background, exactly `#FF00FF`**, on the portrait and every part.
   The tool makes magenta see-through and cleans the pink edge. Pink clothes are safe.
2. **Head, neck and shoulders**, facing the viewer, head roughly centred.
3. **The portrait has the resting face**: mouth closed, eyes open, calm brows. Parts are only the changes.
4. **Every part is cut from a canvas the same size as the portrait.**

**The parts, by file name.** Only `lid_closed` (or `lid_half`) is close to required: the tool uses it to find the eyes and frame the head.
A missing part is reported when you build, and simply not drawn.

| File | What it is | Shown when |
|---|---|---|
| `mouth_AH.png` | jaw dropped, "ah" | open vowels |
| `mouth_EE.png` | lips wide, "ee" | e / i sounds |
| `mouth_OH.png` | round "oh" | o sounds |
| `mouth_OO.png` | small tight circle, "oo" | u sounds |
| `mouth_FV.png` | top teeth on lower lip | f / v |
| `mouth_L.png` | tongue up behind the teeth | l |
| `mouth_CHSH.png` | lips forward, "sh" | sh / ch |
| `mouth_SMILE.png` | closed smile | resting on a happy line |
| `brow_happy`, `brow_serious`, `brow_raised`, `brow_worried`, `brow_confused` | both brows in one picture | moods and punctuation |
| `lid_half`, `lid_closed`, `lid_wide` | eyelids | blinks, sleepy, surprised |

"M/B/P" and the resting mouth are the portrait's own closed mouth: no file.

**`placement.json`:** where each part sits, in pixels of the portrait (`x`, `y` = top-left corner; `w`, `h` = size).

```json
{
  "size": { "w": 2048, "h": 2048 },
  "base": "robin.png",
  "layers": {
    "mouth_AH":   { "x": 930, "y": 1210, "w": 190, "h": 160 },
    "brow_happy": { "x": 760, "y": 690,  "w": 530, "h": 120 },
    "lid_closed": { "x": 790, "y": 820,  "w": 470, "h": 110 }
  }
}
```

Most paint programs show a selection's x, y, width and height. Names are the file names without `.png`.

**Build it:**

```bash
node tools/make-rig-puppet.mjs my-art robin
node tools/make-rig-puppet.mjs my-art robin --wide     # optional zoomed-out copy
```

Several at once: `robin wren finch`. Output goes to `puppet/` unless you add `--out <folder>`.
The command lists every part it used and any name it did not recognise. Read it: a typo means a mouth that never moves.

**Check it:** render a short line that uses every mouth, for example
"Oh, I see: five fresh fish, all lovely, sure!"

| You see | Cause | Fix |
|---|---|---|
| A pink rim | background not exactly `#FF00FF` | refill with pure magenta |
| A mouth floats off the face | wrong numbers in `placement.json` | re-measure that part |
| The face is tiny in its circle | no `lid_closed` / `lid_half` | add one |
| A straight cut across the shoulders | portrait cut off too high | draw more shoulder |

### Route 2: layered puppet from a spec

For parts exported without positions (Photoshop "Trim Layers").
Write a `<name>.spec.json` placing each part relative to the head, then:

```bash
node tools/make-puppet.mjs puppet/robin.spec.json puppet/robin.puppet.json
```

Offsets are in head widths from the head centre. Slower to tune than the rig.

A related tool, `tools/build-puppet-cells.mjs`, composites layered parts into the nine faces of a viseme sheet.
One placement per group (mouth, eyes, brows, nose) is enough when every mouth was drawn in the same place.
Anchor mouths by **top-centre**: the upper lip barely moves while the jaw drops.
Layers can be tinted with `saturation`, `hue` and `lightness`, so one mouth set can serve several characters.
Tip: if you re-export from Photoshop, untick "Trim Layers" and every part keeps its position.

### Route 3: viseme sheet (nine whole faces)

One PNG, **3072 × 3072**: a 3 × 3 grid of nine **1024 × 1024** faces.

| | Column 1 | Column 2 | Column 3 |
|---|---|---|---|
| **Row 1** | `0` NEUTRAL | `1` AH | `2` EE |
| **Row 2** | `3` OH | `4` OO | `5` MBP |
| **Row 3** | `6` FV | `7` L | `8` CH_SH |

Name finished faces `<name>_<index>_<LABEL>.png`, then:

```bash
node tools/build-viseme-sheet.mjs my-faces viseme-sheets
```

Missing cells are filled from the nearest shape and reported.
The Characters step has no button to pick a sheet in this version.
TODO: say how a finished sheet is attached to a speaker.

**The three rules:**

1. **The head must not move between cells.** Same size, place and angle in all nine. Drift reads as the head jerking.
2. **Same framing in all nine:** head, neck, a little shoulder.
3. **Flat, solid background.** A very dark charcoal blends into the video's own dark backdrop.

**Ways to make the faces with an image AI:**

- **Best: inpaint only the mouth.** Mask the mouth on the NEUTRAL face and regenerate only that.
  `node tools/merge-mouth.mjs <neutral> <variant> <out>` puts the changed mouth back with a soft edge.
  It refuses if more than a quarter of the picture changed (a sign of a fresh generation).
- **Faster: one picture with every mouth side by side**, then cut it:
  `node tools/slice-grid.mjs strip.png robin --cols 5 --order 0,1,2,3,7`.
- **Reliable: one at a time.** Make NEUTRAL first, use it as the reference, and change only the mouth sentence each time.
  Expect to re-roll FV and L.

**Five faces instead of nine.** For Greek, draw `0` NEUTRAL, `1` AH, `2` EE, `3` OH and `7` L.
On a Greek sample these keep about 94% of the mouth movement. OO is worth almost nothing in Greek; L matters a lot.
For another language, measure with `node --experimental-strip-types tools/viseme-coverage.mjs`.

**Prompt lines for each mouth.** Start with: "Exactly the same character, same head size, position, angle, lighting and background. The ONLY difference is the mouth shape." Then add:

| # | Name | Mouth line |
|---|---|---|
| 0 | NEUTRAL | Mouth closed and relaxed, lips gently together. |
| 1 | AH | Mouth wide open, jaw dropped low, as in "father". |
| 2 | EE | Lips stretched wide and flat, upper teeth slightly visible, as in "see". |
| 3 | OH | Lips rounded into a clear open O, as in "go". |
| 4 | OO | Lips pursed into a small tight circle, as in "boot". |
| 5 | MBP | Lips pressed firmly together, mouth closed. |
| 6 | FV | Upper front teeth resting on the lower lip. |
| 7 | L | Mouth partly open, tongue tip raised behind the upper teeth. |
| 8 | CH_SH | Lips pushed forward into a soft square, teeth close together. |

For animals, say "the snout and muzzle form this shape".

### Giving the puppet a voice

The puppet is only the face. In Characters the same speaker also takes:

| Field | What to put |
|---|---|
| Opening phrase | How the script introduces them, for example "A cheerful man". |
| Reference clip | A short `.wav` of the voice, for voice engines that copy a voice. |
| Outline colour | Also their waveform colour. Give each character a different one. |

To ship a character ready-made with all that, put it in a brand pack's `cast` list (see [Brand packs](#brand-packs)).

---

## Voices

### Voice engines

Pick one per speaker in Characters → **Voice**.

| Engine | Cost | What it is like |
|---|---|---|
| **Gemini** | Free | Acts, many languages. **Live** models are free with no daily limit. **Voice-only** models sound a little better, but only 10 lines a day are free. Choose a Google voice: male or female, then Google's description. |
| **Fish Audio** | Free (OpenRouter key) | A funny foreign accent. |
| **ElevenLabs** | Charged per character | A paid voice. The app shows the cost and asks first. |
| **Piper** | Free, offline | Runs on your computer. Correct and flat. Good for checking timing. |
| **DramaBox** | Retired | Dropped on 10 Oct 2026. Old projects that used it fall back to Gemini. |

With Gemini, `[laughs]`, `[whispers]` and `[sighs]` inside a line are acted.
Each line is checked word by word and made again if it drifts from the script.

### Per-speaker voice settings

- **Starting point:** a ready-made set of voice settings. Fine-tune after.
- **Speed:** 1× is as the voice made it.
- **Pitch:** higher or lower, without changing speed.
- **Breath:** this speaker's own pause between two of their lines.
- **Let the app add expression:** gives a mood to lines that have none written in, so the voice is not flat.
- **▶ Test the voice:** type a sentence and hear it.
  Paid or rented voices are never spent on a test: make the narration to hear those.

### Voice characters

A voice character changes the **sound** of a voice after it is made.
It cannot change the acting: feelings and timing come from the voice itself.
Set it per speaker in Characters → **Voice → Voice character**. You hear it in the voice test too.

| Preset | What it does |
|---|---|
| **Natural (off)** | The voice exactly as made. |
| **Chibi / bubbly** | Higher and smaller, like a cartoon. |
| **Bright and young** | A little younger and clearer. |
| **Warm narrator** | Calm and close, like an audiobook. |
| **Deep and dramatic** | Big and serious, like a trailer. |
| **Radio** | An old radio or phone. |

On top of the preset, three sliders:

- **Pitch:** up or down, in musical steps (−4 to +4). Same speed.
- **Brightness:** darker and softer, or clearer and more forward.
- **Sparkle:** air and shine at the very top. A little goes a long way.

Changing the "throat size" needs a full FFmpeg. The installer ships one.
Without it, a pitch change also moves the throat size (see [Troubleshooting](#troubleshooting)).

### How the mouths follow the voice

- Nine mouth shapes per character. Each one is a viseme.
- Shapes are held about 100 ms. Look-alike shapes merge in fast speech. Quick consonants are skipped. Short vowels half-open.
- Lips and subtitles follow the same word timings.
- Word timings: the voice engine gives each line's start and end.
  The app spreads the words over that time by length, then corrects at every pause it can hear.
  Close, not frame-perfect.

---

## Look: background, subtitles, music, sounds

Production → **Look** has six tabs.

### Templates

- **Templates:** ready-made looks. One click restyles the video.
- **Your presets:** name your current look and **Save**. Click one to use it again.
- **Share the look as a file:** **Export…** and **Import…**.
- **Project:** **Save project…**, **Open project…**, and **Sample project** (when a brand pack is on).

### Background

The same ways as [Create, Step 3](#step-3-background), plus:

- **Stock video:** clips from Pixabay and Pexels. With a Gemini key the app can plan a clip for every line.
- **Dim**, **blur** and **colour look** for the background.
  While the video has no background yet, the newest downloaded clip stands in so you can judge them.
- **Crossfade** between clips.

### Subtitles

- **Show subtitles** on or off.
- **One-click caption styles:** Bold box, Karaoke, One word, Clean outline, Lesson bar, Forge sweep, Comic burst, Ink drop.
- **Words shown:** the whole line, only the words said so far, or one big word at a time.
- **Active word takes the speaker's colour**, and **Keep said words coloured** (like karaoke).
- **Glow Strength**, **Outline**, **Text Size**, **UPPERCASE**, **Line Length** (most letters per line).
- The font, the colours, and where the subtitles sit.
- Before any narration exists, a sample line shows in Greek and English taking turns, so you can judge the font in both alphabets.

### Sound waves

The moving waves that show who is speaking. Set per speaker (Characters → Sound waves).

- **Styles:** bars, wave, mirror, dots, ribbon, particles, sparks, bloom bars, boiling, centre bar.
- **Where:** around the face, around the video frame, in a circle, or along the top, bottom, left or right edge.
- **Colour:** the speaker's main colour.
- Full-body characters start with their waves off.

### Music

- **Library:** music that comes with the app. The public download has none; the personal build adds the owner's.
- **Pick a file** from your computer.
- **Volume**, and **ducking**: the music gets quieter while someone talks, then comes back.
- **Music sound waves:** a moving picture that dances to the music, with its own colour.

### Sounds

Sound effects placed by time:

- **Freesound, CC0 only:** type the sound in English ("dog bark") and press Enter. Needs a Freesound key.
  CC0 means anyone may use it for anything, no credit needed.
- **Add from disk:** a sound file from your computer.
- Each sound has a time (seconds from the start) and a volume.

`[SFX: name]` lines in the script work only in batch runs (see [Sound effects](#sound-effects)).

### Motion

- **Idle Motion:** how much characters gently breathe and sway when still. 0 = frozen.
- **Mouth blending:** how smoothly one mouth shape melts into the next. 0 = sudden jumps.

---

## Post-production

What happens to the video after the pictures are made.
It runs by itself on every render, including Many videos.
Find it in Make → Render, under the render buttons.

| Part | What it does | Default |
|---|---|---|
| **Studio sound** | Cleans the voices: less rumble, even loud and quiet words, softer sharp S sounds. Then sets the loudness YouTube and TikTok expect (−14 LUFS, peaks under −1 dB). Music and effects are not touched. | On for new projects |
| **Voices left and right** | Each voice leans a little to the side its speaker stands on (or their seat in a set). The far side gets at most 30% quieter; the near side never gets louder. Needs two or more speakers. | Off |
| **Swear words** | Greek and English swear words, four ways: **No clean-up**, **Bleep** (a beep over the word), **Mute** (silence over it), or **Softer word** (the voice says a milder word, like shit → shoot). Bleep and Mute also star out the subtitles (`f***`). Click a word in the list to let it through in this project; add your own in the box as `word = softer word`. | No clean-up |
| **Colour grade** | A colour look for the finished picture: a LUT file (`.cube`) from a colour pack, plus **contrast** and **colour strength** (0 = black and white). No LUT files ship with the app yet. | Off |

Good to know:

- Studio sound works on the narration lines. A sound file attached by hand is left alone.
- The grade shows in the rendered video, not in the preview. Intro and outro cards are left as they are.
- The grade costs one extra pass over the video at the end.
- Projects saved before post-production existed open with all of it off.
- **Softer word** changes what the voice says, so make the voices again after turning it on. Until then the words are bleeped, and the render says so.
- A `*` at the end of a word means every word that starts like it: `damn* = darn*` turns *damned* into *darned*. Capitals and Greek accents don't matter.
- The bleep is placed from when each word is said. With measured word times it sits on the word; otherwise it is placed from where the voice is heard in the sound, so it can be a little wider than the word.
- Each speaker's voice character is set in Characters → Voice (see [Voice characters](#voice-characters)).

---

## Rendering and formats

Production → **Make**.

### Render

- **Length:** the video is exactly as long as the narration. Nothing to set by hand.
- **Quick draft:** small (a third of the size), 3 pictures a second, full sound. Ready fast, and opens by itself.
- **Render video:** the finished video, full quality.
- **Also as:** tick more shapes. They are made one after another. Your project's own shape is always made.

| Shape | Size | For |
|---|---|---|
| **Tall 9:16** | 1080 × 1920 | TikTok, Instagram Reels, YouTube Shorts |
| **Square 1:1** | 1080 × 1080 | Instagram and Facebook feeds |
| **Portrait 4:5** | 1080 × 1350 | What Instagram's feed shows biggest |
| **Wide 16:9** | 1920 × 1080 | YouTube, websites, presentations |

- **Also in English / Greek:** a second copy in the other language. The script is translated, the same characters speak it, and the subtitles match. Uses your Gemini key.
- **Made with Video Forge:** a small label in a corner, on by default. It is also written into the file's own notes.
  It helps viewers trust the video, and EU rules ask for AI videos to be marked.
- The button counts the videos: tick two shapes and the other language and it says **Render 6 videos**.
- **Stop** ends the render. What is half made is thrown away; the narration is kept.
- When it is done: **Play it** and **Open folder**.

**What you get:** the `.mp4`, plus `.srt` and `.vtt` subtitle files beside it.

### Shape (Make → Shape)

- Pick where the video is going; it sets the shape and smoothness for you.
- **Pictures per second:** more is smoother, but a bigger file and a slower make.

### Intro & outro (Make → Intro & outro)

- A short clip before your video starts, and one after it ends.
- **Logo:** a small picture on top of the whole video, with **Logo size**, **Logo opacity** and **Distance from edge**.

### How long it takes

A rough guide: about one hour of rendering for a 10-minute video,
on the recommended machine (NVIDIA graphics card with 8 GB, 32 GB of memory).

---

## Many videos

One row of a spreadsheet makes one video. Your characters and look stay the same; each row brings its own script.
Open it from the top bar (**Many videos**), or from Make → Many videos → **Open Many videos**.

1. **Set up the look first** in Production: characters, background, subtitles. Every video uses them.
   **Change the characters or the look** takes you there; come back after.
2. **Read a sheet.** Paste a Google Sheet link, or use **Or pick a CSV file**.
   - Google Sheet: **Share → Anyone with the link (Viewer)**, then copy the link. No keys needed.
   - CSV from Excel: **File → Save As → CSV UTF-8**.
   - **Get a blank sheet:** an empty sheet with the right columns and one example row.
3. **Check the videos.** Every row's script is matched against your characters.
   Rows marked **Not ready** are skipped until fixed. Fix them in the sheet and read it again.
4. **Make** every ready row, one video at a time. Progress shows for each video.
   **Stop after this one** finishes the current video, then stops.

**The columns.** Only `script` is required. Other names people type work too.

| Column | Also accepted | What it is |
|---|---|---|
| `name` | title, video, file, όνομα | What to call the finished file. |
| `script` | text, σενάριο | The lines, one per line, `Name: words`. |
| `topic` | about, θέμα | A few words about the video, used to pick background clips. |
| `template` | look, preset | A look to use, for example "News desk". Empty = this project's look. |
| `format` | shape, orientation | 9:16, 16:9, 1:1 or 4:5. |
| `music` | μουσική | `auto` picks one; `none` leaves it out. |
| `backgrounds` | background, footage | `auto` picks them; `none` leaves them out. |
| `language` | lang, γλώσσα | `el` for Greek, `en` for English. |

The videos go into a folder named `<sheet> · <date> · <n> videos`.
Post-production runs on every video. Paid voices are refused unless allowed in Settings (see [Paid voices](#paid-voices-the-safety-questions)).

---

## Explainers

Animated pictures, words and charts drawn by code, timed to a narration.
With or without puppets on top. Open **Explainer** in the top bar.

1. **What the explainer says:** type or paste it, or press **Use this project's narration**.
2. **Write the scenes:** the AI turns it into a scene list. It needs an AI key; Groq or Gemini work well and have free tiers.
   Other ways: **Hand to Claude** (copy a prompt, then **Load Claude's page**), or **Write it with my key (experimental)**.
3. **Style:** colours (background, accent, tint), font (any Google Fonts family, downloaded once), and shape.
   **Import a style from the AI Style Atlas:** paste a style's Copy prompt from Futurepedia's AI Style Atlas.
4. **Check every frame**, then **Render the video**. Choose where to save.

Extras you can tick:

- Small sounds: a swish when the scene changes, a pop when something appears.
- Chapter lines for the video description (YouTube needs 3 or more chapters of 10 s).
- A GIF of part of the video (up to 15 s, 540 px wide).
- A short MP4 clip for social posts.
- Caption files from the narration's word times.
- A `.spots.json` file that says where each puppet face should go on top.

**Scene list (advanced)** shows the raw scene list. If it has problems, they are listed and nothing shows until they are fixed.

---

## The Image Forge link

[Image Forge](https://github.com/Stravelakis/image-forge) is the sister app. It makes pictures and puppets.

- **Open it:** the Image Forge mark in the top bar, or **Open Image Forge** in the Characters and Background steps.
  The app looks for Image Forge in its normal install place (`%LOCALAPPDATA%\Programs\Image Forge`).
- **Order a puppet:** in Characters → **+**, choose **Order a new puppet…**, describe the character and press **Send the order to Image Forge**.
  Image Forge opens, notices the order within about 20 seconds, makes the puppet, and it lands on your shelf by itself.
- **A drawn character can become an order:** the order opens already filled in from the drawing. Check the words, then send it.
- **Shared keys:** a key saved in one app works in the other (Windows only).
- **The shelf** lives in `%APPDATA%\Forge\`: `puppets\` (finished), `orders\` (requests), `puppets-deleted\` (removed, not erased).

---

## Brand packs

A brand pack is everything that belongs to one creator: characters, sample project, intro and outro clips, banners, logo, series presets.
It lives in `brands/<name>/`. The app shows none of it until a computer switches that pack on.
A fresh install is neutral. The public download has no brand packs.

Switch packs from a terminal in the app's source folder:

```bash
npm run brand                  # which pack is on, and which exist
npm run brand -- <name>        # switch a pack on (restart the app)
npm run brand -- off           # back to neutral
```

The switch is a small file, `brand.local.json`, beside `package.json`. It is never committed.

**What a pack switches on:**

| With a pack on | With none |
|---|---|
| Templates offers the pack's sample project | No sample offered |
| The pack's characters are ready-made speakers | No ready-made puppets |
| `npm run outros` knows which clips to use | `npm run outros` refuses and says why |

Things a batch job names by full path (intros, outros, banners, logo, preset) work whether or not the pack is on.

**Layout:**

```
brands/<name>/
  brand.json          the pack's description
  puppet/             the cast's puppet files and their art
  characters/         character-creator files
  intros/  outros/    clips joined before / after a video
  banners/            looping strips along the bottom edge
  presets/            looks for a series of videos
  forge/              picture-request lists for Image Forge
```

Only `brand.json` is required. Every path inside it is relative to the pack's folder.

```json
{
  "name": "Acme",
  "puppetDir": "puppet",
  "cast": [
    {
      "file": "robin.rig.json",
      "label": "Robin",
      "note": "Presenter",
      "borderColor": "#e8a24a",
      "x": 0.5, "y": 0.4,
      "openingPhrase": "A cheerful man",
      "voiceRef": "robin.wav"
    }
  ],
  "sample": {
    "name": "Robin says hello",
    "language": "en",
    "script": "A cheerful man speaks warmly, \"Hello! This is a sample.\""
  },
  "addOutros": { "outrosDir": "outros/cut", "lessonsSrc": "C:/path/to/lessons" },
  "forgeCharacters": { "robin": "Robin, a cheerful man with a red scarf" }
}
```

| Field | Used by |
|---|---|
| `cast` | Characters and the sample project. A `voice` entry can set the engine and voice. |
| `sample` | Templates → Sample project. Uses the first three of `cast`. |
| `addOutros` | `npm run outros` |
| `forgeCharacters` | Image Forge picture requests for the pack's characters. |

**In the installer:** a build includes `brands/` but leaves out each pack's intros, outros, banners and presets.
A build made on a branded computer opens branded; a build from a clean copy opens neutral.
The public build carries no brand packs.

---

## Projects, templates and undo

- **Save project…** (Look → Templates → Project) saves everything into one `.json` file: characters, script, voices, directions, look, post-production.
- **Open project…** opens it with everything as you left it. **Recent projects** in the top bar lists the last few.
- **Autosave:** the app keeps your work between restarts.
- **New project** starts empty and asks first if there are unsaved changes. Nothing from the old project leaks in.
- **Undo / redo:** Ctrl+Z and Ctrl+Y, or the arrows in the top bar.
- **Templates (Create):** a saved set-up of style, characters, background and format. Starts a new video from it.
- **Presets (Look):** a saved look. Export it as a file to share or back up.
- A project that names files from another computer asks you to pick those files again before it renders.

---

## Settings reference

Press **⚙**.

| Card | What it does |
|---|---|
| **About line** | "Video Forge 0.4.0-beta.1 · Public build" (or Personal). The update link shows here when there is one. |
| **LocalAI** | Checks for free AI models on this computer. |
| **Paid voices** | Ask before spending, price per 1,000 characters, allow in Many videos, limit per sheet. |
| **Say it like this** | Words a voice says wrong, and how it should say them. Used by every voice; subtitles keep your spelling. |
| **Language** | The language of the app's own buttons. English now; Greek, French, German, Spanish and Portuguese are marked "coming soon". |
| **Downloaded background clips** | How much room the stock clips use, a size limit, and a clean-up that keeps the clips your open project uses. |
| **Key boxes** | One per service (see [Which keys do what](#which-keys-do-what)). |
| **Free voices on your computer** | Piper: Python path, voices folder, Scan, Speak. |

Optional settings for people who start the app from a terminal. All optional; see `.env.example`.

| Setting | What it does |
|---|---|
| `VIDEOFORGE_USER_DATA` | A separate data folder, for a test copy that does not touch your real projects. |
| `VIDEOFORGE_SECRETS_DIR` | Folder holding YouTube sign-in files. Listed in `.env.example`, but the code that reads it is not part of this release. TODO: describe the YouTube feature this belongs to. |
| `VIDEOFORGE_RENDER_CPU` | `1` = render on the processor instead of the graphics card. Slower; for a misbehaving graphics card. |
| `VIDEOFORGE_CARD_SATURATION` | Colour boost for intro and outro cards, 0.5 to 2. The in-app setting wins. |
| `HYPERFRAMES_BROWSER_PATH` | Full path to a headless browser for rendering, if the app cannot find one. |

---

## Where your things are kept

Everything you make lives in one folder, separate from the app:

```
%APPDATA%\video-forge
```

Paste that into the address bar of a File Explorer window to open it.

| Inside | What it is |
|---|---|
| `renders\` | Your finished videos |
| `media\` | Stock footage and pictures the app downloaded |
| `fonts\` | Subtitle fonts it downloaded |
| `byok.secrets.enc` | Your keys, encrypted for your Windows account |
| `update-check.json` | When the app last asked GitHub for a newer release (at most once a day) |

Shared with Image Forge: `%APPDATA%\Forge\` (shared keys, puppet shelf, orders).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| A line has no voice | The name before the colon matches no speaker | Copy the name from Characters. Check the accents. |
| "Key missing" message | No key for that service | Press **Open Settings**, paste the key, **Save**, **Test**. |
| **Test** fails | Wrong key, or the service is down or out of allowance | Paste the key again. Check your account on the service's site. |
| Gemini voice stops after a few lines | Voice-only models give 10 free lines a day | Pick a Live model, or add extra Gemini keys. |
| The voice reads my stage direction aloud | The direction is after the colon | Put it before the colon: `Name [quietly]: words`. |
| A Greek word sounds wrong | Stress or spelling the voice does not know | Add it to **Settings → Say it like this**. |
| A sound effect never plays | `[SFX: name]` lines are skipped in the app | Add the sound in Look → Sounds. |
| Render stops: "pick it again" | The project names a file from another computer | Pick that file again in the app. |
| 3D Humans are greyed out | They are in the personal build only | Use 3D Mini people or 3D Pets. |
| Directions disappeared from a line | You changed the line's words | Direct the line again. |
| Nothing to direct | No narration yet | Make the narration in the Script step first. |
| Many videos skips a row | The row's script does not match your characters | Fix the row in the sheet, then read the sheet again. |
| Google Sheet "opened a web page, not a sheet" | The sheet is not shared | Share → Anyone with the link (Viewer). |
| A voice character barely changes the voice | Only pitch can change without a full FFmpeg | Use the installer (it ships one), or put a full FFmpeg on PATH. |
| A post-production warning about missing filters | The FFmpeg in use lacks some filters | Same as above. The rest of the render still runs. |
| A pink rim around a puppet | Background not exactly `#FF00FF` | Refill with pure magenta and rebuild. |
| "Windows protected your PC" | The app is not code-signed yet | See [INSTALL.md](INSTALL.md): **More info**, then **Run anyway**. |
| Keys are saved to a plain file | Your computer's password store is not available | Unlock it for stronger protection. Keys still stay on this machine. |
| Render is very slow | A long video, or rendering on the processor | Use **Quick draft** to check first. Expect about 1 hour per 10 minutes of video. |

---

## FAQ

**Is it free?**
The app is free under its licence, including for paid work. Some online helpers cost money (ElevenLabs, OpenAI); most have free tiers. You pay them directly.

**Does my script go to the internet?**
Only to the services you use: the voice engine you pick, and the AI if you ask it to write, direct or translate. Piper and LocalAI stay on your computer.

**Is it open source?**
No. It is source available under the Forge Attribution License (FAL) v1.2. You can read the code. Copies from before 26 Oct 2026 stay MIT.

**Mac or Linux?**
Windows only for now.

**Can I turn off the "Made with Video Forge" label?**
Yes, untick it. You must still credit Video Forge when you publish, for example in the video description.

**Why does the public build have fewer characters than the owner's?**
The 3D Humans' motions, the owner's brand packs and his music cannot be shared. The public build has the drawn characters, 3D Mini people and 3D Pets.

**How do I update?**
When a newer release exists, a link shows in the top bar and in Settings. Download the new installer and run it over the old one. Your data is kept.

---

## Licence and credits

**Licence:** Forge Attribution License (FAL) v1.2 (see [LICENSE](LICENSE)). Source available, not an OSI open-source licence.
Free for personal, school and paid work.

**Every video you publish must carry attribution** that a viewer can find, with the link. Examples:

- `Made with Video Forge - https://stravelakis.com/forge`
- `Created using Video Forge - https://stravelakis.com/forge`

Approved places include the video description, a pinned comment, a watermark, a lower-third, an opening or closing credit, or an end card.
A credit hidden only in a footer, a legal page or the repository does not count.

**Credits** (full list in [NOTICE](NOTICE)):

- 3D characters, pets, props and furniture by **Kenney** (https://kenney.nl), CC0. Thank you, Kenney.
- Some props by **Quaternius** (https://quaternius.com), CC0.
- The Windows installer carries **FFmpeg** 9.0.2 (gyan.dev essentials build), GPL v3, run as a separate program.
- Sound effects found through Freesound are CC0 only.
