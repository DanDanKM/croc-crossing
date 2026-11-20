# 🐊 Croc Crossing

A hopping letters-and-spelling game made for Felix and Remi (ages 4 and up).

Hop across the road — where a hungry croc lies in wait and gobbles up the cars — then ride the logs, boats and croc backs over the river and land on the right letter at the jetty. Hop on the croc's back when his mouth is shut!

## Levels

| Levels | What you learn |
|---|---|
| 1–3 | **Letter hunt** – find the letter (upper and lower case) |
| 4–6 | **Sound hunt** – what letter does 🍎 apple start with? |
| 7–9 | **Spelling** – three-letter words (CAT, DOG, BUS…), letters shown as a hint |
| 10–12 | Four-letter words (CROC, BOAT, DORY…) |
| 13+ | Big words, no hints (OCEAN, ANCHOR, DARWIN…) |

After every third level there's a **bonus car mission**: a top-down city drive where you visit the houses with the right letters on their roofs, in order, to spell a word. Collect stars, dodge the crocs on the road, beat the clock.

Each player's level and stars are saved on the device. Grown-ups can pick a start level on the menu.

## Controls

Arrow keys / WASD, the on-screen arrows, or swipe. Tap the game to hop forward. In the car: ⬆️ go, ⬇️ brake/reverse, ⬅️➡️ steer. Tap 🔊 to hear the instruction again.

## Voices

Every spoken line lives in `data.js` (built by `tools/Build-Data.ps1`). Without generated clips the game uses the device's own voice. To use ElevenLabs voices:

```powershell
$env:ELEVENLABS_API_KEY = '<your key>'
.\tools\Generate-Voices.ps1                 # default voice; add -VoiceId <id> to choose another
```

That writes `voice/*.mp3` plus `voice/index.json` (about 250 clips, ~6,300 characters). Commit the `voice` folder and the game picks the clips up automatically.

## Run locally

```powershell
.\tools\Serve-Local.ps1     # then open http://localhost:8766/
```

No build step, no libraries — plain HTML, canvas and JavaScript.
