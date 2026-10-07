// Paths under the site's base (the repo name on GitHub Pages, "/" elsewhere).
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");

/** A public file, e.g. asset("assets/logo.svg"). */
export const asset = (path) => BASE + path;

/** A page, e.g. page("download") or page("") for home. */
export const page = (path) => BASE + path;
