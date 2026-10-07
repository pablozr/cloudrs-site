// @ts-check
import { defineConfig } from "astro/config";

// Served from the root of cloudrs.dev (GitHub Pages custom domain).
export default defineConfig({
  site: process.env.SITE_URL || "https://cloudrs.dev",
  base: process.env.BASE_PATH || "/",
});
