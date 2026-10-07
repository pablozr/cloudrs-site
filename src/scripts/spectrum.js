// The spectrum every visual reads: the live mix when it plays, a calm breathing one when not.
import { Mix } from "./audio.js";
import { clamp, lerp } from "./lib.js";

const BINS = 128;
const spec = new Float32Array(BINS);

/** blend: 0 idle, 1 live. bass and level are smoothed. lv is the raw read-out. */
export const sp = {
  blend: 0,
  bass: 0,
  level: 0,
  lv: { playing: false, bass: 0, mid: 0, high: 0, level: 0, kick: 0, wave: null, freq: null },
};

export function updateSpectrum(t) {
  const lv = (sp.lv = Mix.levels());
  sp.blend = lerp(sp.blend, lv.playing ? 1 : 0, 0.06);
  for (let i = 0; i < BINS; i++) {
    const x = i / BINS;
    const idle = clamp(0.2 + 0.13 * Math.sin(t * 1.1 + x * 9) * Math.sin(t * 0.63 + x * 21) + 0.07 * Math.sin(t * 2.7 + x * 47), 0, 1) * (1 - x * 0.55);
    let live = 0;
    if (lv.freq) live = lv.freq[Math.floor(2 + Math.pow(x, 1.7) * 330)] / 255;
    spec[i] = lerp(idle, live, sp.blend);
  }
  const idleBass = 0.15 + 0.1 * Math.sin(t * 1.9);
  sp.bass = lerp(sp.bass, lerp(idleBass, lv.bass, sp.blend), 0.3);
  sp.level = lerp(sp.level, lerp(0.2, lv.level, sp.blend), 0.2);
}

/** The spectrum at x in [0, 1]. */
export const at = (x) => spec[clamp(Math.floor(x * BINS), 0, BINS - 1)];
