# cloudrs-site

Website for [cloudrs](https://github.com/pablozr/cloudrs), the open source SoundCloud client for
the desktop. Built with [Astro](https://astro.build).

## Run locally

```sh
npm install
npm run dev     # http://localhost:4321
npm run build   # static site in dist/
```

## Deploy

Every push to `master` publishes the site to GitHub Pages at
[cloudrs.dev](https://cloudrs.dev) (`.github/workflows/deploy.yml`).

The download page shows the installers from the latest
[cloudrs release](https://github.com/pablozr/cloudrs/releases).

## License

MIT. Fonts under the SIL Open Font License (see `src/fonts/`). cloudrs is not affiliated with
SoundCloud.
