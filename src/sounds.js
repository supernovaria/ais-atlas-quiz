// Shared Web Audio engine for the quiz.
// AudioContext is created lazily on first prewarm() call (which must be
// inside a user-gesture handler so browsers don't suspend it).

let _ctx = null;

function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function note({ freq, type = 'sine', vol = 0.22, decay = 6, start = 0 }) {
  try {
    const c = getCtx();
    const now = c.currentTime + start;
    const dur = 6 / decay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  } catch (e) { /* audio unavailable */ }
}

function noiseBlip({ vol = 0.12, dur = 0.1 }) {
  try {
    const c = getCtx();
    const now = c.currentTime;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    const filt = c.createBiquadFilter();
    const gain = c.createGain();
    filt.type = 'lowpass';
    filt.frequency.value = 500;
    src.buffer = buf;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(c.destination);
    src.start(now);
    src.stop(now + dur + 0.02);
  } catch (e) { /* audio unavailable */ }
}

// ── Success variants ────────────────────────────────────────────────────────

// S1 · Chime-Up — ascending D5→G5→C6
function playS1() {
  note({ freq: 587.3, decay: 8, vol: 0.48, start: 0.0 });
  note({ freq: 784.0, decay: 8, vol: 0.48, start: 0.06 });
  note({ freq: 1046.5, decay: 8, vol: 0.48, start: 0.12 });
}

// S9 · Ping-Ping — two quick high pings G5 then C6
function playS9() {
  note({ freq: 784.0, decay: 14, vol: 0.44, start: 0.0 });
  note({ freq: 1046.5, decay: 14, vol: 0.44, start: 0.13 });
}

// ── Mistake variants ────────────────────────────────────────────────────────

// M6 · Low-Blip — single low sine blip
function playM6() {
  note({ freq: 160, decay: 18, vol: 0.62 });
}

// M7 · Clunk — noise burst + low sine
function playM7() {
  noiseBlip({ vol: 0.31, dur: 0.1 });
  note({ freq: 70, decay: 12, vol: 0.52 });
}

// ── Score-reveal sounds ─────────────────────────────────────────────────────

// M10 · Down-Arp — descending E4→C4→G3, for low scores
export function playM10() {
  note({ freq: 329.6, decay: 9, vol: 0.40, start: 0.0 });
  note({ freq: 261.6, decay: 9, vol: 0.40, start: 0.07 });
  note({ freq: 196.0, decay: 9, vol: 0.40, start: 0.14 });
}

// R9 · Completion — warm C2 chord swell, for scores ≥ 65%
export function playR9() {
  [130.8, 196.0, 329.6, 523.3].forEach(f =>
    note({ freq: f, decay: 1.8, vol: 0.28 })
  );
}

// R6 · Tada — two-phrase tada, for scores ≥ 90%
export function playR6() {
  [392.0, 587.3].forEach(f => note({ freq: f, type: 'triangle', decay: 5, vol: 0.36 }));
  setTimeout(() => {
    [784.0, 987.8].forEach(f => note({ freq: f, type: 'triangle', decay: 4, vol: 0.40 }));
  }, 160);
}

// ── Public API ──────────────────────────────────────────────────────────────

// Call inside any user-gesture handler to unlock the AudioContext early.
export function prewarm() {
  try { getCtx(); } catch (e) { /* no-op */ }
}

// variant: 'A' → S1 (Chime-Up), 'B' → S9 (Ping-Ping)
export function playSuccess(variant) {
  try { (variant === 'B' ? playS9 : playS1)(); } catch (e) { /* no-op */ }
}

// variant: 'A' → M6 (Low-Blip), 'B' → M7 (Clunk)
export function playMistake(variant) {
  try { (variant === 'B' ? playM7 : playM6)(); } catch (e) { /* no-op */ }
}
