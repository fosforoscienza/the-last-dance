"use client";

import { useEffect, useRef, useState } from "react";

export default function Footer() {
  const [broken, setBroken] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // L'errore di caricamento può avvenire prima dell'idratazione
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setBroken(true);
  }, []);

  return (
    <footer className="footer">
      {broken ? (
        <span className="footer-text">THE LAST DANCE</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={img} src="/logo/logo.png" alt="The LAST Dance" className="footer-logo" onError={() => setBroken(true)} />
      )}
    </footer>
  );
}
