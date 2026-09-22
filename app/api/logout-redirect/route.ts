import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

// Usato quando l'utente in sessione è stato eliminato
export async function GET(req: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/", req.url));
}
