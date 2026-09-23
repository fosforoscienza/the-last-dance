"use client";

import { useEffect, useState } from "react";
import { isAudioReady, isMuted, onAudioChange, playSound, setMuted, unlockAudio } from "@/lib/sounds";

// Pulsante suoni: se l'audio è ancora bloccato invita a toccare, altrimenti attiva/disattiva
export default function SoundToggle() {
  const [, force] = useState(0);
  useEffect(() => onAudioChange(() => force((n) => n + 1)), []);

  const ready = isAudioReady();
  const muted = isMuted();
  const needsTap = !ready && !muted;

  return (
    <button
      className={`btn btn-ghost btn-small sound-toggle ${needsTap ? "pulse" : ""}`}
      aria-label={muted ? "Attiva i suoni" : "Disattiva i suoni"}
      onClick={() => {
        if (needsTap) {
          unlockAudio();
          setTimeout(() => playSound("gain"), 60);
          return;
        }
        const next = !muted;
        setMuted(next);
        if (!next) {
          unlockAudio();
          setTimeout(() => playSound("gain"), 60);
        }
      }}
    >
      {muted ? "🔇" : needsTap ? "🔔 Suoni" : "🔔"}
    </button>
  );
}
