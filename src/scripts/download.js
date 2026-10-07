// Download buttons: point at the visitor's system, and refresh the release list live
// so a release published after the last site build still shows up.
import { $, $$ } from "./lib.js";
import { fetchRelease, renderDownloads, primaryAsset, OS_LABEL } from "../lib/release.js";
import { page } from "../lib/url.js";

function detectOS() {
  const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent;
  if (/win/i.test(p)) return "windows";
  if (/mac|iphone|ipad/i.test(p)) return "macos";
  if (/linux|x11|cros/i.test(p)) return "linux";
  return null;
}
const os = detectOS();

const dataEl = $("#release-data");
let release = dataEl ? JSON.parse(dataEl.textContent) : null;

function apply() {
  // "Download for <system>" everywhere the page offers a download.
  $$("[data-download-cta]").forEach((a) => {
    const label = $("span", a);
    if (os && label) label.textContent = `Download for ${OS_LABEL[os]}`;
    a.href = page("download") + (os ? `#${os}` : "");
  });

  // On the download page: the big button goes straight to the right file.
  const big = $("#dl-primary");
  if (big) {
    const asset = primaryAsset(release, os);
    big.hidden = !asset;
    if (asset) {
      big.href = asset.url;
      $("span", big).textContent = `Download for ${OS_LABEL[os]}`;
      $("#dl-primary-note").textContent = `${asset.name} · ${(asset.size / 1048576).toFixed(1)} MB`;
    }
  }
  $$(".dl-card").forEach((c) => c.classList.toggle("is-you", c.dataset.os === os));
}
apply();

const list = $("#dl-list");
if (list) {
  fetchRelease().then((fresh) => {
    if (!fresh || (release && fresh.tag === release.tag)) return;
    release = fresh;
    list.innerHTML = renderDownloads(release);
    apply();
  });
}
