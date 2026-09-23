"use client";

import { useState } from "react";
import ScanFlow from "./ScanFlow";
import Leaderboard from "./Leaderboard";
import Manage from "./Manage";
import LogoutButton from "./LogoutButton";
import ChangePassword from "./ChangePassword";
import { can, kindLabel, type AdminKind } from "@/lib/roles";

type Tab = "scan" | "board" | "manage";

export default function AdminApp({ adminName, kind, isMain }: { adminName: string; kind: AdminKind; isMain: boolean }) {
  const canPoints = can(kind, "points");
  const canFood = can(kind, "food");
  const canManage = can(kind, "manage");
  const tabs: { id: Tab; label: string }[] = [
    ...(canPoints || canFood ? [{ id: "scan" as Tab, label: "Scanner" }] : []),
    // Il cuoco non ha bisogno della classifica
    ...(kind !== "cuoco" ? [{ id: "board" as Tab, label: "Classifica" }] : []),
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
        <div className="row">
          {isMain && <ChangePassword />}
          <LogoutButton />
        </div>
      </div>
      {tabs.length > 1 && (
      <div className="tabs" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      )}
      {/* Lo scanner resta montato anche sulle altre schede, così la fotocamera rimane autorizzata */}
      {(canPoints || canFood) && (
        <div className="panel" style={tab === "scan" ? undefined : { display: "none" }}>
          <ScanFlow canPoints={canPoints} canFood={canFood} visible={tab === "scan"} />
        </div>
      )}
      {tab !== "scan" && (
        <div className="panel">
          {tab === "board" && <Leaderboard />}
          {tab === "manage" && canManage && <Manage />}
        </div>
      )}
    </div>
  );
}
