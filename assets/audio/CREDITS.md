# After Hours sound credits

## Recorded sounds

- **Indoor rain:** "INT Rainy ambience (rain heard from inside a room)" by **Sayuri_Odin**, Freesound, 28 January 2014. https://freesound.org/people/Sayuri_Odin/sounds/216134/ — **CC0 1.0**: https://creativecommons.org/publicdomain/zero/1.0/
  - Local file: `indoor-rain.mp3`, public high-quality preview of the CC0 recording. The source describes rain heard through walls in an interior environment.
  - Runtime treatment: high-pass at 100 Hz, low-pass at 1700 Hz, a 0.65-second tail/head crossfade, then level normalization with peak headroom. No thunder or music layer is added.
- **Cat purr:** `cat_purrsleepy_loop.wav` from "Cat Purr & Meow" by **Kerzoven**, OpenGameArt, 16 April 2022. https://opengameart.org/content/cat-purr-meow — **CC0 1.0**: https://creativecommons.org/publicdomain/zero/1.0/
  - Local file: `cat-purr.wav`, unchanged recording. Runtime playback uses at most 2.2 seconds with fades. A 150 Hz high-pass and 2400 Hz low-pass bring out the texture for small speakers; the filtered segment is normalized with peak headroom. No meow is used.

Download URLs, byte counts and SHA-256 digests are recorded in `sources.json`. `scripts/fetch-audio.py` retrieves these two public assets. No runtime request goes to these third-party services.

## Original procedural effects

Switch/mouse/key/phone clicks, CRT blip, paper taps, page rustles, book cover, mail confirmation, and quiet camera swells are synthesized in `audio.js` using short noise envelopes, filters and sine tones. They are original project code, not recordings of physical objects. No external sound library or music is included.

## Playback

Sound defaults ON; actual playback waits for a trusted user interaction and respects a saved mute preference. Rain and effects have independent volume controls. Audio pauses when the page is hidden; purrs have a cooldown and never overlap. Room artwork and the original ambient/lighting videos are unchanged.
