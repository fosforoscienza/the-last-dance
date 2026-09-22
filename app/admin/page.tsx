import { redirect } from "next/navigation";
import { getSession, requireAdmin } from "@/lib/session";
import AdminApp from "@/components/AdminApp";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/user");
  // Admin rimosso o trasformato in giocatore: chiude la sessione
  const admin = await requireAdmin();
  if (!admin) redirect("/api/logout-redirect");
  return <AdminApp adminName={admin.name} kind={admin.kind} isMain={admin.credId === "env"} />;
}
