import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "@/components/LoginForm";

export default async function Home() {
  const session = await getSession();
  if (session?.role === "admin") redirect("/admin");
  if (session?.role === "user") redirect("/user");
  return <LoginForm />;
}
