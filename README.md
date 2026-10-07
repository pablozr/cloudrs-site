# cloudrs-site

The landing page for [cloudrs](https://github.com/pablozr/cloudrs), the native, open source
SoundCloud client for the desktop.

Plain HTML, CSS and JavaScript: no build step, no dependencies. The music on the page is
synthesized live in the browser with the Web Audio API, and every visual reacts to it.

## Run it

```sh
python -m http.server 4173
```

Then open <http://localhost:4173>.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The page |
| `style.css` | Styles; tokens mirror cloudrs's `docs/design/VISUAL-IDENTITY.md` |
| `main.js` | Visuals (hero scene, Jam, rack, roadmap), the page player and the `Ctrl K` palette |
| `audio.js` | The generative mix (A minor, 112 BPM) and the analyser the visuals read |
| `assets/shots/` | App screenshots, `<screen>-dark.png` and `<screen>-light.png` |
| `fonts/` | Bricolage Grotesque, Geist and Geist Mono (OFL, licenses alongside) |

## Updating the screenshots

Replace the files in `assets/shots/`, keeping the names (`search-playing`, `track`, `playlist`,
`user`, `queue`). If the new captures are framed differently, set where the app window sits
inside each image with the variables on `.window-screen` in `style.css`: `--shot-w` (image
width), `--win-x`, `--win-y`, `--win-w`, `--win-h`.

## Performance

One `requestAnimationFrame` loop draws only the canvases on screen. Layout is measured on
resize, never per frame, and the full-bleed hero renders at 1.5× at most. The page honours
`prefers-reduced-motion`.

## License

MIT for the code. The fonts are under the SIL Open Font License (see `fonts/`). cloudrs is an
unofficial client and is not affiliated with SoundCloud.
