"use client";

// Suoni da circo generati con Web Audio (nessun file audio).
// I browser permettono l'audio solo dopo un tocco dell'utente: il primo tocco
// sulla pagina "sblocca" l'audio (vedi unlockAudio).

const MUTE_KEY = "tld-sound-muted";

let ctx: AudioContext | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    ctx.onstatechange = notify;
  }
  return ctx;
}

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, "1");
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    // localStorage non disponibile: pazienza
  }
  notify();
}

export function isAudioReady() {
  return ctx?.state === "running";
}

export function onAudioChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Da chiamare dentro un tocco dell'utente
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state !== "running") c.resume().then(notify).catch(() => {});
  // iOS: un suono muto di un campione completa lo sblocco
  const buf = c.createBuffer(1, 1, 22050);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  src.start(0);
}

// Sblocco automatico al primo tocco in qualsiasi punto della pagina
export function installAutoUnlock() {
  if (typeof document === "undefined") return () => {};
  const handler = () => {
    unlockAudio();
    if (isAudioReady()) remove();
  };
  const remove = () => {
    document.removeEventListener("pointerdown", handler, true);
    document.removeEventListener("touchend", handler, true);
    document.removeEventListener("keydown", handler, true);
  };
  document.addEventListener("pointerdown", handler, true);
  document.addEventListener("touchend", handler, true);
  document.addEventListener("keydown", handler, true);
  return remove;
}

// Una "campanella": fondamentale + armoniche non intere, con decadimento veloce
function bell(c: AudioContext, freq: number, at: number, volume = 0.3, length = 1.2) {
  const partials: [number, number][] = [
    [1, 1],
    [2.0, 0.5],
    [2.76, 0.35],
    [5.4, 0.15],
  ];
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.exponentialRampToValueAtTime(volume, at + 0.008);
  out.gain.exponentialRampToValueAtTime(0.0001, at + length);
  out.connect(c.destination);
  for (const [ratio, amp] of partials) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * ratio, at);
    g.gain.value = amp;
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }
}

// Nota morbida per i punti persi
function soft(c: AudioContext, freq: number, at: number, length = 0.35, volume = 0.5) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.94, at + length);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(volume, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(g).connect(c.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

const NOTE = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568, C7: 2093 };

export type SoundKind = "gain" | "loss" | "food";

export function playSound(kind: SoundKind) {
  if (isMuted()) return;
  const c = getCtx();
  if (!c || c.state !== "running") return;
  const t = c.currentTime + 0.02;
  if (kind === "gain") {
    // "ding-ding-ding!" che sale
    bell(c, NOTE.E6, t, 0.25, 0.9);
    bell(c, NOTE.G6, t + 0.1, 0.25, 0.9);
    bell(c, NOTE.C7, t + 0.2, 0.3, 1.4);
  } else if (kind === "loss") {
    // due note che scendono
    soft(c, NOTE.G5, t);
    soft(c, NOTE.D5, t + 0.18, 0.5);
  } else {
    // arpeggio "buon appetito"
    bell(c, NOTE.C6, t, 0.22, 0.8);
    bell(c, NOTE.E6, t + 0.12, 0.22, 0.8);
    bell(c, NOTE.G6, t + 0.24, 0.22, 0.8);
    bell(c, NOTE.C7, t + 0.36, 0.28, 1.6);
    bell(c, NOTE.G6, t + 0.36, 0.12, 1.6);
  }
  if (navigator.vibrate) navigator.vibrate(kind === "loss" ? [80, 60, 80] : kind === "food" ? [40, 40, 40, 40, 120] : 120);
}
