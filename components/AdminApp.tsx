"use client";

import { useState } from "react";
import ScanFlow from "./ScanFlow";
import Leaderboard from "./Leaderboard";
import Manage from "./Manage";
import LogoutButton from "./LogoutButton";
import { can, kindLabel, type AdminKind } from "@/lib/roles";

type Tab = "scan" | "board" | "manage";

export default function AdminApp({ adminName, kind }: { adminName: string; kind: AdminKind }) {
  const canPoints = can(kind, "points");
  const canFood = can(kind, "food");
  const canManage = can(kind, "manage");
  const tabs: { id: Tab; label: string }[] = [
    ...(canPoints || canFood ? [{ id: "scan" as Tab, label: "Scanner" }] : []),
    { id: "board", label: "Classifica" },
    ...(canManage ? [{ id: "manage" as Tab, label: "Gestione" }] : []),
  ];
  const [tab, setTab] = useState<Tab>(tabs[0].id);
  return (
    <div className="admin">
      <div className="topbar">
        <div>
          <h1 className="title">{kindLabel(kind)}</h1>
          <span className="muted">{adminName}</span>
        </div>
        <LogoutButton />
      </div>
      <div className="tabs" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="panel">
        {tab === "scan" && <ScanFlow canPoints={canPoints} canFood={canFood} />}
        {tab === "board" && <Leaderboard />}
        {tab === "manage" && canManage && <Manage />}
      </div>
    </div>
  );
}
