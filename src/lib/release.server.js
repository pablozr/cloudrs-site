// Build-time release data, fetched once per build and shared by every page.
import { fetchRelease } from "./release.js";

let cached;
export const buildRelease = () => (cached ??= fetchRelease(process.env.GITHUB_TOKEN));
