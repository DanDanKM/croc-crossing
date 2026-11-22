# 🐊 Croc Crossing: Top End Adventure

A learning adventure made for Felix (5) and Remi (3). It starts in Darwin and travels across the Top End to Timor-Leste, Indonesia and Papua New Guinea. Play it at **https://dandankm.github.io/croc-crossing/**. On an iPad, open it in Safari, then Share → Add to Home Screen. It works offline once it's been opened on wifi.

## What's in it

- **Journey map**: 9 places, each with its own animals, plants and a bonus game. At each place you meet the animals, learn an Indonesian word of the day, hop across the road and river to the right answers, play the bonus game, and finish with a quiz (Felix).
- **Felix** gets letters and sounds, spelling, sight words, rhymes, syllables, sentences (capital letters and full stops), plurals, describing words, nature, geography and basic Indonesian.
- **Remi** gets picture and voice mode: animals, colours, counting, the letter R and animal sounds. Cars stop for him, and he taps the answer to hop there.
- **👫 Felix + Remi**: team play on one iPad. They take turns (Remi taps the picture, Felix reads and spells), then play a team bonus game.
- **Smart practice**: each child's right and wrong answers are remembered, and the tricky letters, words and Indonesian words come back more often. The grown-ups page (⚙️) shows progress and what's being practised.
- **Seasons**: the six Top End seasons (Build-up, the Wet, Run-off, Knock 'em down, Cool dry time, Hot dry time) follow today's date. Each has its own weather and three daily surprises, and there's a shell bonus for a play streak.
- **🏞️ Sanctuary**: every animal you meet comes to live there. Spend shells on waterlilies, trees, nests, a canoe or a rainbow.
- **📷 Photo safari**: snap the animal that's asked for (reading practice). Photos go into the Field Guide, with golden shots for perfect timing.
- **Bonus games** (replay them any time from 🎮 Games):
  - 🎣 barra fishing
  - 📷 photo safari
  - 🍌 banana boat UB-19 river run (spell with letter buoys)
  - 🏄 surfing
  - 🦶 hacky sack (count to ten in English and Indonesian)
  - 🚗 car mission
  - 🥋 judo (bow, find the doing word, time the throw)
  - 🛹 skateboard and 🚲 BMX (grab the word you hear)
  - 🥁 clap-along (syllable beats, plus an Indonesian counting chant)

## Code

Plain HTML, canvas and JavaScript, with no build step.
- `content.js`: all the places, animals, words, seasons and phrases.
- `core.js`: audio, voices, progress, menus and the journey.
- One file per mode: `hop`, `map`, `fish`, `surf`, `car`, `safari`, `sanct`, `boat`, `skate`, `hacky`, `judo`, `clap`.
- `sw.js` + `manifest.webmanifest`: offline use and the home-screen icon.

## Voices

`tools/Build-Lines.ps1` turns `content.js` into `lines.js` (every spoken line, keyed). `tools/Generate-Voices.ps1` voices the new or changed lines with ElevenLabs, using the key from the `ELEVENLABS_API_KEY` user variable:
- Matilda for the narrator
- Gavrila for Indonesian words
- Clyde for the croc

Without clips, the device's own voice is used. Test locally with `tools/Serve-Local.ps1` (http://localhost:8766/).

Larrakia and Kriol names stay hidden until they've been checked with someone local (⚙️ setting).
