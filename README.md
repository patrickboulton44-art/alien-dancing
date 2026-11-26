# Good Morning Teng 👽☀️

A little alien walks across planet Zorp in the dark. The sun rises, the camera zooms in, he lights up, and says **GOOD MORNING TENG**. Then the camera pulls back, the whole planet's aliens drop in, and everyone does a Subject 3 (科目三) style dance routine on a loop.

No build step and no dependencies: plain HTML, SVG and JavaScript. The soundtrack is synthesised live with the Web Audio API, so there are no audio files.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then go to http://localhost:8000 and press **Wake up** (browsers only allow sound after a click).

## Files

- `index.html`: the scene (sky, sun, hills, ground) and the UI
- `main.js`: the timeline, camera, alien rig and dance moves
- `music.js`: the original synth soundtrack
- `style.css`: the title, buttons and intro card

## Tweaking

- **Timing:** edit `TL` in `main.js`. All the times are in seconds from pressing Wake up.
- **Dance:** each move (`moveSwing`, `moveWings`, `movePaws`, `moveWave`) takes the current beat and returns joint angles. `ROUTINE` sets the order, and each move lasts 8 beats.
- **Crowd:** `ROWS` sets the rows as `[y, scale, spacing, gap kept clear around the main alien]`. `PALETTE` sets the colours.
- **Jump to a moment:** add `?t=16` to the URL. Add `&freeze` as well to hold that single frame.
