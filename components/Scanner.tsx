"use client";

import { useEffect, useRef, useState } from "react";
import type QrScannerType from "qr-scanner";

export default function Scanner({ onScan }: { onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState("");

  useEffect(() => {
    let scanner: QrScannerType | null = null;
    let cancelled = false;
    let fired = false;

    (async () => {
      const { default: QrScanner } = await import("qr-scanner");
      if (cancelled || !videoRef.current) return;
      scanner = new QrScanner(
        videoRef.current,
        (result) => {
          if (fired) return;
          fired = true;
          scanner?.stop();
          if (navigator.vibrate) navigator.vibrate(60);
          onScanRef.current(result.data);
        },
        { preferredCamera: "environment", maxScansPerSecond: 8, returnDetailedScanResult: true }
      );
      try {
        await scanner.start();
      } catch {
        if (!cancelled) setError("Impossibile accedere alla fotocamera. Controlla i permessi del browser.");
      }
    })();

    return () => {
      cancelled = true;
      scanner?.stop();
      scanner?.destroy();
    };
  }, []);

  return (
    <div className="scanner">
      <video ref={videoRef} muted playsInline />
      <div className="scanner-frame" />
      <div className="scanner-msg">{error || "Inquadra il QR code"}</div>
    </div>
  );
}
