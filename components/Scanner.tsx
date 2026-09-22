"use client";

import { useEffect, useRef, useState } from "react";
import type QrScannerType from "qr-scanner";

// La fotocamera viene accesa una sola volta e resta attiva finché la pagina è aperta:
// quando lo scanner non serve viene solo nascosto e i QR letti vengono ignorati.
// Così il browser non richiede di nuovo il permesso a ogni scansione.
export default function Scanner({ active, onScan }: { active: boolean; onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScannerType | null>(null);
  const onScanRef = useRef(onScan);
  const activeRef = useRef(active);
  const lockedRef = useRef(false);
  onScanRef.current = onScan;
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { default: QrScanner } = await import("qr-scanner");
      if (cancelled || !videoRef.current) return;
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          if (!activeRef.current || lockedRef.current) return;
          lockedRef.current = true;
          if (navigator.vibrate) navigator.vibrate(60);
          onScanRef.current(result.data);
        },
        { preferredCamera: "environment", maxScansPerSecond: 8, returnDetailedScanResult: true }
      );
      scannerRef.current = scanner;
      try {
        await scanner.start();
      } catch {
        if (!cancelled) setError("Impossibile accedere alla fotocamera. Controlla i permessi del browser.");
      }
    })();

    // Tornando sull'app dopo lo standby il telefono può aver chiuso la fotocamera: la riapre
    const onVisible = () => {
      const video = videoRef.current;
      const stream = video?.srcObject as MediaStream | null;
      const alive = stream?.getVideoTracks().some((t) => t.readyState === "live");
      if (document.visibilityState === "visible" && scannerRef.current && !alive) {
        scannerRef.current.start().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
    if (active) {
      lockedRef.current = false;
      videoRef.current?.play().catch(() => {});
    }
  }, [active]);

  return (
    <div className="scanner" style={active ? undefined : { display: "none" }}>
      <video ref={videoRef} muted playsInline />
      <div className="scanner-frame" />
      <div className="scanner-msg">{error || "Inquadra il QR code"}</div>
    </div>
  );
}
