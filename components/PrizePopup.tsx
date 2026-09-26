"use client";

import { useEffect, type ReactNode } from "react";
import { playSound } from "@/lib/sounds";

// Popup del super premio: resta aperto finché non si tocca "OK"
export default function PrizePopup({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    playSound("prize");
  }, []);

  return (
    <div className="prize-backdrop" onClick={onClose}>
      <div className="prize" onClick={(e) => e.stopPropagation()}>
        <div className="prize-cup">🏆</div>
        <div className="prize-text">{children}</div>
        <button className="btn btn-gold" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
