import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AdminApp from "@/components/AdminApp";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/user");
  return <AdminApp adminName={session.name} />;
}
