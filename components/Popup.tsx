"use client";

import { useEffect } from "react";
import { playSound } from "@/lib/sounds";

export type PopupData =
  | { kind: "points"; delta: number; id: number }
  | { kind: "food"; id: number }
  | { kind: "info"; text: string; id: number };

const played = new WeakSet<PopupData>();

export default function Popup({ data, onDone }: { data: PopupData | null; onDone: () => void }) {
  // Suono a ogni nuovo popup (una sola volta anche se il popup viene ridisegnato)
  useEffect(() => {
    if (!data || played.has(data)) return;
    played.add(data);
    if (data.kind === "points") playSound(data.delta > 0 ? "gain" : "loss");
    else if (data.kind === "food") playSound("food");
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [data, onDone]);

  if (!data) return null;

  let cls = "popup";
  let big = "";
  let small = "";
  if (data.kind === "points") {
    const positive = data.delta > 0;
    cls += positive ? " popup-green" : " popup-red";
    big = `${positive ? "+" : "−"}${Math.abs(data.delta)}`;
    small = positive ? "punti guadagnati!" : "punti persi";
  } else if (data.kind === "food") {
    cls += " popup-yellow";
    big = "Buon appetito!";
  } else {
    cls += " popup-yellow";
    big = data.text;
  }

  return (
    <div className="popup-backdrop" onClick={onDone} key={data.id}>
      <div className={cls}>
        <div className={data.kind === "points" ? "popup-big" : "popup-text"}>{big}</div>
        {small && <div className="popup-small">{small}</div>}
      </div>
    </div>
  );
}
