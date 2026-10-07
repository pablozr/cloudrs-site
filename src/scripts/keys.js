// Keyboard section: keycaps press down with the real keys (Space also plays, via the player).
import { $$ } from "./lib.js";
import { Mix } from "./audio.js";

const caps = $$(".cap");
const capsFor = (key) => caps.filter((c) => c.dataset.key.toLowerCase() === key.toLowerCase());

addEventListener("keydown", (e) => {
  capsFor(e.key).forEach((c) => c.classList.add("down"));
  if (e.ctrlKey || e.metaKey) capsFor("Control").forEach((c) => c.classList.add("down"));
});
addEventListener("keyup", (e) => {
  capsFor(e.key).forEach((c) => c.classList.remove("down"));
  if (!e.ctrlKey && !e.metaKey) capsFor("Control").forEach((c) => c.classList.remove("down"));
});
addEventListener("blur", () => caps.forEach((c) => c.classList.remove("down")));
caps.forEach((c) => {
  c.addEventListener("pointerdown", () => c.classList.add("down"));
  c.addEventListener("pointerup", () => { c.classList.remove("down"); if (c.dataset.key === " ") Mix.toggle(); });
  c.addEventListener("pointerleave", () => c.classList.remove("down"));
});
