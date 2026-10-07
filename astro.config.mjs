// @ts-check
import { defineConfig } from "astro/config";

// On GitHub Pages the site lives under /<repo>; the deploy workflow sets BASE_PATH.
export default defineConfig({
  site: process.env.SITE_URL || "https://pablozr.github.io",
  base: process.env.BASE_PATH || "/",
});
