import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminAuthEnabled, adminToken, safeEqual } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const nextRaw = String(form.get("next") ?? "/panel");
  // Solo rutas internas del panel (evita redirecciones abiertas).
  const next = nextRaw.startsWith("/panel") ? nextRaw : "/panel";
  const base = new URL(req.url);

  if (!adminAuthEnabled()) return NextResponse.redirect(new URL(next, base), 303);
  const ok = safeEqual(await adminToken(password), await adminToken());
  if (!ok) return NextResponse.redirect(new URL(`/panel/login?error=1&next=${encodeURIComponent(next)}`, base), 303);

  const res = NextResponse.redirect(new URL(next, base), 303);
  res.cookies.set(ADMIN_COOKIE, await adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: base.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
