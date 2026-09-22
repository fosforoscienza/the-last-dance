"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ className = "btn btn-ghost btn-small" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      className={className}
      onClick={async () => {
        await fetch("/api/logout", { method: "POST" });
        router.replace("/");
        router.refresh();
      }}
    >
      Esci
    </button>
  );
}
