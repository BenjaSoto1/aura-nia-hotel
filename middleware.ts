import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminAuthEnabled, adminToken, safeEqual } from "@/lib/admin/auth";

// Protege el panel de administración (datos de huéspedes) cuando ADMIN_PASSWORD está definida.
export async function middleware(req: NextRequest) {
  if (!adminAuthEnabled()) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (pathname === "/panel/login" || pathname === "/api/panel/login" || pathname === "/api/panel/logout") return NextResponse.next();

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value ?? "";
  if (cookie && safeEqual(cookie, await adminToken())) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sesión de administración requerida" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/panel/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/panel/:path*", "/api/panel/:path*"] };
