// A small generative mix, synthesized live with the Web Audio API.
// Nothing is downloaded: kick, clap, hats, bass, pad and a plucked arp in A minor at 112 BPM.
// The page's visuals read the analyser through `Mix.levels()`.
"use strict";

window.Mix = (() => {
  const BPM = 112;
  const STEP = 60 / BPM / 4; // a sixteenth note
  const LOOKAHEAD = 0.12;

  // Am7 · Fmaj7 · Cmaj7 · G6, one chord per bar.
  const CHORDS = [
    { pad: [57, 60, 64, 67], bass: 45 },
    { pad: [53, 57, 60, 64], bass: 41 },
    { pad: [55, 59, 60, 64], bass: 48 },
    { pad: [55, 59, 62, 64], bass: 43 },
  ];
  const ARP = [69, 72, 74, 76, 79, 81, 84, 88];

  let ctx, master, analyser, drums, padBus, fx, delaySend, reverbSend, noise;
  let freq, wave, timer, nextTime = 0, step = 0, playing = false, volume = 0.7, muted = false;
  const listeners = new Set();
  const kicks = [];
  let arpPattern = [];

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // A deterministic random, so every bar of the arp feels composed rather than noisy.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.2;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.78;
    master.connect(comp).connect(analyser).connect(ctx.destination);
    freq = new Uint8Array(analyser.frequencyBinCount);
    wave = new Uint8Array(analyser.fftSize);

    drums = ctx.createGain(); drums.gain.value = 0.9; drums.connect(master);
    padBus = ctx.createGain(); padBus.gain.value = 1; padBus.connect(master);

    // Reverb: a convolver fed with a decaying stereo noise burst.
    const rev = ctx.createConvolver();
    const len = ctx.sampleRate * 2.8;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    rev.buffer = ir;
    reverbSend = ctx.createGain(); reverbSend.gain.value = 0.32;
    const revOut = ctx.createGain(); revOut.gain.value = 0.55;
    reverbSend.connect(rev).connect(revOut).connect(master);

    // Dotted-eighth ping-pong-ish delay.
    const dl = ctx.createDelay(1);
    dl.delayTime.value = STEP * 3;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const dlf = ctx.createBiquadFilter(); dlf.type = "lowpass"; dlf.frequency.value = 3200;
    delaySend = ctx.createGain(); delaySend.gain.value = 0.42;
    delaySend.connect(dl); dl.connect(dlf).connect(fb).connect(dl);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (pan.pan) pan.pan.value = 0.35;
    dlf.connect(pan).connect(master);
    dlf.connect(reverbSend);

    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  // ---------- voices ----------
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
    g.gain.setValueAtTime(1.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g).connect(drums);
    o.start(t); o.stop(t + 0.45);
    // Sidechain: the pad ducks under every kick, the classic pump.
    padBus.gain.cancelScheduledValues(t);
    padBus.gain.setValueAtTime(0.25, t);
    padBus.gain.linearRampToValueAtTime(1, t + STEP * 3);
    kicks.push(t);
  }

  function hat(t, vel, open) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise;
    f.type = "highpass"; f.frequency.value = open ? 6500 : 8500;
    const dur = open ? 0.18 : 0.045;
    g.gain.setValueAtTime(0.22 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(drums);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  function clap(t) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise;
    f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 0.9;
    g.gain.setValueAtTime(0, t);
    [0, 0.012, 0.024].forEach((o) => {
      g.gain.setValueAtTime(0.55, t + o);
      g.gain.exponentialRampToValueAtTime(0.08, t + o + 0.01);
    });
    g.gain.setValueAtTime(0.4, t + 0.034);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    s.connect(f).connect(g);
    g.connect(drums); g.connect(reverbSend);
    s.start(t, Math.random() * 0.5); s.stop(t + 0.3);
  }

  function bass(t, note, len) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = mtof(note);
    f.type = "lowpass"; f.Q.value = 6;
    f.frequency.setValueAtTime(1100, t);
    f.frequency.exponentialRampToValueAtTime(180, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(f).connect(g).connect(padBus);
    o.start(t); o.stop(t + len + 0.02);
  }

  function pad(t, notes, len) {
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = "lowpass"; f.Q.value = 2;
    f.frequency.setValueAtTime(500, t);
    f.frequency.linearRampToValueAtTime(1700, t + len * 0.5);
    f.frequency.linearRampToValueAtTime(700, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.075, t + 0.6);
    g.gain.setValueAtTime(0.075, t + len - 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.4);
    f.connect(g); g.connect(padBus); g.connect(reverbSend);
    notes.forEach((n) => {
      [-8, 8].forEach((cents) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = mtof(n);
        o.detune.value = cents;
        o.connect(f);
        o.start(t); o.stop(t + len + 0.5);
      });
    });
  }

  function pluck(t, note, vel) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = "triangle"; o2.type = "square";
    o.frequency.value = mtof(note); o2.frequency.value = mtof(note) * 2.001;
    const g2 = ctx.createGain(); g2.gain.value = 0.08;
    f.type = "lowpass"; f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.25);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(f); o2.connect(g2).connect(f);
    f.connect(g); g.connect(master); g.connect(delaySend);
    o.start(t); o2.start(t); o.stop(t + 0.4); o2.stop(t + 0.4);
  }

  // ---------- sequencer ----------
  function newArp() {
    arpPattern = [];
    for (let i = 0; i < 16; i++) {
      const on = i % 2 === 0 ? rnd() < 0.62 : rnd() < 0.22;
      arpPattern.push(on ? ARP[Math.floor(rnd() * ARP.length)] : 0);
    }
  }

  function schedule(s, t) {
    const pos = s % 16;
    const bar = Math.floor(s / 16);
    const chord = CHORDS[bar % 4];
    const phrase = bar % 16; // a 16-bar arrangement that loops
    const full = bar >= 2;
    const breakdown = phrase >= 12 && phrase < 14;

    if (pos === 0) {
      pad(t, chord.pad, STEP * 16);
      if (bar % 4 === 0) newArp();
    }
    if (full && !breakdown && pos % 4 === 0) kick(t);
    if (bar >= 4 && !breakdown && (pos === 4 || pos === 12)) clap(t);
    if (bar >= 4) {
      if (pos % 4 === 2) hat(t, 1, pos === 14 && bar % 2 === 1);
      else if (rnd() < 0.35) hat(t, 0.35, false);
    }
    if (full && !breakdown && (pos % 4 === 2 || (pos === 15 && bar % 2 === 0))) {
      bass(t, chord.bass + (pos === 10 ? 12 : 0), STEP * 1.6);
    }
    const n = arpPattern[pos];
    if (n && (bar >= 1 || pos < 8)) pluck(t, n, breakdown ? 1.2 : 0.85);
  }

  function tick() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      schedule(step, nextTime);
      nextTime += STEP;
      step++;
    }
  }

  function applyVolume(ramp = 0.3) {
    if (!ctx) return;
    const target = playing && !muted ? volume * 0.9 : 0;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(target, now + ramp);
  }

  async function play() {
    if (playing) return;
    if (!ctx) build();
    await ctx.resume();
    playing = true;
    if (step === 0) newArp();
    nextTime = ctx.currentTime + 0.06;
    tick();
    timer = setInterval(tick, 25);
    applyVolume(0.4);
    emit();
  }

  function pause() {
    if (!playing) return;
    playing = false;
    applyVolume(0.25);
    clearInterval(timer);
    const c = ctx;
    setTimeout(() => { if (!playing) c.suspend(); }, 400);
    emit();
  }

  function emit() { listeners.forEach((f) => f(playing)); }

  // ---------- read-out for visuals ----------
  const out = { playing: false, bass: 0, mid: 0, high: 0, level: 0, freq: null, wave: null, kick: 0 };
  let lastKick = -1;

  function levels() {
    out.playing = playing;
    if (!ctx || !analyser) { out.bass = out.mid = out.high = out.level = 0; out.freq = null; out.wave = null; return out; }
    analyser.getByteFrequencyData(freq);
    analyser.getByteTimeDomainData(wave);
    let b = 0, m = 0, h = 0;
    for (let i = 1; i < 8; i++) b += freq[i];
    for (let i = 8; i < 60; i++) m += freq[i];
    for (let i = 60; i < 200; i++) h += freq[i];
    out.bass = b / (7 * 255);
    out.mid = m / (52 * 255);
    out.high = h / (140 * 255);
    out.level = out.bass * 0.5 + out.mid * 0.35 + out.high * 0.15;
    out.freq = freq;
    out.wave = wave;
    // A kick that has just sounded since the last frame.
    out.kick = 0;
    const now = ctx.currentTime;
    while (kicks.length && kicks[0] <= now) {
      const k = kicks.shift();
      if (k !== lastKick && now - k < 0.15) { out.kick = 1; lastKick = k; }
    }
    return out;
  }

  return {
    play, pause,
    toggle() { return playing ? pause() : play(); },
    get playing() { return playing; },
    setVolume(v) { volume = v; applyVolume(0.08); },
    setMuted(m) { muted = m; applyVolume(0.15); },
    get muted() { return muted; },
    onChange(f) { listeners.add(f); },
    levels,
  };
})();
