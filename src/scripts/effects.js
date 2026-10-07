// Page-wide motion: reveal on scroll, the cursor glow and magnetic buttons.
import { $, $$, lerp, reduceMotion } from "./lib.js";

const revealIO = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); }
}, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
$$(".reveal").forEach((el) => revealIO.observe(el));

const glow = $(".cursor-glow");
if (glow && matchMedia("(pointer: fine)").matches && !reduceMotion) {
  let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
  let following = false;
  // The follow loop sleeps once the glow has caught up with the pointer.
  const follow = () => {
    gx = lerp(gx, tx, 0.12); gy = lerp(gy, ty, 0.12);
    glow.style.transform = `translate(${gx}px, ${gy}px)`;
    following = Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5;
    if (following) requestAnimationFrame(follow);
  };
  addEventListener("pointermove", (e) => {
    tx = e.clientX; ty = e.clientY;
    document.body.classList.add("has-pointer");
    if (!following) { following = true; requestAnimationFrame(follow); }
  }, { passive: true });
  document.addEventListener("pointerleave", () => document.body.classList.remove("has-pointer"));

  $$(".magnetic").forEach((b) => {
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.22, y = (e.clientY - r.top - r.height / 2) * 0.3;
      b.style.transform = `translate(${x}px, ${y}px)`;
    });
    b.addEventListener("pointerleave", () => (b.style.transform = ""));
  });
}
