"use client";

import { useCallback, useState } from "react";
import Scanner from "./Scanner";
import Popup from "./Popup";
import PrizePopup from "./PrizePopup";
import { usePopupQueue } from "@/lib/usePopupQueue";
import { TREASURE_TOTAL, TREASURE_YEARS, symbolSrc, type TreasureQuestion } from "@/lib/treasure";

type View = "grid" | "scan" | "checking" | "question" | "sending";

const LETTERS = ["A", "B", "C", "D"];

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Errore, riprova");
  return data;
}

function SymbolCard({ n, year, found, fresh }: { n: number; year: number; found: boolean; fresh: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`treasure-card ${found ? "found" : ""} ${fresh ? "fresh" : ""}`}>
      <span className="treasure-year">{year}</span>
      <div className="treasure-symbol">
        {broken ? (
          <span className="treasure-missing">?</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={symbolSrc(n)} alt="" draggable={false} onError={() => setBroken(true)} />
        )}
      </div>
    </div>
  );
}

export default function Treasure({
  found,
  onFound,
  onClose,
}: {
  found: number[];
  onFound: (found: number[]) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>("grid");
  // La fotocamera si accende al primo "Scansiona" e resta accesa finché la sezione è aperta
  const [cameraOn, setCameraOn] = useState(false);
  const [question, setQuestion] = useState<TreasureQuestion | null>(null);
  const [code, setCode] = useState("");
  const [fresh, setFresh] = useState<number | null>(null);
  const [showPrize, setShowPrize] = useState(false);
  const { current, push, done } = usePopupQueue();
  const won = found.length >= TREASURE_TOTAL;

  const onScan = useCallback(
    async (value: string) => {
      setView("checking");
      try {
        const data = await post("/api/treasure/scan", { code: value });
        if (data.alreadyFound) {
          push({ kind: "info", text: "Simbolo già trovato!" });
          setView("grid");
          return;
        }
        setCode(value);
        setQuestion(data.question);
        setView("question");
      } catch (e) {
        push({ kind: "info", text: e instanceof Error ? e.message : "QR code non valido", tone: "red" });
        setView("grid");
      }
    },
    [push]
  );

  const answer = async (i: number) => {
    if (!question) return;
    setView("sending");
    try {
      const data = await post("/api/treasure/answer", { code, answer: i });
      setQuestion(null);
      setView("grid");
      if (!data.correct) {
        push({ kind: "info", text: "Risposta sbagliata!", tone: "red" });
        return;
      }
      onFound(data.found);
      setFresh(data.number);
      if (data.won && !won) setShowPrize(true);
      else push({ kind: "info", text: "Risposta esatta!", tone: "green" });
    } catch (e) {
      push({ kind: "info", text: e instanceof Error ? e.message : "Errore, riprova", tone: "red" });
      setView("question");
    }
  };

  const scanning = view === "scan";

  return (
    <div className="board-overlay treasure">
      <div className="topbar">
        <h2 className="title" style={{ fontSize: "1.3rem" }}>Caccia al tesoro</h2>
        <button className="btn btn-ghost btn-small" onClick={onClose} aria-label="Chiudi">
          ✕
        </button>
      </div>

      {cameraOn && <Scanner active={scanning} onScan={onScan} />}

      {scanning ? (
        <button className="btn btn-ghost" onClick={() => setView("grid")}>
          Annulla
        </button>
      ) : (
        <>
          <button
            className="btn btn-gold treasure-scan-btn"
            disabled={view === "checking"}
            onClick={() => {
              setCameraOn(true);
              setView("scan");
            }}
          >
            {view === "checking" ? "Controllo…" : "Scansiona QR code 📷"}
          </button>
          {won && <div className="treasure-won">🏆 Hai vinto il super premio!</div>}
          <div className="treasure-scroll scroll">
            <div className="treasure-grid">
              {TREASURE_YEARS.map((year, i) => (
                <SymbolCard key={year} n={i + 1} year={year} found={found.includes(i + 1)} fresh={fresh === i + 1} />
              ))}
            </div>
          </div>
        </>
      )}

      {question && (view === "question" || view === "sending") && (
        <div className="modal-backdrop">
          <div className="card modal treasure-question">
            <div className="topbar">
              <span className="team-badge" style={{ marginTop: 0 }}>{question.year}</span>
              <button
                className="btn btn-ghost btn-small"
                onClick={() => {
                  setQuestion(null);
                  setView("grid");
                }}
                aria-label="Chiudi"
              >
                ✕
              </button>
            </div>
            <p className="treasure-q">{question.text}</p>
            <div className="treasure-answers">
              {question.answers.map((a, i) => (
                <button key={i} className="treasure-answer" disabled={view === "sending"} onClick={() => answer(i)}>
                  <span className="treasure-letter">{LETTERS[i]}</span>
                  <span>{a}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Popup data={current} onDone={done} />
      {showPrize && <PrizePopup onClose={() => setShowPrize(false)}>Hai vinto il super premio!</PrizePopup>}
    </div>
  );
}
