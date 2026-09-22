"use client";

import { useState } from "react";
import ScanFlow from "./ScanFlow";
import Leaderboard from "./Leaderboard";
import Manage from "./Manage";
import LogoutButton from "./LogoutButton";

type Tab = "scan" | "board" | "manage";

export default function AdminApp({ adminName }: { adminName: string }) {
  const [tab, setTab] = useState<Tab>("scan");
  return (
    <div className="admin">
      <div className="topbar">
        <div>
          <h1 className="title">Admin</h1>
          <span className="muted">{adminName}</span>
        </div>
        <LogoutButton />
      </div>
      <div className="tabs">
        <button className={`tab ${tab === "scan" ? "active" : ""}`} onClick={() => setTab("scan")}>
          Scanner
        </button>
        <button className={`tab ${tab === "board" ? "active" : ""}`} onClick={() => setTab("board")}>
          Classifica
        </button>
        <button className={`tab ${tab === "manage" ? "active" : ""}`} onClick={() => setTab("manage")}>
          Gestione
        </button>
      </div>
      <div className="panel">
        {tab === "scan" && <ScanFlow />}
        {tab === "board" && <Leaderboard />}
        {tab === "manage" && <Manage />}
      </div>
    </div>
  );
}
