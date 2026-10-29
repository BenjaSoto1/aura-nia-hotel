import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Falta code" }, { status: 400 });
  const res = await db.reservation.findUnique({ where: { code }, include: { guest: true } });
  if (!res) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ code: res.code, status: res.status, email: res.guest.email, createdVia: res.createdVia, language: res.guest.language });
}
