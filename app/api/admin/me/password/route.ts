import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { checkMainPassword, setMainPassword } from "@/lib/main-admin";

// Solo il super admin (admin principale) può cambiare la propria password
export async function POST(req: Request) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (me.credId !== "env") {
    return NextResponse.json({ error: "Solo l'admin principale può cambiare la propria password" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const current = String(body.current ?? "").trim();
  const next = String(body.next ?? "").trim();
  if (next.length < 4) return NextResponse.json({ error: "La nuova password deve avere almeno 4 caratteri" }, { status: 400 });
  if (!(await checkMainPassword(current))) {
    return NextResponse.json({ error: "La password attuale non è corretta" }, { status: 400 });
  }
  const res = await setMainPassword(next);
  if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
