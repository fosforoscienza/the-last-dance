"use client";

import { useLayoutEffect } from "react";

// iPhone, app aperta dalla schermata Home con la barra di stato trasparente: la pagina occupa
// tutto lo schermo ma la finestra risulta più corta dell'altezza della barra di stato, e sotto
// il footer resta una banda vuota. Qui l'altezza viene presa dallo schermo.
export default function ViewportFix() {
  useLayoutEffect(() => {
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    const root = document.documentElement;
    const apply = () => {
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      const screenH = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
      root.style.setProperty("--app-h", `${Math.max(window.innerHeight, screenH)}px`);
    };
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      root.style.removeProperty("--app-h");
    };
  }, []);
  return null;
}
