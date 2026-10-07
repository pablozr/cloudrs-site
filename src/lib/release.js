// The latest cloudrs release on GitHub, and how its installers are shown.
// Used at build time (Astro) and again in the browser, so a new release shows up
// without waiting for the site to rebuild.

export const REPO = "pablozr/cloudrs";
export const RELEASES_URL = `https://github.com/${REPO}/releases`;
const API = `https://api.github.com/repos/${REPO}/releases?per_page=10`;

export const OS_LABEL = { windows: "Windows", macos: "macOS", linux: "Linux" };
export const OS_ORDER = ["windows", "macos", "linux"];

// The file a visitor on each system most likely wants first.
const PREFERRED = { windows: "Installer", macos: "Disk image", linux: "AppImage" };

function classify(name) {
  const n = name.toLowerCase();
  const arch = /aarch64|arm64/.test(n) ? "arm64" : /x64|x86_64|amd64/.test(n) ? "x64" : null;
  if (n.endsWith(".exe")) return { os: "windows", kind: "Installer", arch };
  if (n.endsWith(".msi")) return { os: "windows", kind: "MSI installer", arch };
  if (n.endsWith(".dmg")) return { os: "macos", kind: "Disk image", arch };
  if (n.endsWith(".appimage")) return { os: "linux", kind: "AppImage", arch };
  if (n.endsWith(".deb")) return { os: "linux", kind: "Debian, Ubuntu", arch };
  if (n.endsWith(".rpm")) return { os: "linux", kind: "Fedora, openSUSE", arch };
  return null;
}

/** Turns a GitHub release into { tag, version, date, prerelease, url, assets[] }. */
export function normalize(rel) {
  const assets = rel.assets
    .map((a) => {
      const c = classify(a.name);
      return c && { ...c, name: a.name, url: a.browser_download_url, size: a.size };
    })
    .filter(Boolean);
  return {
    tag: rel.tag_name,
    version: rel.tag_name.replace(/^v/, ""),
    date: rel.published_at || rel.created_at,
    prerelease: rel.prerelease,
    url: rel.html_url,
    assets,
  };
}

/** The newest published release with installers, or null (none yet, offline, rate limited). */
export async function fetchRelease(token) {
  try {
    const headers = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(API, { headers });
    if (!r.ok) return null;
    const rel = (await r.json()).find((x) => !x.draft && x.assets.some((a) => classify(a.name)));
    return rel ? normalize(rel) : null;
  } catch (e) {
    return null;
  }
}

/** The installer to offer first on a system. */
export function primaryAsset(release, os) {
  if (!release || !os) return null;
  const mine = release.assets.filter((a) => a.os === os);
  return mine.find((a) => a.kind === PREFERRED[os]) || mine[0] || null;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
const day = (iso) => new Date(iso).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
const ARCH = { x64: "64-bit", arm64: "ARM" };
const ICON = { windows: "windows", macos: "apple", linux: "linux" };

const NEEDS = {
  windows: "Windows 10 or 11, 64-bit. Installs for your user, no administrator rights.",
  macos: "macOS. Built by our CI; not tried by us yet in this beta.",
  linux: "64-bit. The .deb needs WebKitGTK 4.1, GTK 3, ALSA and Vulkan. Not tried by us yet in this beta.",
};

/** The download area's HTML. The same function renders on the server and in the browser. */
export function renderDownloads(release) {
  if (!release) {
    return `
      <div class="dl-empty">
        <p class="label">Coming soon</p>
        <h3>The first build is almost out.</h3>
        <p class="muted">CI builds the installers for Windows, macOS and Linux on every version tag.
          Watch the repository's releases to get it the moment it is published, or build it from source today.</p>
        <div class="cta-row">
          <a class="btn btn-primary" href="${RELEASES_URL}" target="_blank" rel="noopener"><span>Watch releases</span></a>
          <a class="btn btn-secondary" href="#source"><span>Build from source</span></a>
        </div>
      </div>`;
  }
  const cards = OS_ORDER.map((os) => {
    const files = release.assets.filter((a) => a.os === os);
    const list = files.length
      ? files.map((a) => `
          <li><a class="dl-file" href="${esc(a.url)}" download>
            <span class="dl-kind">${esc(a.kind)}${a.arch ? ` <span class="dl-arch">${a.os === "macos" && a.arch === "arm64" ? "Apple silicon" : ARCH[a.arch]}</span>` : ""}</span>
            <span class="dl-name mono">${esc(a.name)}</span>
            <span class="dl-size mono">${mb(a.size)}</span>
            <svg class="ic" aria-hidden="true"><use href="#i-download"/></svg>
          </a></li>`).join("")
      : `<li class="dl-none">Not in this build yet.</li>`;
    return `
      <article class="dl-card" id="${os}" data-os="${os}">
        <header><svg class="ic dl-os-ic" aria-hidden="true"><use href="#i-${ICON[os]}"/></svg><h3>${OS_LABEL[os]}</h3><span class="dl-you">Your system</span></header>
        <p class="dl-needs">${NEEDS[os]}</p>
        <ul class="dl-files">${list}</ul>
      </article>`;
  }).join("");
  return `
    <p class="dl-meta mono">
      <span class="dl-version">v${esc(release.version)}</span>
      ${release.prerelease ? `<span class="badge badge-new">Beta</span>` : ""}
      <span>${day(release.date)}</span>
      <a href="${esc(release.url)}" target="_blank" rel="noopener">Release notes ↗</a>
    </p>
    <div class="dl-grid">${cards}</div>`;
}
