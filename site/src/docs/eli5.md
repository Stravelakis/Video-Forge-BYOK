---
checkedAgainst: v0.4.0-beta.1
checkedOn: 2026-11-21
---

## Start here

This page takes you from "I have never made a video like this" to "I made a video where two characters talk". Go slowly. Nothing here can break your computer, and every step says what you should see, so you always know if it worked.

> **Do this first** You do not need to understand everything before you start. Read **The six ideas** (about five minutes), then follow **Step 1** onward. Come back to the rest when you want it.

**What you will have at the end:**

- Video Forge installed on your Windows computer.
- A real video file with two characters talking, with subtitles, that you made yourself.
- A calm idea of what is free, what costs money, and how the app protects you.

**What you do not need:** a credit card, a special program, or any knowledge of code. You need a Windows computer and the internet.

**How long:** about an hour the first time, most of it waiting for the installer and the first voice and video to be made.

## The six ideas

Six ideas and you understand the whole app. Take them one at a time.

### 1. A little puppet theatre inside your computer

Video Forge is a program on your computer. You choose **characters** (puppets, drawings or 3D toys), write what each one says, and press a button. It makes a **video**: a file you can watch, upload or send. The characters talk and their mouths move with the words.

### 2. You write the play as a list of lines

What the characters say is called a **script**. It is just lines, one per sentence, each starting with who is speaking:

`Maria: Hello!`

The word before the colon is the character's **name**. Everything after it is what they say. That is the whole trick.

### 3. The voices come from helpers on the internet

Video Forge does not have a voice of its own. It asks a helper to read each line out loud. These helpers are called **engines**. Some are free. One (called Piper) even runs on your own computer, with no internet. A few cost a little money, and the app always asks before it spends.

### 4. A key is a password for a helper

Most helpers want to know it is really you, because any bill comes to you. They give you a long secret code called an **API key**, or just a **key**. It works like a library card: whoever holds it can borrow in your name, so you keep it private. Video Forge keeps your keys on your own computer, locked with Windows, and sends each one only to the helper it belongs to.

> **Why** This is called "bring your own key". There is no Video Forge account and no Video Forge server in the middle, so nobody else can see what you make or charge you for it.

### 5. The video is built on your own computer

The online helpers only make the **voices** and help with ideas. Putting the pictures, voices and subtitles together into a video happens on **your** computer. That is why it likes a strong computer, and why a long video takes a while: about an hour for a 10-minute video on the recommended computer.

### 6. Everything you make goes in a folder

A **folder** is a box on your disk that holds files. Video Forge keeps everything in one folder, `%APPDATA%\video-forge`, and your finished videos are in a sub-folder called `renders`. There is a button, **Open folder**, that takes you there.

> **In short** You pick characters and write lines. Each line goes to a voice helper (which may need a key). The voices come back, and your computer builds a video from them and puts the file in a folder.

## Step 1: Check your computer

1. You need **Windows 10 or 11**. Press the Windows key, type `About your PC`, press Enter. It says which Windows you have. (A Mac or Linux computer cannot run this app yet.)
2. You need about **700 MB** of free space for the app, plus room for videos (a seven-minute video is roughly 100 to 200 MB).
3. Better, but not required: a graphics card from NVIDIA with 8 GB, and 32 GB of memory. A weaker computer works, just slower.

**What you should see:** Windows 10 or 11, and a few gigabytes free. If so, carry on.

## Step 2: Download it

1. Open your web browser (Chrome, Edge, Firefox, any of them).
2. Go to the [downloads page](https://github.com/Stravelakis/Video-Forge-BYOK/releases/latest). This is a page on **GitHub**, a website where programmers keep their projects. It is the official home of Video Forge.
3. Scroll to the part called **Assets**.
4. Click the file that starts with **Video Forge Setup** and ends with **.exe**. The numbers in the middle are the version.
5. Wait for the download. It is a big file, because the app carries its own video tools.

**What you should see:** the file in your browser's download list, usually in your **Downloads** folder.

<details>
<summary>There are no files under Assets</summary>

Then the first public version has not been published yet. Nothing is wrong with your computer. Check back later.

</details>

## Step 3: Install it

1. Find the file you downloaded and double-click it.
2. Windows may show a **blue box** that says **"Windows protected your PC"**. Do not panic. Read the next box.
3. In that blue box, click **More info**. A new button appears.
4. Click **Run anyway**.
5. The installer asks where to put the app. The suggested place is fine. Click **Install** and wait.

> **Why** Windows shows the blue box for any program from a maker it does not know yet, because the maker has not bought a paid "this is really me" stamp (called code signing). It is not a sign that something is wrong. You only do this once. The code is open to read on GitHub if you want to check.

**What you should see:** a new **Video Forge** shortcut on your desktop and in the Start menu. The app also appears in **Settings → Apps**, where you can uninstall it later.

<details>
<summary>I do not want to install anything</summary>

Download **video-forge-portable.exe** from the same Assets list instead. Double-click it and it runs from wherever it is, like a game on a USB stick.

</details>

## Step 4: Open it and look around

Double-click the **Video Forge** shortcut. A window opens on the **Create** screen.

Along the top is a bar. You do not need most of it yet. Here is what the main parts are for:

| Part of the top bar | What it is, in one line |
|---|---|
| **Create** | The guided way in. One question at a time, to set up a video |
| **Production** | Where you write the script, make the voices and make the video |
| **Explainer** | A different kind of video: moving pictures and charts with a voice |
| **Many videos** | Make lots of videos from one spreadsheet |
| **Characters** | The workshop for your characters |
| **⚙** (a gear) | Settings, where your keys live |

> **Try it** Hold your mouse over any button or word. A little bubble says what it does, in plain words. No mouse? Press the **Tab** key to move between things; the bubble shows then too. **Esc** closes it.

## Step 5: Get your first key

You need one key so the app can read your script out loud. We will use **Gemini**, from Google. Its free tier is enough to start.

1. Click the gear **⚙** at the top right. A page called **Keys and settings** opens.
2. Find the **Gemini** box.
3. Click **Get a key →**. Google's own page opens in your browser. Sign in with a Google account if it asks.
4. On that page, create a key and copy it (click the copy button, or select the code and press **Ctrl+C**).
5. Go back to Video Forge. Click in the box that says **Paste key…** and press **Ctrl+V**.
6. Click **Save**.
7. Click **Test**.

**What you should see:** a green **saved ✓** after Save. After Test, a message that says whether the key works.

> **Watch out** Never post your key anywhere: not in a message, not in a screenshot. If you ever do, make a new one on Google's page and paste it over the old one.

<details>
<summary>Test says it does not work</summary>

The most common cause is a copy that missed a letter at the start or end. Paste it again. If it still fails, the service may be busy or you may have used up the free allowance for today. Try again later, or check your account on Google's page.

</details>

<details>
<summary>What is "Clear"?</summary>

**Clear** forgets the key on this computer. It does not delete your account at the service. You can paste a key again any time.

</details>

## Step 6: Choose how it looks (Create)

Click **Create**. There are five steps along the top: **Style, Characters, Background, Format, Review**. You can click any of them to go back, and **← Back** never loses anything.

**Style.** This is how the characters are drawn: like stick figures, like a comic, like 3D toys. Each one is shown moving. Rest the mouse on one to see it large. For your first video click a drawn one, such as **2D stick cutout**.

**What you should see:** you move on to the **Characters** step.

## Step 7: Add two characters and give them voices

1. On the left are ready-made characters for your style. Click two of them. They appear on the right, under **In the video**.
2. Click the first character on the right. A list of settings opens. Find **Voice** and pick an engine and a voice: choose **Gemini**, which uses the key you just saved.
3. Do the same for the second character, with a different voice so you can tell them apart.
4. Look at the little coloured dots next to each setting. A red dot means "needs a choice from you". Grey is fine. Green means you approved it.

**What you should see:** both characters listed, each with a voice chosen. If a red dot is left, click that setting and pick something.

> **Why** Each character has a **name**. You will type exactly that name in the script, so notice it now.

## Step 8: Background and shape

1. Click **Background**. For a first try, pick **Plain colour or gradient**. It is quick and keeps attention on the characters.
2. Click **Format**. Pick the shape **16:9** (a wide video, like a normal YouTube video).
3. Pick the kind of video **Two people talking**.

**What you should see:** an example picture made from **your** characters and background in the format you chose.

> **Do this first** For a very first try, avoid the fancy backgrounds. Stock video needs the script first, and AI-made backgrounds need an extra website. Plain is perfect for learning.

## Step 9: Go to production and write the script

1. On **Review**, you see everything you chose. Click **Go to production →**.
2. You land on the **Script** step. Pick the **Language**: English or Greek. One script is one language.
3. Click in the big text box and write four lines. Use your two characters' names exactly as they appear, followed by a colon:

```
Maria: Good morning! Today we talk about chocolate and dogs.
Nikos: Is it bad for them?
Maria: Yes. Chocolate is poison for dogs.
Nikos: Thank you, Maria. Now I know.
```

(Use your own characters' names in place of Maria and Nikos.)

**What you should see:** your lines in the box. A line whose name matches nobody is marked, because it has no voice to say it.

> **Watch out** Capital letters do not matter, but spelling does, and so do accents. In Greek, `Καιτη` is not the same as `Καίτη`. A name in English letters does not match a Greek name. Copy the name from the Characters step instead of typing it.

<details>
<summary>A line is marked and has no voice</summary>

The name before the colon does not match any character. Either change the name to match exactly, or remove the line.

</details>

<details>
<summary>Can I make them laugh, whisper, walk in?</summary>

Yes, with words in square brackets. `Maria: [laughs] I did not see that coming.` makes the voice laugh instead of reading the word. `Maria [quietly]: Do not tell.` changes how the line is said. Put these notes **before the colon**; anything after the colon is spoken out loud. `Maria: [walks in] Good morning!` makes a drawn character walk in. The Guide has the full list.

</details>

## Step 10: Make the voices

1. Click **Make the narration**.
2. Wait. Each line is made with its character's voice, checked, and joined into one sound track. A free voice takes roughly 10 to 20 seconds a line, so four lines take about a minute.
3. When it is done, click **▶** (play) on the big preview on the right.

**What you should see:** the characters talking, with their mouths moving, and a list of your lines with a time next to each.

> **Why** The preview is the video. What you see is what you get: run the same project twice and you get the same video.

<details>
<summary>A message says a key is missing</summary>

It has an **Open Settings** button. Press it, paste the key for that service, then **Save** and **Test**.

</details>

<details>
<summary>The voice stops after a few lines</summary>

Some Gemini voice models only give 10 free lines a day. In the character's **Voice**, pick a **Live** model instead (free, no daily limit), or add extra Gemini keys under the Gemini box in Settings.

</details>

<details>
<summary>One line sounds wrong</summary>

Press **Remake** on that line only. The other lines keep their sound. For a word that is said wrongly, add it in **Settings → Say it like this**, with how it should be said.

</details>

## Step 11: Make the real video

Now we build the file. First a quick check, then the real thing.

1. Go to the **Make** step (the fifth in the list on the left of Production).
2. Click **Quick draft**. It makes a small, fast version so you can check it. It opens by itself when it is done.
3. If you like it, click **Render video**. This makes the finished video at full quality. It takes longer.
4. When it is done, click **Play it** to watch it in your usual video player, or **Open folder** to see the file.

**What you should see:** a progress bar, then a finished `.mp4` file. Next to it are two small files ending in `.srt` and `.vtt`. Those are the subtitles as separate files, in case you want them.

> **Watch out** Do not close the app while it makes the video. If you must stop, press **Stop**. What was half made is thrown away, but your voices are kept.

> **Try it** Tick another shape under **Also as** (for example **Tall 9:16** for TikTok or Reels). The button changes to say how many videos it will make, such as **Render 2 videos**.

<details>
<summary>It is very slow</summary>

Making a video is heavy work for a computer. A 10-minute video takes about an hour on the recommended computer, and longer on a weaker one. Use **Quick draft** to check things, close other big programs, and be patient.

</details>

## Step 12: Share it, and the one rule

When you put your video online, say it was made with Video Forge. For example in the description:

`Made with Video Forge - https://stravelakis.com/forge`

A small label saying the same is also put in a corner of the video by default. You can untick it, but you must still credit Video Forge in the description or somewhere viewers can find it.

> **Why** Video Forge is free, even for paid work. This is the only thing it asks in return. The licence is called the Forge Attribution License. It is "source available": you can read the code, but it is not classic open source.

## Free or paid? Stay in control

You used a free voice. Here is how the others compare.

| Helper | Cost | What you need | Good for |
|---|---|---|---|
| Gemini voices | free tier | a free Gemini key | acting voices, many languages |
| Fish Audio | free | an OpenRouter key (free) | a funny foreign accent |
| Piper | free, offline | Python and voice files on your computer | checking timing, no internet |
| ElevenLabs | paid, per character | a key with money on the account | very natural voices |
| DramaBox | retired on 10 Oct 2026 | old projects use Gemini instead | nothing: it is gone |

**What happens when something costs money.** Before a narration buys anything, a box shows how many characters it will use and the estimated cost, and waits for your yes. In **Many videos**, a paid voice is refused unless you switch it on in Settings, because a batch can run overnight with nobody to ask. If you do nothing, nothing is spent.

> **Do this first** If you are not sure, stay on the free voices. You can make plenty of videos without paying anything.

## Make it better (when you are ready)

You do not need these for your first video. They are here for later.

- **Look → Subtitles:** pick a caption style. The word being said lights up in the speaker's colour.
- **Look → Music:** pick a music file from your computer. It gets quieter while someone talks.
- **Make → Render, post-production:** **Studio sound** is on for new projects. It cleans the voices and sets the loudness that YouTube and TikTok expect.
- **Direct:** put actions on words: walk in, turn, a camera shot, a feeling. **✨ Suggest** lets an AI propose them.
- **Many videos:** one row of a spreadsheet makes one video. Great for a whole series. The Guide below has the steps.
- **Characters (top bar):** change any part of a character, or describe a change in words.

## Backups and where things are

Open `%APPDATA%\video-forge` by pasting it into the address bar of a File Explorer window. Inside:

| Inside | What it is |
|---|---|
| `renders` | Your finished videos |
| `media` | Stock video and pictures the app downloaded |
| `fonts` | Subtitle fonts it downloaded |
| `byok.secrets.enc` | Your keys, locked for your Windows account |

To keep a project, use **Save project…** (in Production → Look → Templates). It saves everything about the project in one file. **Open project…** brings it back. The app also keeps your work between restarts, and **Ctrl+Z** undoes a mistake.

> **Watch out** When you uninstall, the app asks **Remove your Video Forge data as well?** Answer **No** to keep your keys, settings and videos. **Yes** deletes your data, **including every finished video**.

## When something goes wrong

<details>
<summary>"Windows protected your PC"</summary>

Expected. Click **More info**, then **Run anyway**. See Step 3.

</details>

<details>
<summary>A line has no voice</summary>

The name before the colon does not match any character. Copy the name from the Characters step. Check accents.

</details>

<details>
<summary>"Key missing", or Test fails</summary>

Press **Open Settings**, paste the key again, **Save**, then **Test**. If Test still fails, the key is wrong or the service is out of allowance for the day.

</details>

<details>
<summary>The voice reads my note out loud</summary>

The note is after the colon. Move it before: `Maria [quietly]: words`.

</details>

<details>
<summary>A sound effect I wrote never plays</summary>

`[SFX: name]` lines are skipped in the app: they only work in batch runs from the command line. To add a sound, use **Look → Sounds** (a sound from Freesound, or a file from your computer).

</details>

<details>
<summary>The render stops and says "pick it again"</summary>

The project mentions a file from another computer. Pick that file again in the app.

</details>

<details>
<summary>The 3D Humans are greyed out</summary>

They are only in the owner's personal copy. Use **3D Mini people** or **3D Pets**.

</details>

<details>
<summary>Many videos skips a row, or says a sheet "opened a web page"</summary>

A skipped row's script does not match your characters: fix the row in the sheet and read the sheet again. The web page message means the Google Sheet is not shared: **Share → Anyone with the link (Viewer)**.

</details>

## A small dictionary

| Word | What it means |
|---|---|
| **Script** | The lines the characters say, one per line, `Name: words` |
| **Narration** | All the lines turned into voices and joined into one sound track |
| **Render** | Building the finished video file |
| **Key** | A secret code from a service that lets the app use your account there |
| **Engine** | A helper that makes a voice (or a picture) for the app |
| **Quick draft** | A small, fast video, just to check |
| **Subtitles** | The words at the bottom of the video |
| **Public build** | The copy of the app anyone can download |
| **Personal build** | The owner's own copy, with extras that cannot be shared |
