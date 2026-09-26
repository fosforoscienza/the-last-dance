"use client";

import { useCallback, useRef, useState } from "react";
import type { PopupData } from "@/components/Popup";

type NewPopup = { kind: "points"; delta: number } | { kind: "food" } | { kind: "info"; text: string; tone?: "green" | "red" };

export function usePopupQueue() {
  const [current, setCurrent] = useState<PopupData | null>(null);
  const queue = useRef<PopupData[]>([]);
  const counter = useRef(0);
  const showing = useRef(false);

  const push = useCallback((p: NewPopup) => {
    const item = { ...p, id: ++counter.current } as PopupData;
    if (!showing.current) {
      showing.current = true;
      setCurrent(item);
    } else {
      queue.current.push(item);
    }
  }, []);

  const done = useCallback(() => {
    const next = queue.current.shift() ?? null;
    showing.current = next !== null;
    setCurrent(next);
  }, []);

  return { current, push, done };
}
