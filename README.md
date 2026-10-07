# cloudrs-site

The website of [cloudrs](https://github.com/pablozr/cloudrs), the native, open source SoundCloud
client for the desktop: the landing page and the download page.

Built with [Astro](https://astro.build): static HTML, no framework runtime. The music on the
home page is synthesized live in the browser with the Web Audio API, and every visual reacts to
it.

## Develop

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # static site in dist/
npm run preview   # serve dist/
```

## Layout

| Path | What it is |
| --- | --- |
| `src/pages/` | `index.astro` (home) and `download.astro` |
| `src/layouts/Base.astro` | The shell: head, nav, footer, `Ctrl K` palette, release data |
| `src/components/` | One component per section, each with its own stylesheet and script |
| `src/styles/` | `global.css` holds the tokens (mirroring cloudrs's `docs/design/VISUAL-IDENTITY.md`); the rest is one file per section |
| `src/scripts/` | Browser code. `loop.js` runs the single frame loop, scroll handler and relayout; `spectrum.js` feeds every visual; `audio.js` is the generative mix |
| `src/lib/release.js` | Reads the latest cloudrs release from GitHub and renders the download list |
| `public/assets/` | Logo, social image and app screenshots |
| `src/fonts/` | Bricolage Grotesque, Geist and Geist Mono (OFL, licenses alongside) |

## Downloads

The download page lists the newest published (non-draft) release of `pablozr/cloudrs` that has
installers: `.exe` for Windows, `.dmg` for macOS, `.AppImage` and `.deb` for Linux. The list is
baked in at build time and fetched again in the browser, so a release published after the last
deploy still shows up. Visitors get the file for their own system first.

cloudrs's release workflow only attaches installers to the CI run; they appear here once they
are published as a GitHub Release.

## Deploy

`.github/workflows/deploy.yml` publishes to GitHub Pages on every push to `main`, daily, and on
a `cloudrs-release` repository dispatch. Turn on Pages in the repository settings with
**GitHub Actions** as the source. The workflow sets `BASE_PATH` to `/<repo>`; for a custom
domain, drop it and set `SITE_URL`.

## Updating the screenshots

Replace the files in `public/assets/shots/`, keeping the names (`search-playing`, `track`,
`playlist`, `user`, `queue`, each `-dark.png` and `-light.png`). If the new captures are framed
differently, set where the app window sits inside each image with the variables on
`.window-screen` in `src/styles/showcase.css`: `--shot-w` (image width), `--win-x`, `--win-y`,
`--win-w`, `--win-h`.

## Performance

One `requestAnimationFrame` loop draws only the canvases on screen and stops on pages without
animation. Layout is measured on resize, never per frame; the full-bleed hero renders at 1.5×
at most. The page honours `prefers-reduced-motion`.

## License

MIT for the code. The fonts are under the SIL Open Font License (see `src/fonts/`). cloudrs is
an unofficial client and is not affiliated with SoundCloud.
